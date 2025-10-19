#!/usr/bin/env python3
import csv
import re
import time
import random
from datetime import datetime
from typing import List, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# --------------------
# Config
# --------------------
URLS: List[str] = [
    "https://trenvet.allstrongman.com/comp-page;compId=68aecc0008e9913584460074",
    "https://trenvet.allstrongman.com/comp-page;compId=68aecc9008e9913584460077",
    "https://trenvet.allstrongman.com/comp-page;compId=68aeccfa08e991358446007a",
    "https://trenvet.allstrongman.com/comp-page;compId=68aecd4208e991358446007d",
    "https://trenvet.allstrongman.com/comp-page;compId=68b16baa516db96f6d63bd70",
]

MAX_WORKERS = 1          # start with 1 for stability; bump to 2 if solid
MAX_RETRIES = 3
PAGE_TIMEOUT = 60        # seconds
JITTER_RANGE = (0.05, 0.4)


# --------------------
# Driver setup
# --------------------
def get_driver() -> webdriver.Chrome:
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1440,1200")
    opts.add_argument("--lang=uk-UA,uk,en-US,en;q=0.9")
    opts.add_argument(
        "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    )

    # De-bot flags (best-effort; not a guarantee)
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    opts.add_argument("--disable-blink-features=AutomationControlled")

    driver = webdriver.Chrome(options=opts)
    driver.set_page_load_timeout(PAGE_TIMEOUT)

    # Spoof navigator.webdriver
    try:
        driver.execute_cdp_cmd(
            "Page.addScriptToEvaluateOnNewDocument",
            {
                "source": """
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'languages', {get: () => ['uk-UA','uk','en-US','en']});
                Object.defineProperty(navigator, 'platform', {get: () => 'Linux x86_64'});
                """
            },
        )
    except Exception:
        pass

    return driver


# --------------------
# Helpers
# --------------------
def wait_for_page_ready(driver: webdriver.Chrome, timeout: int = PAGE_TIMEOUT) -> None:
    wait = WebDriverWait(driver, timeout)
    # DOM complete
    wait.until(lambda d: d.execute_script("return document.readyState") == "complete")

    # Accept either comp or protocol components or just known content blocks
    wait.until(
        EC.presence_of_element_located(
            (
                By.CSS_SELECTOR,
                "app-comp-page, app-protocol-page, div.competition-title, div.first-last-name",
            )
        )
    )

    # If a loader exists, wait for it to disappear (but don't fail if it doesn't)
    try:
        wait.until(
            EC.invisibility_of_element_located((By.CSS_SELECTOR, "div.loader-container"))
        )
    except TimeoutException:
        pass

    # Tiny buffer for SPA rendering
    time.sleep(0.4)


def autoscroll(driver: webdriver.Chrome, pause: float = 0.4, max_rounds: int = 8) -> None:
    last_h = driver.execute_script("return document.body.scrollHeight")
    for _ in range(max_rounds):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(pause)
        new_h = driver.execute_script("return document.body.scrollHeight")
        if new_h == last_h:
            break
        last_h = new_h


def raw_title(driver: webdriver.Chrome) -> str:
    try:
        t = driver.find_element(By.CSS_SELECTOR, "div.competition-title").text.strip()
        return " ".join(t.split())
    except Exception:
        return (driver.title or "").strip()


def competition_title_only(title: str) -> str:
    return title.split(" - ")[0].strip() if " - " in title else title


def extract_category_from_title(title: str) -> str:
    return title.split(" - ")[-1].strip() if " - " in title else ""


def extract_names(driver: webdriver.Chrome) -> List[str]:
    names: List[str] = []

    # Primary pattern (when names are grouped into competitor blocks)
    for block in driver.find_elements(By.CSS_SELECTOR, "div.competitor-name"):
        parts = [
            el.text.strip()
            for el in block.find_elements(By.CSS_SELECTOR, "div.first-last-name")
        ]
        if parts:
            names.append(" ".join(parts))

    if names:
        return names

    # Fallback: flat sequence of first-last-name divs
    fln = [
        x.text.strip()
        for x in driver.find_elements(By.CSS_SELECTOR, "div.first-last-name")
        if x.text.strip()
    ]
    for i in range(0, len(fln), 2):
        names.append(f"{fln[i]} {fln[i+1]}" if i + 1 < len(fln) else fln[i])
    return names


def sanitize_filename(name: str) -> str:
    categories = {"w1", "n2.2", "n2", "n1.1", "w0", "r1", "r2", "n1", "s1", "n0", "r0", "h2", "h1"}
    parts = name.strip().split()
    if parts and parts[-1].lower() in categories:
        parts = parts[:-1]
    clean = " ".join(parts) or "competition"
    safe = re.sub(r'[\\/*?:"<>|]', "_", clean)
    return safe.replace(" ", "_")


def comp_id_from_url(url: str) -> Optional[str]:
    m = re.search(r"compId=([A-Za-z0-9]+)", url)
    return m.group(1) if m else None


def alt_url(url: str) -> Optional[str]:
    cid = comp_id_from_url(url)
    if not cid:
        return None
    if "comp-page" in url:
        return f"https://trenvet.allstrongman.com/protocol-page;compId={cid}"
    if "protocol-page" in url:
        return f"https://trenvet.allstrongman.com/comp-page;compId={cid}"
    return None


def save_artifacts(driver: webdriver.Chrome, label: str) -> None:
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    try:
        driver.save_screenshot(f"fail_{label}_{ts}.png")
    except Exception:
        pass
    try:
        with open(f"fail_{label}_{ts}.html", "w", encoding="utf-8") as f:
            f.write(driver.page_source)
    except Exception:
        pass


# --------------------
# Scraping core
# --------------------
def scrape_once(url: str) -> Tuple[str, List[Tuple[str, str]]]:
    print(f"[DEBUG] start {url}")
    rows: List[Tuple[str, str]] = []
    driver = get_driver()
    try:
        driver.get(url)
        wait_for_page_ready(driver, timeout=PAGE_TIMEOUT)
        autoscroll(driver)

        # Sometimes SPAs show a “Just a moment…” page. If so, give it a little time.
        html = driver.page_source.lower()
        if "just a moment" in html or "checking your browser" in html:
            time.sleep(5)
            wait_for_page_ready(driver, timeout=PAGE_TIMEOUT)
            autoscroll(driver)

        full_title = raw_title(driver)
        comp_title = competition_title_only(full_title) or (driver.title or "competition").strip()
        category = extract_category_from_title(full_title)

        names = extract_names(driver)

        # If nothing found, try alternate route (comp <-> protocol)
        if not names:
            au = alt_url(url)
            if au:
                print(f"[DEBUG] no names at primary, trying alternate: {au}")
                driver.get(au)
                wait_for_page_ready(driver, timeout=PAGE_TIMEOUT)
                autoscroll(driver)
                full_title = raw_title(driver) or full_title
                comp_title = competition_title_only(full_title) or comp_title
                category = extract_category_from_title(full_title) or category
                names = extract_names(driver)

        if not names:
            print(f"[EMPTY] {url} -> no competitors")
            return comp_title, []

        for n in names:
            rows.append((n, category))
        print(f"[OK] {url} -> {len(names)} competitors, category='{category}'")
        return comp_title, rows

    except Exception as e:
        # Save artifacts for debugging what actually loaded
        save_artifacts(driver, "scrape_once")
        raise e
    finally:
        try:
            driver.quit()
        except Exception:
            pass


def scrape_one(url: str) -> Tuple[str, List[Tuple[str, str]]]:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            # small jitter before each attempt
            time.sleep(random.uniform(*JITTER_RANGE))
            return scrape_once(url)
        except (WebDriverException, TimeoutException, Exception) as e:
            if attempt == MAX_RETRIES:
                print(f"[ERR] {url} -> {e!r}")
                return "", []
            sleep = (2 ** (attempt - 1)) + random.uniform(0, 0.75)
            print(f"[RETRY] {url} attempt {attempt} failed: {e!r}. sleeping {sleep:.2f}s")
            time.sleep(sleep)


# --------------------
# Output
# --------------------
def write_csv(filename: str, rows: List[Tuple[str, str]]) -> None:
    with open(filename, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["name", "category"])
        w.writerows(rows)


# --------------------
# Main
# --------------------
def main():
    titles: List[Tuple[int, str]] = []
    all_rows: List[Tuple[str, str]] = []
    failed: List[str] = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(scrape_one, url): idx for idx, url in enumerate(URLS)}
        for fut in as_completed(futures):
            idx = futures[fut]
            comp_title, rows = fut.result()
            if comp_title:
                titles.append((idx, comp_title))
            else:
                failed.append(URLS[idx])
            all_rows.extend(rows)

    # Re-try any failures once, sequentially
    for url in failed[:]:
        ct, rows = scrape_one(url)
        if ct:
            titles.append((URLS.index(url), ct))
            all_rows.extend(rows)
            failed.remove(url)

    titles.sort(key=lambda x: x[0])
    chosen_title = (titles[0][1] if titles else "competition")
    out_name = sanitize_filename(chosen_title) + ".csv"
    write_csv(out_name, all_rows)
    print(f"\nSaved -> {out_name} with {len(all_rows)} rows")
    if failed:
        print("Still failed:", *[f" - {u}" for u in failed], sep="\n")


if __name__ == "__main__":
    main()

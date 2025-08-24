#!/usr/bin/env python3
import csv
import re
import time
from typing import List, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

URLS: List[str] = []

MAX_WORKERS = 4


def get_driver() -> webdriver.Chrome:
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1440,1200")
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=opts)


def wait_for_page_ready(driver: webdriver.Chrome, timeout: int = 40) -> None:
    wait = WebDriverWait(driver, timeout)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "app-protocol-page")))
    try:
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div.loader-container")))
        wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, "div.loader-container")))
    except TimeoutException:
        pass
    time.sleep(0.8)


def autoscroll(driver: webdriver.Chrome, pause: float = 0.5, max_rounds: int = 10) -> None:
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
    except Exception:
        return ""
    return " ".join(t.split())


def competition_title_only(title: str) -> str:
    return title.split(" - ")[0].strip() if " - " in title else title


def extract_category_from_title(title: str) -> str:
    return title.split(" - ")[-1].strip() if " - " in title else title


def extract_names(driver: webdriver.Chrome) -> List[str]:
    names: List[str] = []
    for block in driver.find_elements(By.CSS_SELECTOR, "div.competitor-name"):
        parts = [el.text.strip() for el in block.find_elements(By.CSS_SELECTOR, "div.first-last-name")]
        if parts:
            names.append(" ".join(parts))
    if names:
        return names
    fln = [x.text.strip() for x in driver.find_elements(By.CSS_SELECTOR, "div.first-last-name") if x.text.strip()]
    for i in range(0, len(fln), 2):
        if i + 1 < len(fln):
            names.append(f"{fln[i]} {fln[i+1]}")
        else:
            names.append(fln[i])
    return names


def sanitize_filename(name: str) -> str:
    categories = {
        "w1", "n2.2", "n2", "n1.1", "w0",
        "r1", "r2", "n1", "s1", "n0",
        "r0", "h2", "h1"
    }

    parts = name.strip().split()
    if parts and parts[-1].lower() in categories:
        parts = parts[:-1]
    clean_name = " ".join(parts)

    safe = re.sub(r'[\\/*?:"<>|]', "_", clean_name)
    return safe.replace(" ", "_") or "competition"


def scrape_one(url: str) -> Tuple[str, List[Tuple[str, str]]]:
    rows: List[Tuple[str, str]] = []
    driver = get_driver()
    try:
        driver.get(url)
        wait_for_page_ready(driver, timeout=45)
        autoscroll(driver)

        full_title = raw_title(driver)
        comp_title = competition_title_only(full_title)
        category = extract_category_from_title(full_title)
        names = extract_names(driver)

        if not names:
            print(f"[EMPTY] {url} -> no competitors")
            return comp_title, []

        for n in names:
            rows.append((n, category))
        print(f"[OK] {url} -> {len(names)} competitors, category='{category}'")
        return comp_title, rows
    except Exception as e:
        print(f"[ERR] {url} -> {e}")
        return "", []
    finally:
        driver.quit()


def write_csv(filename: str, rows: List[Tuple[str, str]]) -> None:
    with open(filename, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["name", "category"])
        w.writerows(rows)


def main():
    if not URLS:
        print("Add URLs to the URLS list.")
        return

    titles: List[Tuple[int, str]] = []
    all_rows: List[Tuple[str, str]] = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(scrape_one, url): idx for idx, url in enumerate(URLS)}
        for fut in as_completed(futures):
            idx = futures[fut]
            comp_title, rows = fut.result()
            if comp_title:
                titles.append((idx, comp_title))
            all_rows.extend(rows)

    title_from_first = ""
    title_from_last = ""
    if titles:
        titles.sort(key=lambda x: x[0])
        title_from_first = titles[0][1]
        title_from_last = titles[-1][1]

    chosen_title = title_from_first or title_from_last or "competition"
    out_name = sanitize_filename(chosen_title) + ".csv"

    write_csv(out_name, all_rows)
    print(f"\nSaved -> {out_name} with {len(all_rows)} rows")


if __name__ == "__main__":
    main()

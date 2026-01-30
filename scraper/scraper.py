#!/usr/bin/env python3
import csv
import re
import time
from typing import List, Tuple, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter, defaultdict

import requests
from requests.exceptions import RequestsDependencyWarning
import warnings

warnings.simplefilter("ignore", RequestsDependencyWarning)


URLS = [
    'https://trenvet.allstrongman.com/comp-page;compId=69241f2242cf6b1953dffb2c',
    'https://trenvet.allstrongman.com/comp-page;compId=6924234c42cf6b1953dffb3e',
    'https://trenvet.allstrongman.com/comp-page;compId=69242d3242cf6b1953dffb62',
    'https://trenvet.allstrongman.com/comp-page;compId=692429fa42cf6b1953dffb56',
    'https://trenvet.allstrongman.com/comp-page;compId=692425f342cf6b1953dffb4a',
    'https://trenvet.allstrongman.com/comp-page;compId=6924334142cf6b1953dffb6e',
    'https://trenvet.allstrongman.com/comp-page;compId=692434a342cf6b1953dffb7a',
    'https://trenvet.allstrongman.com/comp-page;compId=692436c542cf6b1953dffb86',
    'https://trenvet.allstrongman.com/comp-page;compId=6924392d42cf6b1953dffb92',
    'https://trenvet.allstrongman.com/comp-page;compId=69243bbb42cf6b1953dffba7',
    'https://trenvet.allstrongman.com/comp-page;compId=6920b51642cf6b1953dffa81'
]

MAX_WORKERS = 6
API_BASE = "https://apitrenvet.allstrongman.com/api"


def extract_comp_id(url: str) -> str:
    """
    Extract compId from:
      - protocol page: ...compId=<id>...
      - API URL: .../api/competitions/<id>[/athletes|/protocol]
    """
    m = re.search(r"compId=([a-f0-9]+)", url)
    if m:
        return m.group(1)
    m = re.search(r"/competitions/([a-f0-9]+)(?:/|$)", url)
    if m:
        return m.group(1)
    return ""


def http_get_json(session: requests.Session, url: str, retries: int = 3, timeout: int = 20) -> Any:
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            r = session.get(url, timeout=timeout)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            last_err = e
            if attempt < retries:
                time.sleep(0.6 * attempt)
    raise last_err if last_err else RuntimeError(f"GET failed: {url}")


def competition_title_only(title: str) -> str:
    return title.split(" - ")[0].strip() if " - " in title else (title or "").strip()


def sanitize_filename(name: str) -> str:
    categories = {
        "w1", "n2.2", "n2", "n1.1", "w0",
        "r1", "r2", "n1", "s1", "n0",
        "r0", "h2", "h1",
    }
    parts = name.strip().split()
    if parts and parts[-1].lower() in categories:
        parts = parts[:-1]
    clean_name = " ".join(parts)
    safe = re.sub(r'[\\/*?:"<>|]', "_", clean_name)
    return safe.replace(" ", "_") or "competition"


def fetch_competition_meta(session: requests.Session, comp_id: str) -> Tuple[str, str]:
    """
    Return (title_trimmed, category) from /competitions/{id}
    """
    comp_url = f"{API_BASE}/competitions/{comp_id}"
    comp_obj = http_get_json(session, comp_url)
    if isinstance(comp_obj, list):
        comp_obj = comp_obj[0] if comp_obj else {}

    raw_title = str(comp_obj.get("title", "")).strip()
    title_trimmed = competition_title_only(raw_title)

    category = str(
        comp_obj.get("limitationGroup")
        or comp_obj.get("limitation_group")
        or comp_obj.get("category")
        or comp_obj.get("group")
        or ""
    ).strip()

    if category == 'Empty':
        category = 'h1'

    return title_trimmed, category


def _athlete_full_name(a: Dict[str, Any]) -> str:
    first = str(a.get("name") or a.get("firstName") or "").strip()
    last = str(a.get("lastName") or a.get("surname") or "").strip()
    full = (first + " " + last).strip()
    if not full:
        full = str(a.get("fullName") or a.get("displayName") or "").strip()
    return full


def _athlete_user_id(a: Dict[str, Any]) -> Optional[str]:
    return (
        a.get("userId")
        or a.get("user_id")
        or a.get("id")
        or (a.get("user") or {}).get("id")
        or None
    )


def build_user_map(session: requests.Session, comp_id: str) -> Dict[str, str]:
    """
    Build {userId: full name} using /competitions/{id}/athletes
    """
    url = f"{API_BASE}/competitions/{comp_id}/athletes"
    obj = http_get_json(session, url)

    if isinstance(obj, dict) and "data" in obj:
        athletes = obj["data"] or []
    elif isinstance(obj, list):
        athletes = obj
    else:
        athletes = []

    user_map: Dict[str, str] = {}
    for a in athletes:
        uid = _athlete_user_id(a)
        if not uid:
            continue
        name = _athlete_full_name(a)
        if name:
            user_map[str(uid)] = name
    return user_map


def fetch_protocol(session: requests.Session, comp_id: str) -> List[Dict[str, Any]]:
    """
    Return list of protocol entries (each with rank and userId).
    """
    url = f"{API_BASE}/competitions/{comp_id}/protocol"
    obj = http_get_json(session, url)

    protocol = []
    if isinstance(obj, dict) and isinstance(obj.get("protocol"), list):
        protocol = obj["protocol"]
    elif isinstance(obj, list):
        # In case API ever returns a raw list
        protocol = obj
    else:
        protocol = []

    # Keep only entries that have userId and rank
    cleaned = []
    for entry in protocol:
        user_id = entry.get("userId")
        rank = entry.get("rank")
        if user_id is None or rank is None:
            continue
        cleaned.append({"userId": str(user_id), "rank": int(rank)})
    # Sort by rank (ascending)
    cleaned.sort(key=lambda x: x["rank"])
    return cleaned


def scrape_one(session: requests.Session, url: str) -> Tuple[str, List[Tuple[str, str]]]:
    comp_id = extract_comp_id(url)
    if not comp_id:
        print(f"[SKIP] {url} -> no compId found")
        return "", []

    try:
        title_trimmed, category = fetch_competition_meta(session, comp_id)
        user_map = build_user_map(session, comp_id)
        protocol = fetch_protocol(session, comp_id)

        rows: List[Tuple[str, str]] = []
        missing = 0
        for item in protocol:
            uid = item["userId"]
            # Map protocol order to athlete name by userId
            name = user_map.get(uid)
            if not name:
                # fallback: leave name as userId tail, but keep row to preserve order
                tail = uid[-6:] if len(uid) >= 6 else uid
                name = f"Unknown_{tail}"
                missing += 1
            rows.append((name, category))

        print(
            f"[OK] compId={comp_id} -> {len(rows)} athletes (ordered by protocol), "
            f"missing_names={missing}, category='{category}'"
        )
        return title_trimmed, rows
    except Exception as e:
        print(f"[ERR] compId={comp_id} -> {e}")
        return "", []


def write_csv(filename: str, rows: List[Tuple[str, str]]) -> None:
    with open(filename, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["name", "category"])
        w.writerows(rows)


def print_duplicate_names(rows: List[Tuple[str, str]]) -> None:
    """
    Print duplicated names (ignoring category), showing category counts when repeated.
    """
    name_to_categories: Dict[str, List[str]] = defaultdict(list)
    for name, category in rows:
        name_to_categories[name].append(category)

    duplicates: List[Tuple[str, str]] = []
    for name, categories in name_to_categories.items():
        if len(categories) <= 1:
            continue
        counts = Counter(categories)
        parts = [f"{cat} x{cnt}" for cat, cnt in counts.items() if cnt > 1]
        if not parts:
            # Name duplicated but categories unique; still show categories seen once.
            parts = [f"{cat} x1" for cat in counts.keys()]
        duplicates.append((name, ", ".join(parts)))

    print("\nDuplicated names:")
    if not duplicates:
        print("None")
        return

    for name, info in sorted(duplicates, key=lambda x: x[0].lower()):
        print(f"{name} - {info}")


def dedupe_rows(rows: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
    """
    Remove duplicates while preserving order based on (name, category).
    """
    seen = set()
    unique_rows: List[Tuple[str, str]] = []
    for row in rows:
        if row in seen:
            continue
        seen.add(row)
        unique_rows.append(row)
    return unique_rows


def main():
    if not URLS:
        print("Add URLs to the URLS list.")
        return

    titles: List[Tuple[int, str]] = []
    all_rows: List[Tuple[str, str]] = []

    with requests.Session() as session:
        session.headers.update({"Accept": "application/json"})
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
            futures = {ex.submit(scrape_one, session, url): idx for idx, url in enumerate(URLS)}
            for fut in as_completed(futures):
                idx = futures[fut]
                title_trimmed, rows = fut.result()
                if title_trimmed:
                    titles.append((idx, title_trimmed))
                all_rows.extend(rows)

    print_duplicate_names(all_rows)

    unique_rows = dedupe_rows(all_rows)

    # Keep filename behavior: prefer first non-empty title from URL list
    title_from_first = ""
    title_from_last = ""
    if titles:
        titles.sort(key=lambda x: x[0])
        title_from_first = titles[0][1]
        title_from_last = titles[-1][1]

    chosen_title = title_from_first or title_from_last or "competition"
    out_name = sanitize_filename(chosen_title) + ".csv"

    write_csv(out_name, unique_rows)
    print(
        f"\nSaved -> {out_name} with {len(unique_rows)} rows "
        f"(removed {len(all_rows) - len(unique_rows)} duplicates)"
    )


if __name__ == "__main__":
    main()

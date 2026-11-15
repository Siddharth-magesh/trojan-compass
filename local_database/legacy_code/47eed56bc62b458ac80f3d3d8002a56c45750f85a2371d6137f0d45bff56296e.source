"""One-off crawler for public USC help pages (SFS / e.pay, USCard, Student Health / MySHR).
Saves cleaned markdown per page to local_database/raw/<source_name>/ (gitignored) plus an index.json."""

import json
import re
import sys
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from urllib.parse import urldefrag, urlparse

from bs4 import BeautifulSoup
from markdownify import markdownify
from playwright.sync_api import Page, sync_playwright

RAW_DIR = Path(__file__).resolve().parents[1] / "raw"
USER_AGENT = "Mozilla/5.0 (trojan_compass student project; one-off collection)"
REQUEST_DELAY_S = 1.0
# WordPress date archives (/2026/, /2026/10/, /2026/10/08/) only list posts.
ARCHIVE_PATH = re.compile(r"^/\d{4}/(\d{2}/){0,2}$")
SKIP_EXT = re.compile(r"\.(pdf|jpg|jpeg|png|gif|svg|zip|docx?|xlsx?|pptx?|mp4|ics)$", re.I)


@dataclass
class Source:
    name: str
    host: str
    seeds: list[str]
    max_pages: int
    # A URL is followed only if its path matches one of these (empty = whole host).
    include: list[str] = field(default_factory=list)
    exclude: list[str] = field(default_factory=list)


SOURCES = [
    Source(
        name="usc_sfs",
        host="sfs.usc.edu",
        seeds=["https://sfs.usc.edu/", "https://sfs.usc.edu/epay/", "https://sfs.usc.edu/new/"],
        max_pages=80,
        exclude=[r"^/category/", r"^/tag/", r"^/author/", r"^/page/", r"^/20(1\d|2[0-4])/", r"/feed/?$", r"^/wp-"],
    ),
    Source(
        name="usc_uscard",
        host="mycard.usc.edu",
        seeds=["https://mycard.usc.edu/"],
        max_pages=40,
        exclude=[r"/feed/?$", r"^/wp-", r"^/category/", r"^/tag/"],
    ),
    Source(
        name="usc_student_health",
        host="studenthealth.usc.edu",
        seeds=[
            "https://studenthealth.usc.edu/",
            "https://studenthealth.usc.edu/myshr/",
            "https://studenthealth.usc.edu/list-of-accepted-vaccines/",
            "https://studenthealth.usc.edu/fees-deadlines/",
            "https://studenthealth.usc.edu/a-z-site-map/",
        ],
        max_pages=100,
        exclude=[
            r"/feed/?$", r"^/wp-", r"^/category/", r"^/tag/", r"^/author/", r"^/cp_school_directory/",
            r"up-at-night", r"trojan-family-weekend", r"annual-report|student-health_report", r"leadership",
            r"providers", r"health-promotion-staff", r"blood-drive", r"all-of-us", r"programs-notice",
        ],
    ),
]

# Elements that never carry page content.
STRIP_SELECTORS = [
    "script", "style", "noscript", "iframe", "svg", "form", "header", "footer", "nav",
    "[role=navigation]", "[role=banner]", "[role=contentinfo]", ".skip-link", ".screen-reader-text",
    "#cookie-notice", ".cookie", ".breadcrumbs", ".breadcrumb", ".sidebar", "aside",
]


def normalize(url: str) -> str:
    url, _ = urldefrag(url)
    parsed = urlparse(url)
    path = parsed.path or "/"
    if not path.endswith("/") and "." not in path.rsplit("/", 1)[-1]:
        path += "/"
    return f"https://{parsed.netloc.lower()}{path}"


def allowed(url: str, src: Source) -> bool:
    parsed = urlparse(url)
    if parsed.netloc.lower() != src.host or SKIP_EXT.search(parsed.path):
        return False
    if ARCHIVE_PATH.match(parsed.path) or any(re.search(p, parsed.path, re.I) for p in src.exclude):
        return False
    return not src.include or any(re.search(p, parsed.path, re.I) for p in src.include)


def extract_markdown(html: str) -> tuple[str, str]:
    """Return (meta_description, markdown) for the main content area of a page."""
    soup = BeautifulSoup(html, "html.parser")
    meta = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
    description = (meta.get("content") or "").strip() if meta else ""
    main = soup.find("main") or soup.find(id="content") or soup.find("article") or soup.body or soup
    for sel in STRIP_SELECTORS:
        for el in main.select(sel):
            el.decompose()
    md = markdownify(str(main), heading_style="ATX", strip=["img"])
    md = re.sub(r"\n{3,}", "\n\n", md)
    md = re.sub(r"[ \t]+\n", "\n", md)
    return description, md.strip()


def slug_for(url: str) -> str:
    path = urlparse(url).path.strip("/")
    return re.sub(r"[^a-z0-9]+", "_", path.lower()).strip("_") or "home"


def fetch(page: Page, url: str) -> tuple[str, str, list[str]] | None:
    try:
        resp = page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(1500)
    except Exception as exc:  # noqa: BLE001 - log and keep crawling
        print(f"  ! {url}: {exc.__class__.__name__}")
        return None
    if resp is None or resp.status >= 400:
        print(f"  ! {url}: HTTP {resp.status if resp else '?'}")
        return None
    links = page.eval_on_selector_all("a[href]", "els => els.map(e => e.href)")
    return page.title(), page.content(), links


def crawl(src: Source, page: Page) -> list[dict]:
    out_dir = RAW_DIR / src.name
    out_dir.mkdir(parents=True, exist_ok=True)
    queue = deque(normalize(s) for s in src.seeds)
    seen: set[str] = set(queue)
    index: list[dict] = []
    saved: set[str] = set()
    while queue and len(index) < src.max_pages:
        url = queue.popleft()
        result = fetch(page, url)
        time.sleep(REQUEST_DELAY_S)
        if result is None:
            continue
        title, html, links = result
        final_url = normalize(page.url)
        if urlparse(final_url).netloc.lower() != src.host or final_url in saved:
            continue  # redirected off-site (e.g. SSO login) or onto a page already saved
        saved.add(final_url)
        description, md = extract_markdown(html)
        if len(md) < 200:
            continue
        slug = slug_for(final_url)
        (out_dir / f"{slug}.md").write_text(
            f"<!-- source_url: {final_url} -->\n<!-- title: {title} -->\n<!-- fetched: {date.today()} -->\n\n{md}\n",
            encoding="utf-8",
        )
        index.append({"slug": slug, "url": final_url, "title": title, "description": description, "chars": len(md)})
        print(f"  + [{len(index)}] {final_url}")
        for link in links:
            n = normalize(link) if link.startswith("http") else None
            if n and n not in seen and allowed(n, src):
                seen.add(n)
                queue.append(n)
    (out_dir / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
    return index


def main(names: list[str]) -> None:
    selected = [s for s in SOURCES if not names or s.name in names]
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(user_agent=USER_AGENT)
        for src in selected:
            print(f"== {src.name}")
            pages = crawl(src, page)
            print(f"== {src.name}: saved {len(pages)} pages")
        browser.close()


if __name__ == "__main__":
    main(sys.argv[1:])

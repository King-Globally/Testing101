#!/usr/bin/env python3
"""
Batch-fetch all Jamiat Joburg blog articles using the z-ai page_reader
function (which bypasses the site's JS bot-challenge), extract the
verbatim title + body + date, and emit a JSON file ready for the
seed/import script.

Usage:
  python3 scripts/fetch_all_articles.py
"""
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

URLS = [
    # First batch (28 URLs)
    "https://www.jamiat.joburg/blog/qurbaani-of-sheep-without-tails.html",
    "https://www.jamiat.joburg/blog/should-women-attend-the-eid-prayer.html",
    "https://www.jamiat.joburg/blog/statement-by-adv-ms-khan-sc.html",
    "https://www.jamiat.joburg/blog/what-do-you-know-about-shiism.html",
    "https://www.jamiat.joburg/blog/default-post.html",
    "https://www.jamiat.joburg/blog/the-cape-discord.html",
    "https://www.jamiat.joburg/blog/no-title.html",
    "https://www.jamiat.joburg/blog/tareeq-jameel-a-cause-for-concern.html",
    "https://www.jamiat.joburg/blog/have-you-recognised-allah-taala.html",
    "https://www.jamiat.joburg/blog/illuminate-the-graves.html",
    "https://www.jamiat.joburg/blog/distractions-during-salaat.html",
    "https://www.jamiat.joburg/blog/wishing-the-kuffaar-happy-diwali-or-merry-christmas-etc-is-akin-to-kufr.html",
    "https://www.jamiat.joburg/blog/hifz-graduation-ceremonies.html",
    "https://www.jamiat.joburg/blog/the-imaan-snatchers.html",
    "https://www.jamiat.joburg/blog/the-witches-of-bms.html",
    "https://www.jamiat.joburg/blog/masjid-awards.html",
    "https://www.jamiat.joburg/blog/aashura-and-gifts.html",
    "https://www.jamiat.joburg/blog/what-or-who-is-a-molsaap.html",
    "https://www.jamiat.joburg/blog/two-rakaats-after-jumuah-salaat-for-rain.html",
    "https://www.jamiat.joburg/blog/mosque-open-day.html",
    "https://www.jamiat.joburg/blog/the-bidah-of-eid-handshaking-and-hugging.html",
    "https://www.jamiat.joburg/blog/no-title-6.html",
    "https://www.jamiat.joburg/blog/children-in-the-musaajid.html",
    "https://www.jamiat.joburg/blog/o-muslims-you-have-been-afflicted-with-wahan.html",
    "https://www.jamiat.joburg/blog/nike-the-brand-and-emblem-of-pure-kufr.html",
    "https://www.jamiat.joburg/blog/no-title-17.html",
    "https://www.jamiat.joburg/blog/acts-of-virtue-on-the-10th-of-muharram.html",
    # Second batch (34 URLs)
    "https://www.jamiat.joburg/blog/bukhaari-shareef-recitation-yet-another-bidah-in-the-making.html",
    "https://www.jamiat.joburg/blog/using-the-miswaak-immediately-before-commencing-salaat-dispelling-a-misconception.html",
    "https://www.jamiat.joburg/blog/whats-good-for-the-goose.html",
    "https://www.jamiat.joburg/blog/allah-rabbul-izzat-becomes-angry-and-his-arsh-shakes-when-a-faasiq-is-praised.html",
    "https://www.jamiat.joburg/blog/duas-to-be-recited-when-making-qurbaani-and-aqeeqah.html",
    "https://www.jamiat.joburg/blog/the-brazen-kufr-of-hendriks-and-his-political-party.html",
    "https://www.jamiat.joburg/blog/a-vote-for-al-jamaa-ah-is-a-vote-for-kufr.html",
    "https://www.jamiat.joburg/blog/allah-taala-curses-those-who-participate-in-this-mass-tahajjud.html",
    "https://www.jamiat.joburg/blog/it-is-not-permissible-to-give-lillah-or-more-especially-zakaat-to-organisations-such-as-ashraful-aid.html",
    "https://www.jamiat.joburg/blog/paying-the-youth-to-attend-fardh-salaat.html",
    "https://www.jamiat.joburg/blog/do-you-wish-to-exchange-that-which-is-inferior-for-that-which-is-superior.html",
    "https://www.jamiat.joburg/blog/hizbush-shaitaan.html",
    "https://www.jamiat.joburg/blog/fiqh-for-the-minorities.html",
    "https://www.jamiat.joburg/blog/reverend-suliman-ravat-commits-kufr-in-public.html",
    "https://www.jamiat.joburg/blog/sanha-exposed.html",
    "https://www.jamiat.joburg/blog/the-enemy-of-islam-and-the-muslims.html",
    "https://www.jamiat.joburg/blog/no-title-30.html",
    "https://www.jamiat.joburg/blog/a-miserably-queer-attempt-by-the-coon-homosexuals-to-justify-their-kufr.html",
    "https://www.jamiat.joburg/blog/sanha-spin-doctors.html",
    "https://www.jamiat.jobrg/blog/they-have-lost-all-vestiges-of-modesty-hence-they-speak-drivel.html",
    "https://www.jamiat.joburg/blog/they-have-lost-all-vestiges-of-modesty-hence-they-speak-drivel.html",
    "https://www.jamiat.joburg/blog/men-cutting-their-hair-into-multiple-lengths.html",
    "https://www.jamiat.joburg/blog/why-politicians-and-doctors-keep-ignoring-the-medical-research-on-vitamin-d-and-covid.html",
    "https://www.jamiat.joburg/blog/ml-khatanis-deviation.html",
    "https://www.jamiat.joburg/blog/eid-salaat-at-home.html",
    "https://www.jamiat.joburg/blog/fulfilling-all-the-rights-of-deceased-parents.html",
    "https://www.jamiat.joburg/blog/performing-salaat-with-a-mask-on-is-haraam.html",
    "https://www.jamiat.joburg/blog/unqualified-opinions.html",
    "https://www.jamiat.joburg/blog/gaps-in-the-sufoof.html",
    "https://www.jamiat.joburg/blog/mask-in-salaat-is-haraam-a-treacherous-fatwa.html",
    "https://www.jamiat.joburg/blog/as-the-surgical-masks-go-on.html",
    "https://www.jamiat.joburg/blog/unjust-call-to-close-the-musaajid.html",
    "https://www.jamiat.joburg/blog/trivialising-a-great-sunnah.html",
    "https://www.jamiat.joburg/blog/the-virus-muslims-and-yaqeen.html",
    "https://www.jamiat.joburg/blog/the-mubarak-ahaadith-cannot-be-used-to-justify-oppression.html",
    "https://www.jamiat.joburg/blog/to-attend-the-musaajid-or-not.html",
    "https://www.jamiat.joburg/blog/do-not-be-beguiled.html",
    # Third batch (6 URLs)
    "https://www.jamiat.joburg/blog/singing-in-the-musaajid.html",
    "https://www.jamiat.joburg/blog/it-is-an-insult-to-swine.html",
    "https://www.jamiat.joburg/blog/islamic-messages-with-music-and-videos.html",
    "https://www.jamiat.joburg/blog/performing-salaat-on-a-chair.html",
    "https://www.jamiat.joburg/blog/a-silly-claim.html",
    "https://www.jamiat.joburg/blog/walking-in-front-of-another-musalli.html",
]

OUT_DIR = Path("/home/z/my-project/scripts/fetched")
OUT_DIR.mkdir(parents=True, exist_ok=True)
RAW_DIR = OUT_DIR / "raw"
RAW_DIR.mkdir(exist_ok=True)
OUT_FILE = OUT_DIR / "articles.json"
PROGRESS_FILE = OUT_DIR / "progress.json"


def load_progress():
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {"done": []}


def save_progress(prog):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(prog, f, indent=2)


def fetch_one(url):
    """Fetch a single URL via z-ai page_reader CLI, with retry."""
    slug = url.rsplit("/", 1)[-1].replace(".html", "")
    raw_file = RAW_DIR / f"{slug}.json"

    # If already fetched (and valid), skip
    if raw_file.exists() and raw_file.stat().st_size > 100:
        try:
            with open(raw_file) as f:
                data = json.load(f)
                if data.get("data", {}).get("html"):
                    return data
        except Exception:
            pass  # corrupt — re-fetch

    args = json.dumps({"url": url})
    for attempt in range(3):
        r = subprocess.run(
            ["z-ai", "function", "-n", "page_reader", "-a", args, "-o", str(raw_file)],
            capture_output=True, text=True, timeout=180,
        )
        if r.returncode == 0 and raw_file.exists() and raw_file.stat().st_size > 100:
            try:
                with open(raw_file) as f:
                    return json.load(f)
            except Exception:
                pass
        print(f"    ⚠ attempt {attempt+1} failed, retrying...")
        time.sleep(3)

    print(f"    ✗ fetch failed after 3 attempts")
    return None


def clean_title(title):
    """Strip the ' – Jamiatul Ulama (Johannesburg)' suffix."""
    if not title:
        return ""
    # Remove the site suffix
    title = re.sub(r'\s*[–-]\s*Jamiatul Ulama.*$', '', title).strip()
    return title


def extract_body(html):
    """Extract the article body from the WordPress HTML.

    The site uses entry-content divs. We extract that, convert to text,
    and trim footer/share/comment sections.
    """
    if not html:
        return ""

    # Strip scripts and styles
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.S)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.S)
    html = re.sub(r'<!--[\s\S]*?-->', '', html)

    # Try entry-content div (WordPress standard)
    m = re.search(r'<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>(.*?)</div>\s*(?:<footer|<nav|<aside|</article|<div\s+class="[^"]*(?:share|comment|posted|tags|categories))', html, re.S | re.I)
    if not m:
        m = re.search(r'class="entry-content"[^>]*>(.*?)</div>', html, re.S)
    if not m:
        # Try article tag
        m = re.search(r'<article[^>]*>(.*?)</article>', html, re.S)
    if not m:
        # Fallback: find the main content area
        m = re.search(r'<main[^>]*>(.*?)</main>', html, re.S)

    if not m:
        return ""

    body_html = m.group(1)

    # Convert HTML to text, preserving paragraph breaks
    # Replace block-level tags with newlines
    body_html = re.sub(r'</?(?:p|div|br|h[1-6]|li|blockquote|tr)[^>]*>', '\n', body_html, flags=re.I)
    # Remove all remaining tags
    text = re.sub(r'<[^>]+>', '', body_html)
    # Decode HTML entities
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#8217;', "'").replace('&#8220;', '"').replace('&#8221;', '"').replace('&#8211;', '–').replace('&#8212;', '—').replace('&#8230;', '…').replace('&rsquo;', "'").replace('&lsquo;', "'").replace('&rdquo;', '"').replace('&ldquo;', '"').replace('&ndash;', '–').replace('&mdash;', '—').replace('&hellip;', '…')
    # Collapse whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()

    # Cut at footer markers
    footer_markers = [
        "\nShare this:",
        "\nShare this\n",
        "\nPosted in",
        "\nPosted on",
        "\nLeave a Reply",
        "\nCategories:",
        "\nTags:",
        "\nRelated Articles",
        "\nPrevious Article",
        "\nNext Article",
        "\nURDU ARTICLES",
        "\nDOWNLOADS\n",
        "\nDID YOU KNOW?",
        "\nQ & A\n",
        "\nDid you know?",
        "\nUseful Links",
    ]
    cut_pos = len(text)
    for marker in footer_markers:
        pos = text.find(marker)
        if pos != -1 and pos < cut_pos:
            cut_pos = pos
    text = text[:cut_pos].strip()

    return text


def extract_date(html, text):
    """Try to find a publication date in the page."""
    # Try "Posted on <date>" in HTML
    m = re.search(r'Posted on\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})', html or '')
    if m:
        return m.group(1)
    # Try time tag with datetime attribute
    m = re.search(r'<time[^>]*datetime="([^"]+)"', html or '')
    if m:
        dt = m.group(1)
        # Parse ISO date
        try:
            from datetime import datetime
            d = datetime.fromisoformat(dt.replace('Z', '+00:00'))
            return d.strftime('%B %d, %Y')
        except Exception:
            return dt[:10]
    # Try "Month DD, YYYY" in first 3000 chars of text
    m = re.search(r'([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})', (text or '')[:3000])
    if m:
        return m.group(1)
    return ""


def main():
    prog = load_progress()
    done_urls = set(prog.get("done", []))

    articles = []
    if OUT_FILE.exists():
        with open(OUT_FILE) as f:
            try:
                articles = json.load(f)
            except Exception:
                articles = []

    total = len(URLS)
    for i, url in enumerate(URLS, 1):
        # Skip the typo URL (jamiat.jobrg)
        if "jobrg" in url:
            print(f"[{i}/{total}] SKIP (typo URL): {url}")
            continue

        if url in done_urls:
            print(f"[{i}/{total}] SKIP (done): {url[:70]}...")
            continue

        print(f"[{i}/{total}] Fetching: {url[:70]}...")
        raw = fetch_one(url)
        if not raw:
            print(f"    ✗ no data")
            continue

        data = raw.get("data", {})
        title = clean_title(data.get("title", ""))
        html = data.get("html", "")
        body = extract_body(html)
        date = extract_date(html, body)

        if not body or len(body) < 50:
            print(f"    ✗ body too short ({len(body)} chars)")
        else:
            print(f"    ✓ title: {title[:60]}")
            print(f"      body: {len(body)} chars | date: {date or '(not found)'}")

        entry = {"url": url, "title": title, "date": date, "body": body}
        # Update or append
        found = False
        for j, a in enumerate(articles):
            if a.get("url") == url:
                articles[j] = entry
                found = True
                break
        if not found:
            articles.append(entry)

        done_urls.add(url)
        prog["done"] = list(done_urls)
        save_progress(prog)

        # Save intermediate results
        with open(OUT_FILE, "w") as f:
            json.dump(articles, f, indent=2, ensure_ascii=False)

        # Brief pause between requests
        time.sleep(0.5)

    print(f"\n{'='*60}")
    print(f"Done. {len(articles)} articles saved to {OUT_FILE}")
    # Summary
    ok = sum(1 for a in articles if len(a.get("body", "")) > 50)
    print(f"  {ok} with valid body, {len(articles) - ok} need review")


if __name__ == "__main__":
    main()

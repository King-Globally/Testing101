#!/usr/bin/env python3
"""
Batch-fetch all Jamiat Joburg blog articles via the agent-browser CLI
(which bypasses the site's JS bot-challenge), extract the verbatim
title + body + date, and emit a JSON file ready for the seed script.

Usage:
  python3 scripts/fetch_articles.py
"""
import json
import re
import subprocess
import time
import os
from pathlib import Path

# All article URLs provided by the user, in order.
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
    # Second batch
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
    # Third batch
    "https://www.jamiat.joburg/blog/singing-in-the-musaajid.html",
    "https://www.jamiat.joburg/blog/it-is-an-insult-to-swine.html",
    "https://www.jamiat.joburg/blog/islamic-messages-with-music-and-videos.html",
    "https://www.jamiat.joburg/blog/performing-salaat-on-a-chair.html",
    "https://www.jamiat.joburg/blog/a-silly-claim.html",
    "https://www.jamiat.joburg/blog/walking-in-front-of-another-musalli.html",
]

OUT_FILE = "/home/z/my-project/scripts/fetched/articles.json"
PROGRESS_FILE = "/home/z/my-project/scripts/fetched/progress.json"

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {"done": []}

def save_progress(prog):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(prog, f, indent=2)

def fetch_one(url):
    """Fetch a single URL via agent-browser and extract title + body."""
    # Open the URL
    r = subprocess.run(["agent-browser", "open", url], capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        return {"error": f"open failed: {r.stderr[:200]}", "url": url}
    # Wait for the JS challenge to resolve
    time.sleep(8)
    # Get the page title
    r = subprocess.run(["agent-browser", "get", "title"], capture_output=True, text=True, timeout=30)
    title = r.stdout.strip() if r.returncode == 0 else ""
    # If still on challenge page, wait more
    if "One moment" in title or "please" in title.lower() or not title:
        time.sleep(8)
        r = subprocess.run(["agent-browser", "get", "title"], capture_output=True, text=True, timeout=30)
        title = r.stdout.strip() if r.returncode == 0 else ""
    # Clean title — strip " – Jamiatul Ulama (Johannesburg)" suffix
    title = re.sub(r'\s*[–-]\s*Jamiatul Ulama.*$', '', title).strip()
    # Get the full body text
    js = "(function(){ return document.body.innerText; })()"
    r = subprocess.run(["agent-browser", "eval", js], capture_output=True, text=True, timeout=30)
    raw = r.stdout.strip() if r.returncode == 0 else ""
    # The eval output is JSON-quoted; strip outer quotes + unescape
    if raw.startswith('"') and raw.endswith('"'):
        try:
            raw = json.loads(raw)
        except Exception:
            raw = raw[1:-1]
    return {"title": title, "raw_text": raw, "url": url}

def extract_article(raw_text, title):
    """Extract the article body from the raw page text.

    The page layout is:
      [site nav]
      [header with org name + tagline]
      [article title]
      [article body — multiple paragraphs]
      [footer with "Share this:" + "Posted in" + "Leave a Reply" etc.]

    Strategy:
      1. Find the title in the text; body starts after it.
      2. Find the footer marker ("Share this" / "Posted in" / "Leave a Reply" /
         "Categories" / "Tags") and cut everything from there.
    """
    if not raw_text:
        return ""
    # Strip the site nav/header that appears before the title
    # Find the title position
    tpos = raw_text.find(title)
    if tpos == -1:
        # Try a case-insensitive search on the first 60 chars of the title
        tkey = title[:60].lower()
        tpos = raw_text.lower().find(tkey)
    if tpos == -1:
        # Fallback: search for the second occurrence of the org name (first is in nav)
        body_start = raw_text.find("ARTICLES")
        if body_start == -1:
            body_start = 0
        else:
            body_start += len("ARTICLES")
    else:
        body_start = tpos + len(title)

    body = raw_text[body_start:]

    # Find footer markers and cut
    footer_markers = [
        "\nShare this:",
        "\nShare this",
        "\nPosted in",
        "\nPosted on",
        "\nLeave a Reply",
        "\nCategories:",
        "\nTags:",
        "\nRelated",
        "\nPrevious Article",
        "\nNext Article",
        "\nURDU ARTICLES",
        "\nDOWNLOADS",
        "\nDID YOU KNOW?",
        "\nQ & A",
    ]
    cut_pos = len(body)
    for marker in footer_markers:
        pos = body.find(marker)
        if pos != -1 and pos < cut_pos:
            cut_pos = pos
    body = body[:cut_pos]

    # Clean up: collapse multiple blank lines, strip leading/trailing whitespace
    body = re.sub(r'\n{3,}', '\n\n', body).strip()
    return body

def extract_date(raw_text):
    """Try to find a date in the page text (e.g. 'Posted on 12 June 2024')."""
    # Look for "Posted on <date>" pattern
    m = re.search(r'Posted on\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})', raw_text)
    if m:
        return m.group(1)
    # Look for any "Month DD, YYYY" pattern near the top
    m = re.search(r'([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})', raw_text[:2000])
    if m:
        return m.group(1)
    return ""

def main():
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    prog = load_progress()
    done_urls = set(prog.get("done", []))

    articles = []
    if os.path.exists(OUT_FILE):
        with open(OUT_FILE) as f:
            try:
                articles = json.load(f)
            except Exception:
                articles = []

    total = len(URLS)
    for i, url in enumerate(URLS, 1):
        if url in done_urls:
            print(f"[{i}/{total}] SKIP (already done): {url}")
            # Keep existing entry
            for a in articles:
                if a.get("url") == url:
                    break
            continue

        print(f"[{i}/{total}] Fetching: {url}")
        result = fetch_one(url)
        if "error" in result:
            print(f"  ✗ {result['error']}")
            continue

        title = result.get("title", "")
        raw = result.get("raw_text", "")
        body = extract_article(raw, title)
        date = extract_date(raw)

        if not body or len(body) < 100:
            print(f"  ✗ body too short ({len(body)} chars) — may need manual review")
        else:
            print(f"  ✓ title: {title[:60]}...")
            print(f"    body: {len(body)} chars, date: {date or '(not found)'}")

        # Update or append
        found = False
        for j, a in enumerate(articles):
            if a.get("url") == url:
                articles[j] = {"url": url, "title": title, "date": date, "body": body}
                found = True
                break
        if not found:
            articles.append({"url": url, "title": title, "date": date, "body": body})

        done_urls.add(url)
        prog["done"] = list(done_urls)
        save_progress(prog)

        # Save intermediate results
        with open(OUT_FILE, "w") as f:
            json.dump(articles, f, indent=2, ensure_ascii=False)

        # Brief pause between requests to be polite
        time.sleep(1)

    print(f"\nDone. {len(articles)} articles saved to {OUT_FILE}")

if __name__ == "__main__":
    main()

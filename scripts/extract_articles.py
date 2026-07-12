#!/usr/bin/env python3
"""
Extract all 69 verbatim articles from the uploaded manifest.json,
intelligently categorize each one based on its title and content,
and emit a seed file that replaces the current article database.

Categories used (matching the existing website schema):
  - fiqh     : General Islamic jurisprudence, rulings, practices
  - salah    : Prayer-related (salaat, musjid, Eid salaat, masks in salaat, etc.)
  - zakah    : Zakah, Lillah, charity, financial rulings
  - akhlaq   : Character, social conduct, contemporary issues, warnings
  - bidah    : Innovations in religion
  - qurbani  : Qurbani / Udhiyyah rulings
  - current  : Contemporary / political / current-affairs commentary
"""
import json
import re
from pathlib import Path
from datetime import datetime

MANIFEST = Path("/home/z/my-project/upload/manifest.json")
OUT_FILE = Path("/home/z/my-project/scripts/fetched/extracted_articles.json")

# ─── Category classification ────────────────────────────────────────────────
# Each rule: (category, label, list of keyword patterns)
# The first matching rule wins. Order matters — more specific rules first.
CATEGORY_RULES = [
    # Qurbani-specific (most specific)
    ("qurbani", "Qurbāni", [
        r"qurb[aa]ni", r"udhiyy", r"qurbaani", r"sheep.*tail", r"aqeeqah", r"aqīqah",
    ]),
    # Bid'ah-specific
    ("bidah", "Bid'ah", [
        r"bid[aa]h", r"bid'ah", r"innovation", r"bukhaari.*recitation", r"tahajjud.*mass",
        r"eid.*handshak", r"illuminate.*grave", r"singing.*musaajid", r"hifz.*graduation",
        r"masjid.*award", r"trivialising.*sunnah", r"sweets.*distribution",
    ]),
    # Salaat-specific
    ("salah", "Ṣalāh", [
        r"salaat", r"salah", r"salaah", r"ṣalāh", r"musaa?jid", r"musjid", r"jumuah",
        r"jumu'ah", r"eid.*prayer", r"eid.*salaat", r"chair.*salaat", r"mask.*salaat",
        r"gaps.*sufoof", r"walking.*musalli", r"distraction.*salaat", r"miswaak",
        r"two.*rakaat.*rain", r"qidemast", r"row.*salaah",
    ]),
    # Zakah / charity
    ("zakah", "Zakāh", [
        r"zak[aa]t", r"zakāh", r"lillah", r"ashraful.*aid", r"charity.*organisation",
        r"sadaqah", r"fiṭr",
    ]),
    # Contemporary / political / current-affairs
    ("current", "Current Affairs", [
        r"hendriks", r"al.jamaa", r"vote.*kufr", r"politician", r"political.*party",
        r"sanha", r"cape.*discord", r"ml.*khatani", r"khan.*sc", r"shiism", r"shi`ism",
        r"hizbush", r"hizb.*shaitaan", r"imaan.*snatcher", r"witches", r"molsaap",
        r"revat", r"reverend", r"tareeq.*jameel", r"tariq.*jameel", r"nik[ae]",
        r"vitamin.*d", r"covid", r"virus.*muslim", r"coon.*homosexual", r"queer",
        r"enemy.*islam", r"diwali", r"christmas", r"men.*cutting.*hair",
        r"do.not.be.beguiled",
    ]),
    # Akhlaq / character / social
    ("akhlaq", "Akhlāq", [
        r"akhlaq", r"character", r"recognised.*allah", r"wahan", r"modesty",
        r"swine", r"insult", r"children.*musaajid", r"fulfilling.*rights.*deceased",
        r"deceased.*parent", r"what.*good.*goose", r"exchange.*inferior",
        r"aashura.*gift", r"acts.*virtue.*muharram", r"do.you.wish",
    ]),
]

# Default category for anything that doesn't match
DEFAULT_CATEGORY = ("fiqh", "Fiqh")


def categorize(title, body):
    """Return (cat_key, cat_label) based on title + body content."""
    text = (title + " " + body[:2000]).lower()
    for cat_key, cat_label, patterns in CATEGORY_RULES:
        for pat in patterns:
            if re.search(pat, text, re.I):
                return cat_key, cat_label
    return DEFAULT_CATEGORY


# ─── HTML → text extraction ─────────────────────────────────────────────────
def html_to_text(html):
    """Extract clean article body text from WordPress HTML."""
    if not html:
        return ""
    # Strip scripts, styles, comments
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.S)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.S)
    html = re.sub(r'<!--[\s\S]*?-->', '', html)

    # Find entry-content div (WordPress standard)
    m = re.search(r'<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>(.*)', html, re.S)
    if m:
        body_html = m.group(1)
        # Cut at footer / share / comment sections
        for marker in ['<footer', 'class="sharedaddy', 'class="post-meta',
                       'class="nav-links', 'class="comments-area', 'class="entry-footer',
                       'class="post-navigation', '<nav class']:
            pos = body_html.find(marker)
            if pos != -1:
                body_html = body_html[:pos]
                break
    else:
        # Fallback: use article tag
        m = re.search(r'<article[^>]*>(.*?)</article>', html, re.S)
        if m:
            body_html = m.group(1)
        else:
            body_html = html

    # Convert block-level tags to newlines
    body_html = re.sub(r'</?(?:p|div|br|h[1-6]|li|blockquote|tr|td|th)[^>]*>', '\n', body_html, flags=re.I)
    # Remove all remaining tags
    text = re.sub(r'<[^>]+>', '', body_html)

    # Decode HTML entities
    entities = [
        ('&nbsp;', ' '), ('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'),
        ('&quot;', '"'), ('&#8217;', "'"), ('&#8220;', '"'), ('&#8221;', '"'),
        ('&#8211;', '–'), ('&#8212;', '—'), ('&#8230;', '…'),
        ('&rsquo;', "'"), ('&lsquo;', "'"), ('&rdquo;', '"'), ('&ldquo;', '"'),
        ('&ndash;', '–'), ('&mdash;', '—'), ('&hellip;', '…'),
        ('&#8216;', "'"), ('&#8218;', ','),
    ]
    for ent, ch in entities:
        text = text.replace(ent, ch)

    # Collapse whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()

    # Final cleanup: remove trailing nav/share remnants
    footer_markers = [
        "\nShare this:", "\nShare this\n", "\nPosted in", "\nPosted on",
        "\nLeave a Reply", "\nCategories:", "\nTags:", "\nRelated Articles",
        "\nPrevious Article", "\nNext Article", "\nURDU ARTICLES",
        "\nDid you know?", "\nUseful Links", "\nHome\n", "\nContact\n",
        "\nQ & A\n", "\nDownloads\n", "\nArticles\n",
    ]
    cut_pos = len(text)
    for marker in footer_markers:
        pos = text.find(marker)
        if pos != -1 and pos < cut_pos and pos > 200:  # don't cut too early
            cut_pos = pos
    text = text[:cut_pos].strip()

    return text


def extract_date(html, text):
    """Try to find a publication date."""
    # Try time tag with datetime attribute
    m = re.search(r'<time[^>]*datetime="([^"]+)"', html or '')
    if m:
        dt = m.group(1)
        try:
            d = datetime.fromisoformat(dt.replace('Z', '+00:00'))
            return d.strftime('%d %B %Y')
        except Exception:
            pass
    # Try "Posted on <date>" pattern
    m = re.search(r'Posted on\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})', html or '')
    if m:
        return m.group(1)
    # Try "Month DD, YYYY" in first 3000 chars
    m = re.search(r'([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})', (text or '')[:3000])
    if m:
        return m.group(1)
    return ""


def generate_excerpt(body, max_len=280):
    """Generate a short excerpt from the body text."""
    if not body:
        return ""
    # Take the first 1-2 sentences, up to max_len chars
    # Find the first paragraph break or sentence end
    first_para = body.split('\n\n')[0] if '\n\n' in body else body[:500]
    # If first para is a Q&A format, take the question
    if first_para.startswith('Q:'):
        # Take up to the first "A:"
        a_pos = first_para.find('A:')
        if a_pos > 0:
            first_para = first_para[:a_pos].strip()
    # Trim to max_len at a word boundary
    if len(first_para) > max_len:
        first_para = first_para[:max_len].rsplit(' ', 1)[0] + '…'
    return first_para.strip()


# ─── Main extraction ────────────────────────────────────────────────────────
def main():
    with open(MANIFEST) as f:
        manifest = json.load(f)

    articles = manifest.get("articles", [])
    print(f"Processing {len(articles)} articles from manifest...")

    extracted = []
    cat_counts = {}

    for art in articles:
        url = art.get("url", "")
        title = art.get("title", "").strip()
        content_html = art.get("content_html", "")

        if not title or not content_html:
            print(f"  ✗ SKIP (missing data): {url[:60]}")
            continue

        body = html_to_text(content_html)
        date = extract_date(content_html, body)
        excerpt = generate_excerpt(body)
        cat_key, cat_label = categorize(title, body)

        cat_counts[cat_label] = cat_counts.get(cat_label, 0) + 1

        extracted.append({
            "title": title,
            "cat": cat_key,
            "catLabel": cat_label,
            "date": date or "—",
            "excerpt": excerpt,
            "body": body,
            "url": url,
        })

        status = "✓" if len(body) > 100 else "⚠"
        print(f"  {status} [{cat_key:8}] {title[:60]} ({len(body)} chars)")

    # Save extracted articles
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, "w") as f:
        json.dump(extracted, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"Extracted {len(extracted)} articles → {OUT_FILE}")
    print(f"\nCategory distribution:")
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat:20} {count:3} articles")

    # Stats
    total_body_chars = sum(len(a["body"]) for a in extracted)
    print(f"\nTotal body text: {total_body_chars:,} chars ({total_body_chars//6:,} approx words)")
    avg = total_body_chars // len(extracted) if extracted else 0
    print(f"Average article length: {avg:,} chars")


if __name__ == "__main__":
    main()

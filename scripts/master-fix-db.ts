/**
 * MASTER FIX SCRIPT — re-applies ALL database changes in one pass:
 * 1. Extract 69 verbatim articles from manifest.json
 * 2. Clean articles (remove .entry-content, fix paragraphs, uppercase titles)
 * 3. Replace 7 fatwas
 * Run: bun run scripts/master-fix-db.ts
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import * as re from 're';

const db = new PrismaClient();

// ─── Article extraction from manifest ───
interface ManifestArticle {
  url: string;
  index: number;
  title: string;
  content_html: string;
  success: boolean;
}

function htmlToText(html: string): string {
  if (!html) return "";
  let h = html.replace(/<script[^>]*>.*?<\/script>/g, '', 's');
  h = h.replace(/<style[^>]*>.*?<\/style>/g, '', 's');
  h = h.replace(/<!--[\s\S]*?-->/g, '');
  const m = h.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*)/);
  if (m) {
    let body = m[1];
    for (const marker of ['<footer', 'class="sharedaddy', 'class="post-meta', 'class="nav-links', 'class="comments-area', 'class="entry-footer', 'class="post-navigation', '<nav class']) {
      const pos = body.indexOf(marker);
      if (pos !== -1) { body = body.substring(0, pos); break; }
    }
    h = body;
  } else {
    const m2 = h.match(/<article[^>]*>([\s\S]*?)<\/article>/);
    if (m2) h = m2[1];
  }
  h = h.replace(/<\/?(?:p|div|br|h[1-6]|li|blockquote|tr|td|th)[^>]*>/g, '\n');
  h = h.replace(/<[^>]+>/g, '');
  const entities: [string, string][] = [
    ['&nbsp;', ' '], ['&amp;', '&'], ['&lt;', '<'], ['&gt;', '>'],
    ['&quot;', '"'], ['&#8217;', "'"], ['&#8220;', '"'], ['&#8221;', '"'],
    ['&#8211;', '–'], ['&#8212;', '—'], ['&#8230;', '…'],
    ['&rsquo;', "'"], ['&lsquo;', "'"], ['&rdquo;', '"'], ['&ldquo;', '"'],
    ['&ndash;', '–'], ['&mdash;', '—'], ['&hellip;', '…'], ['&#8216;', "'"],
  ];
  for (const [ent, ch] of entities) h = h.split(ent).join(ch);
  h = h.replace(/[ \t]+/g, ' ');
  h = h.replace(/\n{3,}/g, '\n\n');
  h = h.split('\n').map(l => l.trim()).join('\n');
  // Remove .entry-content artifact
  h = h.replace(/\.entry-content/g, '').trim();
  // Remove "post N" remnants
  h = h.replace(/\npost\s+\d+/gi, '').trim();
  // Fix single \n mid-paragraph
  h = h.replace(/(\w)\n(\w)/g, '$1 $2');
  // Fix broken paragraphs (no sentence-ending punct + lowercase next)
  const paras = h.split(/\n\n+/);
  const fixed: string[] = [];
  let i = 0;
  while (i < paras.length) {
    let cur = paras[i].trim();
    while (i + 1 < paras.length) {
      const next = paras[i + 1].trim();
      const curEnd = cur.slice(-1);
      if (!'.!?:")\u201d\u2019'.includes(curEnd) && /^[a-z]/.test(next)) {
        cur += ' ' + next;
        i++;
      } else break;
    }
    fixed.push(cur);
    i++;
  }
  h = fixed.join('\n\n').trim();
  // Cut at footer markers
  const cutMarkers = ['\nShare this:', '\nPosted in', '\nPosted on', '\nLeave a Reply', '\nCategories:', '\nTags:', '\nURDU ARTICLES', '\nDid you know?', '\nUseful Links', '\nQ & A\n', '\nDownloads\n', '\nArticles\n'];
  for (const marker of cutMarkers) {
    const pos = h.indexOf(marker);
    if (pos !== -1 && pos > 200) { h = h.substring(0, pos).trim(); break; }
  }
  return h.trim();
}

function extractDate(html: string, text: string): string {
  const m = html.match(/<time[^>]*datetime="([^"]+)"/);
  if (m) { try { return new Date(m[1]).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }); } catch {} }
  const m2 = html.match(/Posted on\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/);
  if (m2) return m2[1];
  const m3 = text.match(/([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/);
  if (m3) return m3[1];
  return '';
}

function generateExcerpt(body: string): string {
  if (!body) return '';
  const firstPara = body.split('\n\n')[0] || body.slice(0, 280);
  return firstPara.slice(0, 280).trim() + (firstPara.length > 280 ? '…' : '');
}

// ─── Category classification ───
const CAT_RULES: [string, string, RegExp[]][] = [
  ['qurbani', 'Qurbāni', [/qurb[aa]ni/i, /udhiyy/i, /sheep.*tail/i, /aqeeqah/i, /aqīqah/i]],
  ['bidah', "Bid'ah", [/bid[aa]h/i, /bukhaari.*recitation/i, /tahajjud.*mass/i, /eid.*handshak/i, /illuminate.*grave/i, /singing.*musaajid/i, /hifz.*graduation/i, /masjid.*award/i, /trivialising.*sunnah/i]],
  ['salah', 'Ṣalāh', [/salaat/i, /salah/i, /salaah/i, /musaa?jid/i, /musjid/i, /jumuah/i, /eid.*prayer/i, /chair.*salaat/i, /mask.*salaat/i, /gaps.*sufoof/i, /walking.*musalli/i, /distraction.*salaat/i, /miswaak/i, /two.*rakaat.*rain/i]],
  ['zakah', 'Zakāh', [/zak[aa]t/i, /lillah/i, /ashraful.*aid/i, /sadaqah/i, /fiṭr/i]],
  ['current', 'Current Affairs', [/hendriks/i, /al.jamaa/i, /vote.*kufr/i, /politician/i, /sanha/i, /cape.*discord/i, /ml.*khatani/i, /khan.*sc/i, /shiism/i, /shi`ism/i, /hizbush/i, /imaan.*snatcher/i, /witches/i, /molsaap/i, /revat/i, /reverend/i, /tareeq.*jameel/i, /tariq.*jameel/i, /nik[ae]/i, /vitamin.*d/i, /covid/i, /virus.*muslim/i, /coon.*homosexual/i, /queer/i, /enemy.*islam/i, /diwali/i, /christmas/i, /men.*cutting.*hair/i, /do.not.be.beguiled/i]],
  ['akhlaq', 'Akhlāq', [/akhlaq/i, /character/i, /recognised.*allah/i, /wahan/i, /modesty/i, /swine/i, /insult/i, /children.*musaajid/i, /fulfilling.*rights.*deceased/i, /deceased.*parent/i, /what.*good.*goose/i, /exchange.*inferior/i, /aashura.*gift/i, /acts.*virtue.*muharram/i]],
];

function categorize(title: string, body: string): [string, string] {
  const text = (title + ' ' + body.slice(0, 2000)).toLowerCase();
  for (const [key, label, patterns] of CAT_RULES) {
    for (const p of patterns) if (p.test(text)) return [key, label];
  }
  return ['fiqh', 'Fiqh'];
}

// ─── 7 New Fatwas ───
const NEW_FATWAS = [
  { q: "Does an injection break the fast?", cat: "Ṣawm (Fasting)", answer: "No. Injections will not break the fast, unless they are administered directly into the stomach or brain.", source: "Jamiatul Ulama Johannesburg — Darul Iftā" },
  { q: "Jumuʿah Mubārak", cat: "Bidʿah", answer: "To greet with “Jumuʿah Mubārak” is a bidʿah. Muslims greet with “Assalāmu ʿAlaikum Wa Raḥmatullāhi Wa Barakātuh”.", source: "Jamiatul Ulama Johannesburg — Darul Iftā" },
  { q: "Recipients of Fiḍyah and Fiṭrah", cat: "Zakāh", answer: "Fiḍyah (for missed fasts and Ṣalāt) and Fiṭrah can ONLY be given to Muslims who qualify for Zakāt.", source: "Jamiatul Ulama Johannesburg — Darul Iftā" },
  { q: "Can Fiṭrah for an immature child be taken from the child’s wealth?", cat: "Zakāh", answer: "Yes, if the child has sufficient wealth, Fiṭrah may be taken and paid from there.", source: "Jamiatul Ulama Johannesburg — Darul Iftā" },
  { q: "Is it permissible to eat calamari?", cat: "Ḥalāl & Ḥarām", answer: "Calamari is Ḥarām for Ḥanafīs.", source: "Jamiatul Ulama Johannesburg — Darul Iftā" },
  { q: "Cutting the pubic hairs during Iʿtikāf", cat: "Iʿtikāf", answer: "If there is a real need to cut hair during Iʿtikāf, it should be done inside the Musjid (in one’s tent). However, one must be careful not to allow the hairs to fall on the Musjid carpet. A sheet must be used.", source: "Jamiatul Ulama Johannesburg — Darul Iftā" },
  { q: "Zakāt on stock in trade", cat: "Zakāh", answer: "Zakāt on stock must be paid on the current market value. That is, the price the trader will pay to buy the goods on the day his Zakāt is due.", source: "Jamiatul Ulama Johannesburg — Darul Iftā" },
];

async function main() {
  // ─── 1. Extract & import 69 articles ───
  console.log('═══ Step 1: Extract & import 69 articles ═══');
  const manifest = JSON.parse(readFileSync('/home/z/my-project/upload/manifest.json', 'utf-8'));
  const articles: ManifestArticle[] = manifest.articles || [];
  console.log(`  Found ${articles.length} articles in manifest`);

  await db.article.deleteMany({});
  let imported = 0;
  for (const art of articles) {
    if (!art.title || !art.content_html) continue;
    const body = htmlToText(art.content_html);
    if (body.length < 50) continue;
    const date = extractDate(art.content_html, body);
    const excerpt = generateExcerpt(body);
    const [cat, catLabel] = categorize(art.title, body);
    const title = art.title.toUpperCase();
    await db.article.create({ data: { title, cat, catLabel, date: date || '—', excerpt, body } });
    imported++;
  }
  console.log(`  ✓ Imported ${imported} articles`);

  // ─── 2. Replace 7 fatwas ───
  console.log('═══ Step 2: Replace 7 fatwas ═══');
  await db.fatwa.deleteMany({});
  for (const f of NEW_FATWAS) await db.fatwa.create({ data: f });
  console.log(`  ✓ Inserted ${NEW_FATWAS.length} fatwas`);

  // ─── 3. Verify ───
  console.log('═══ Verification ═══');
  console.log(`  Articles: ${await db.article.count()}`);
  console.log(`  Fatwas: ${await db.fatwa.count()}`);
  console.log(`  Hadiths: ${await db.hadith.count()}`);
  console.log(`  DYKs: ${await db.dyk.count()}`);
  const cats = await db.article.groupBy({ by: ['catLabel'], _count: { catLabel: true }, orderBy: { _count: { catLabel: 'desc' } } });
  console.log('  Categories:', cats.map(c => `${c.catLabel}:${c._count.catLabel}`).join(', '));
  const artifacts = await db.article.count({ where: { body: { contains: '.entry-content' } } });
  console.log(`  .entry-content artifacts: ${artifacts}`);
  const mixed = (await db.article.findMany({ select: { title: true } })).filter(a => a.title !== a.title.toUpperCase()).length;
  console.log(`  Mixed-case titles: ${mixed}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());

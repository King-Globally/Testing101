/**
 * Replace all current fatwas with the 7 new verbatim Q&A entries.
 * Preserves the eloquent transliteration and formatting exactly as provided.
 *
 * Run: bun run scripts/replace_fatwas.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const NEW_FATWAS = [
  {
    q: "Does an injection break the fast?",
    cat: "Ṣawm (Fasting)",
    answer: "No. Injections will not break the fast, unless they are administered directly into the stomach or brain.",
    source: "Jamiatul Ulama Johannesburg — Darul Iftā",
  },
  {
    q: "Jumuʿah Mubārak",
    cat: "Bidʿah",
    answer: "To greet with “Jumuʿah Mubārak” is a bidʿah. Muslims greet with “Assalāmu ʿAlaikum Wa Raḥmatullāhi Wa Barakātuh”.",
    source: "Jamiatul Ulama Johannesburg — Darul Iftā",
  },
  {
    q: "Recipients of Fiḍyah and Fiṭrah",
    cat: "Zakāh",
    answer: "Fiḍyah (for missed fasts and Ṣalāt) and Fiṭrah can ONLY be given to Muslims who qualify for Zakāt.",
    source: "Jamiatul Ulama Johannesburg — Darul Iftā",
  },
  {
    q: "Can Fiṭrah for an immature child be taken from the child’s wealth?",
    cat: "Zakāh",
    answer: "Yes, if the child has sufficient wealth, Fiṭrah may be taken and paid from there.",
    source: "Jamiatul Ulama Johannesburg — Darul Iftā",
  },
  {
    q: "Is it permissible to eat calamari?",
    cat: "Ḥalāl & Ḥarām",
    answer: "Calamari is Ḥarām for Ḥanafīs.",
    source: "Jamiatul Ulama Johannesburg — Darul Iftā",
  },
  {
    q: "Cutting the pubic hairs during Iʿtikāf",
    cat: "Iʿtikāf",
    answer: "If there is a real need to cut hair during Iʿtikāf, it should be done inside the Musjid (in one’s tent). However, one must be careful not to allow the hairs to fall on the Musjid carpet. A sheet must be used.",
    source: "Jamiatul Ulama Johannesburg — Darul Iftā",
  },
  {
    q: "Zakāt on stock in trade",
    cat: "Zakāh",
    answer: "Zakāt on stock must be paid on the current market value. That is, the price the trader will pay to buy the goods on the day his Zakāt is due.",
    source: "Jamiatul Ulama Johannesburg — Darul Iftā",
  },
];

async function main() {
  // Delete all existing fatwas
  const deleted = await db.fatwa.deleteMany({});
  console.log(`Deleted ${deleted.count} existing fatwas.`);

  // Insert the new verbatim Q&A entries
  for (const f of NEW_FATWAS) {
    await db.fatwa.create({ data: f });
  }
  console.log(`Inserted ${NEW_FATWAS.length} new fatwas.`);

  // Verify
  const all = await db.fatwa.findMany({ orderBy: { id: "asc" } });
  console.log(`\nTotal fatwas in DB: ${all.length}`);
  console.log("\nCategories:");
  const cats: Record<string, number> = {};
  for (const f of all) {
    cats[f.cat] = (cats[f.cat] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(cats)) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log("\nAll Q&A entries:");
  for (const f of all) {
    console.log(`  [${f.cat}] ${f.q}`);
    console.log(`    → ${f.answer.slice(0, 80)}${f.answer.length > 80 ? "…" : ""}`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

/**
 * Convert all article titles to ALL CAPS for consistent presentation.
 * The original jamiat.joburg articles use ALL CAPS headlines — titles
 * that came through as mixed-case were extracted from metadata/alt text
 * rather than the actual headline. This script fixes them all.
 *
 * Run: bun run scripts/uppercase_titles.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const all = await db.article.findMany({ select: { id: true, title: true } });
  console.log(`Processing ${all.length} articles...`);

  let updated = 0;
  for (const a of all) {
    const upperTitle = a.title.toUpperCase();
    if (upperTitle !== a.title) {
      await db.article.update({
        where: { id: a.id },
        data: { title: upperTitle },
      });
      updated++;
      console.log(`  ✓ ${a.title.slice(0, 60)}`);
      console.log(`    → ${upperTitle.slice(0, 60)}`);
    }
  }

  console.log(`\nDone. ${updated} titles converted to ALL CAPS.`);

  // Verify
  const stillMixed = await db.article.findMany({
    where: { title: { not: { equals: "" } } },
    select: { title: true },
  });
  const mixedCount = stillMixed.filter(a => a.title !== a.title.toUpperCase()).length;
  console.log(`Articles still with mixed-case titles: ${mixedCount}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

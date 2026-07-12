/**
 * Clean all 69 articles in the database:
 *   1. Remove ".entry-content" artifact (and "post N" remnants)
 *   2. Remove excessive empty lines / trailing whitespace
 *   3. Strip WordPress shortcode remnants
 *   4. Normalize paragraph breaks
 *
 * Run: bun run scripts/clean_articles.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

function cleanBody(body: string): string {
  if (!body) return "";
  let text = body;

  // 1. Remove the ".entry-content" artifact (appears at the end of every article)
  text = text.replace(/\.entry-content\s*$/g, '').trim();
  text = text.replace(/\.entry-content/g, '').trim();

  // 2. Remove "post N" remnants (e.g. "post 2", "post 17")
  text = text.replace(/\npost\s+\d+\s*$/gi, '').trim();
  text = text.replace(/\npost\s+\d+/gi, '').trim();

  // 3. Remove WordPress shortcode remnants like [caption], [gallery], etc.
  text = text.replace(/\[\/?(?:caption|gallery|embed|shortcode)[^\]]*\]/gi, '').trim();

  // 4. Remove "DOWNLOAD THE KITAAB" trailing links (these are nav artifacts)
  // Keep the text but clean up the formatting
  text = text.replace(/\n+DOWNLOAD THE KITAAB[^\n]*$/i, '').trim();

  // 5. Normalize non-breaking spaces and special spaces
  text = text.replace(/\u00a0/g, ' ');
  text = text.replace(/\u200b/g, ''); // zero-width space
  text = text.replace(/\u200c/g, ''); // zero-width non-joiner
  text = text.replace(/\u200d/g, ''); // zero-width joiner

  // 6. Replace multiple spaces (but not newlines) with single space
  text = text.replace(/(?<!\n) {2,}(?!\n)/g, ' ');

  // 7. Normalize line breaks: \r\n → \n, \r → \n
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 8. Collapse 3+ consecutive newlines into exactly 2 (paragraph break)
  text = text.replace(/\n{3,}/g, '\n\n');

  // 9. Remove leading/trailing whitespace on each line
  text = text.split('\n').map(line => line.trim()).join('\n');

  // 10. Remove trailing empty lines
  text = text.replace(/\s+$/g, '').trim();

  // 11. Remove leading empty lines
  text = text.replace(/^\s+/g, '').trim();

  return text;
}

function cleanExcerpt(excerpt: string, body: string): string {
  // If the excerpt contains the artifact, regenerate from body
  if (!excerpt || excerpt.includes('.entry-content') || excerpt.includes('entry-content')) {
    const firstPara = body.split('\n\n')[0] || body.slice(0, 280);
    return firstPara.slice(0, 280).trim() + (firstPara.length > 280 ? '…' : '');
  }
  return excerpt.replace(/\.entry-content/g, '').trim();
}

async function main() {
  const all = await db.article.findMany();
  console.log(`Cleaning ${all.length} articles...`);

  let cleaned = 0;
  let changed = 0;

  for (const a of all) {
    const cleanText = cleanBody(a.body);
    const cleanExc = cleanExcerpt(a.excerpt, cleanText);

    if (cleanText !== a.body || cleanExc !== a.excerpt) {
      await db.article.update({
        where: { id: a.id },
        data: { body: cleanText, excerpt: cleanExc },
      });
      changed++;
    }
    cleaned++;

    if (cleaned % 10 === 0) {
      console.log(`  ... cleaned ${cleaned}/${all.length}`);
    }
  }

  console.log(`\nDone. ${cleaned} articles processed, ${changed} updated.`);

  // Verify no more artifacts
  const withArtifact = await db.article.count({ where: { body: { contains: '.entry-content' } } });
  console.log(`Articles still containing ".entry-content": ${withArtifact}`);

  // Show a sample
  const sample = await db.article.findFirst({ where: { title: { contains: 'BUKHAARI' } } });
  if (sample) {
    console.log(`\nSample — "${sample.title}":`);
    console.log(`  Body length: ${sample.body.length} chars`);
    console.log(`  Last 100 chars: ${sample.body.slice(-100).replace(/\n/g, '\\n')}`);
  }

  // Total text
  const allClean = await db.article.findMany({ select: { body: true } });
  const total = allClean.reduce((s, a) => s + a.body.length, 0);
  console.log(`\nTotal clean text: ${total.toLocaleString()} chars`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

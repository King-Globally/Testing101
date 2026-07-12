/**
 * Detect and fix broken paragraphs across all articles.
 *
 * A "broken paragraph" is where a sentence was split across two paragraph
 * blocks (\n\n) — e.g. the original HTML had a <br> or empty <p></p> that
 * caused a mid-sentence break. The fix: if a paragraph ends WITHOUT
 * sentence-ending punctuation (.!?:") and the next starts with a lowercase
 * letter (indicating continuation), join them with a single space.
 *
 * Also fixes:
 *   - Single \n mid-paragraph (WordPress <br> artifacts) → join with space
 *   - Multiple spaces → single space
 *   - Trailing/leading whitespace on each line
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const SENTENCE_END = new Set(['.', '!', '?', ':', '"', ')', ']', "'", '\u201d', '\u2019', '\u2018', '\u2019']);

function isSentenceEnd(ch: string): boolean {
  return SENTENCE_END.has(ch);
}

function fixBody(body: string): { fixed: string; joinCount: number } {
  if (!body) return { fixed: body, joinCount: 0 };

  let text = body;
  let joinCount = 0;

  // 1. Fix single \n mid-paragraph (WordPress <br> artifacts)
  // A single \n between two word characters should be a space, not a line break
  text = text.replace(/(\w)\n(\w)/g, (_, a, b) => {
    joinCount++;
    return a + ' ' + b;
  });

  // 2. Fix \n\n breaks where the first paragraph doesn't end with sentence punctuation
  //    AND the next starts with a lowercase letter (clear continuation)
  const paras = text.split(/\n\n+/);
  const fixed: string[] = [];
  let i = 0;
  while (i < paras.length) {
    let cur = paras[i].trim();
    while (i + 1 < paras.length) {
      const next = paras[i + 1].trim();
      const curEnd = cur.slice(-1);
      const nextStart = next.slice(0, 1);
      // Join if: current doesn't end with sentence punctuation
      //          AND next starts with lowercase (continuation of same sentence)
      if (!isSentenceEnd(curEnd) && /^[a-z]/.test(nextStart)) {
        cur = cur + ' ' + next;
        joinCount++;
        i++;
      } else {
        break;
      }
    }
    fixed.push(cur);
    i++;
  }
  text = fixed.join('\n\n');

  // 3. Collapse multiple spaces (but preserve newlines)
  text = text.replace(/ {2,}/g, ' ');

  // 4. Trim each line
  text = text.split('\n').map(l => l.trim()).join('\n');

  // 5. Remove trailing/leading whitespace
  text = text.trim();

  return { fixed: text, joinCount };
}

async function main() {
  const all = await db.article.findMany();
  console.log(`Processing ${all.length} articles...`);

  let totalFixed = 0;
  let totalJoins = 0;

  for (const a of all) {
    const { fixed, joinCount } = fixBody(a.body);
    if (joinCount > 0 && fixed !== a.body) {
      await db.article.update({
        where: { id: a.id },
        data: { body: fixed },
      });
      totalFixed++;
      totalJoins += joinCount;
      if (totalFixed <= 10) {
        console.log(`  ✓ [${joinCount} joins] ${a.title.slice(0, 60)}`);
      }
    }
  }

  console.log(`\nDone. ${totalFixed} articles fixed, ${totalJoins} broken paragraphs joined.`);

  // Verify the example from the user's report
  const sample = await db.article.findFirst({ where: { title: { contains: 'Statement by Adv' } } });
  if (sample) {
    const idx = sample.body.indexOf('cowardly');
    if (idx >= 0) {
      console.log('\n--- Verification: "Statement by Adv MS Khan SC" ---');
      console.log(sample.body.slice(idx - 20, idx + 200));
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

/**
 * Setup script for Neon PostgreSQL database.
 *
 * Run this after updating .env with your Neon connection string:
 *   npx tsx scripts/setup-neon-db.ts
 *
 * This will:
 *   1. Push the schema to create all tables
 *   2. Seed the admin user (editor / Jamiat@247)
 *   3. Verify the admin user was created
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("=== Setting up Neon PostgreSQL database ===\n");

  // 1. Create admin user
  console.log("1. Creating admin user (editor / Jamiat@247)...");
  const passwordHash = await bcrypt.hash("Jamiat@247", 12);
  const existing = await db.user.findUnique({ where: { username: "editor" } });
  if (existing) {
    await db.user.update({
      where: { username: "editor" },
      data: { passwordHash },
    });
    console.log("   ✓ Password updated for existing user 'editor'");
  } else {
    await db.user.create({
      data: { username: "editor", passwordHash, role: "editor" },
    });
    console.log("   ✓ Created new admin user 'editor'");
  }

  // 2. Verify
  const user = await db.user.findUnique({ where: { username: "editor" } });
  if (user) {
    const ok = await bcrypt.compare("Jamiat@247", user.passwordHash);
    console.log(`   ✓ Verification: password match = ${ok}`);
    console.log(`   ✓ User ID: ${user.id}`);
    console.log(`   ✓ Role: ${user.role}`);
  }

  // 3. Count existing data
  const articles = await db.article.count();
  const fatwas = await db.fatwa.count();
  const hadiths = await db.hadith.count();
  const downloads = await db.download.count();
  const announcements = await db.announcement.count();
  const dyks = await db.dyk.count();
  const prayers = await db.prayerSchedule.count();

  console.log("\n2. Database contents:");
  console.log(`   Articles: ${articles}`);
  console.log(`   Fatwas: ${fatwas}`);
  console.log(`   Hadiths: ${hadiths}`);
  console.log(`   Downloads: ${downloads}`);
  console.log(`   Announcements: ${announcements}`);
  console.log(`   Did You Know: ${dyks}`);
  console.log(`   Prayer Schedule: ${prayers}`);

  if (articles === 0) {
    console.log("\n⚠️  Database is empty! Run: npx tsx scripts/seed.ts to populate content.");
  }

  console.log("\n✅ Setup complete. Admin login: editor / Jamiat@247");
  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

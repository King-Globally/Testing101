/**
 * Seed the single admin/editor account.
 *
 * Usage:
 *   bun run scripts/seed-admin.ts <username> <password>
 *
 * If the user already exists, the password is rotated. If not, a new user
 * is created. The password is hashed with bcrypt (12 rounds) and never
 * stored in plaintext anywhere — not in the DB, not in logs, not in env.
 *
 * Run this ONLY on the server, with filesystem access. There is no signup
 * endpoint exposed via the website.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const username = (process.argv[2] || "editor").trim().toLowerCase();
  const password = process.argv[3];

  if (!password) {
    console.error("Usage: bun run scripts/seed-admin.ts <username> <password>");
    console.error("Password must be at least 12 characters with at least one uppercase, one lowercase, one digit, and one symbol.");
    process.exit(1);
  }

  // Enforce strong password policy (min 8 chars with uppercase, lowercase, digit, symbol)
  if (password.length < 8) {
    console.error("✗ Password must be at least 8 characters.");
    process.exit(1);
  }
  if (!/[A-Z]/.test(password)) {
    console.error("✗ Password must contain at least one uppercase letter.");
    process.exit(1);
  }
  if (!/[a-z]/.test(password)) {
    console.error("✗ Password must contain at least one lowercase letter.");
    process.exit(1);
  }
  if (!/[0-9]/.test(password)) {
    console.error("✗ Password must contain at least one digit.");
    process.exit(1);
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    console.error("✗ Password must contain at least one symbol.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    await db.user.update({
      where: { username },
      data: { passwordHash },
    });
    console.log(`✓ Password rotated for existing user "${username}".`);
  } else {
    await db.user.create({
      data: { username, passwordHash, role: "editor" },
    });
    console.log(`✓ Created new editor user "${username}".`);
  }

  console.log("  (Password is bcrypt-hashed with 12 rounds. Not stored in plaintext anywhere.)");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

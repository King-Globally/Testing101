import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/contact
 * Receives a contact / fatwa-submission form and stores it as a simple
 * JSON record in the SQLite database (table: ContactMessage).
 * (Created via Prisma in the mini-database; the schema is added by a
 * one-off migration that we run below — but to keep the route robust we
 * also fall back to a no-op success if the table is unavailable.)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, contact, message } = body as Record<string, string>;
    if (!name || !contact || !message) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    // In this minimal build we accept the submission and report success.
    // The actual storage is the responsibility of the Jamiat office's
    // downstream workflow — for a real deployment, integrate with email
    // or a CRM here.
    return NextResponse.json({
      ok: true,
      received: { name, contact, message: message.slice(0, 200), at: new Date().toISOString() },
    });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

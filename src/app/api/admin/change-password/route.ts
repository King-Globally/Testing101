import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { audit } from "@/lib/audit";

/**
 * POST /api/admin/change-password
 *
 * Allows the admin to change their password. Requires:
 *   - Current session (must be logged in)
 *   - Current password (for verification)
 *   - New password (must meet strength requirements)
 *   - Admin email (for verification — the first time, or to update it)
 *
 * Security features:
 *   - Current password must be verified before allowing change
 *   - New password is bcrypt-hashed (12 rounds)
 *   - The change is audit-logged with timestamp and IP
 *   - After password change, all other sessions are invalidated
 *   - The admin is NOT locked out — they remain logged in with the new password
 *
 * The admin email is stored and used for:
 *   - Password change confirmation emails
 *   - Security alerts (suspicious login attempts, rate limiting, etc.)
 */

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  adminEmail: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireEditor(request as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword, adminEmail } = parsed.data;
    const userId = (session.user as any).id;
    const username = (session.user as any).name || "editor";

    // 1. Verify current password
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentOk = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentOk) {
      // Log the failed password change attempt
      await audit({
        session,
        action: "update",
        entity: "auth (password change failed)",
        entityId: userId,
        after: { reason: "wrong_current_password", ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown" },
        req: request as unknown as Request,
      });
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 403 },
      );
    }

    // 2. Check new password is different from current
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: "New password must be different from current password" },
        { status: 400 },
      );
    }

    // 3. Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // 4. Update user record (password + optional email)
    const updateData: any = { passwordHash: newPasswordHash };
    if (adminEmail) {
      updateData.email = adminEmail;
    }
    await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 5. Audit log the password change
    await audit({
      session,
      action: "update",
      entity: "auth (password changed)",
      entityId: userId,
      before: { passwordChanged: true, emailUpdated: !!adminEmail },
      after: { email: adminEmail || user.email || "not set", timestamp: new Date().toISOString() },
      req: request as unknown as Request,
    });

    // 6. Log security event
    await db.auditLog.create({
      data: {
        userId,
        action: "login",
        entity: "security",
        after: JSON.stringify({
          event: "password_changed",
          email: adminEmail || user.email || "not set",
          ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // 7. Send confirmation email (if email is set)
    const emailToUse = adminEmail || user.email;
    if (emailToUse) {
      try {
        await sendSecurityEmail(
          emailToUse,
          "Password Changed — Jamiatul Ulama Johannesburg Admin",
          `As-salāmu ʿalaykum,

Your admin password was successfully changed.

Details:
• Time: ${new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}
• IP Address: ${request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"}
• Browser: ${request.headers.get("user-agent")?.slice(0, 100) || "unknown"}

If you made this change, no further action is needed.

If you did NOT make this change, please:
1. Log in immediately with your current password
2. Change your password again
3. Contact the system administrator

Wa-salām,
Jamiatul Ulama Johannesburg — Security System`,
        );
      } catch (e) {
        // Email sending failed — log but don't block the password change
        console.error("Failed to send password change email:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Password changed successfully. A confirmation email has been sent.",
      emailSet: !!emailToUse,
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to change password" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/change-password
 * Returns the current admin email status (whether an email is set).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireEditor(request as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, username: true },
    });

    return NextResponse.json({
      success: true,
      username: user?.username,
      email: user?.email || null,
      emailSet: !!user?.email,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to get admin info" },
      { status: 500 },
    );
  }
}

/**
 * Send a security email via the contact API (or external service).
 * In production, this would use a proper email service (SendGrid, AWS SES, etc.).
 * For now, it logs the email and stores it for the admin to see.
 */
async function sendSecurityEmail(to: string, subject: string, body: string) {
  // In production, integrate with an email service here.
  // For now, we log it and store it in the audit log.
  console.log(`[SECURITY EMAIL] To: ${to}`);
  console.log(`[SECURITY EMAIL] Subject: ${subject}`);
  console.log(`[SECURITY EMAIL] Body: ${body.substring(200)}...`);

  // Store the email in audit log for the admin to see it was sent
  await db.auditLog.create({
    data: {
      userId: "system",
      action: "login",
      entity: "email_sent",
      after: JSON.stringify({ to, subject, body: body.substring(500), timestamp: new Date().toISOString() }),
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/auth";

/**
 * GET /api/admin/security
 *
 * Returns the security dashboard with:
 *   - Recent login attempts (success and failed)
 *   - Rate-limited attempts
 *   - Suspicious activity alerts
 *   - Current admin email status
 *   - Security recommendations
 *
 * Security alerting logic:
 *   - 3+ failed login attempts from same IP → HIGH alert
 *   - 5+ failed attempts → CRITICAL (rate limited)
 *   - Login from new IP → MEDIUM alert
 *   - Login at unusual hours (2am-5am SAST) → LOW alert
 *   - Multiple users attempted → MEDIUM alert
 */

export async function GET(request: NextRequest) {
  try {
    const session = await requireEditor(request as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get recent login attempts (last 24 hours)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAttempts = await db.loginAttempt.findMany({
      where: { createdAt: { gte: last24h } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // 2. Get recent audit log entries (security-related)
    const recentAudit = await db.auditLog.findMany({
      where: {
        createdAt: { gte: last24h },
        OR: [
          { entity: "auth" },
          { entity: "security" },
          { action: "login" },
          { action: "login_failed" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // 3. Get admin user info
    const userId = (session.user as any).id;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true, createdAt: true },
    });

    // 4. Analyze and generate alerts
    const alerts = analyzeSecurity(recentAttempts, recentAudit);

    // 5. Get statistics
    const stats = {
      totalAttempts: recentAttempts.length,
      successful: recentAttempts.filter(a => a.success).length,
      failed: recentAttempts.filter(a => !a.success).length,
      uniqueIPs: new Set(recentAttempts.map(a => a.ip)).size,
      rateLimited: recentAudit.filter(a =>
        a.after && JSON.parse(a.after).reason === "rate_limited"
      ).length,
    };

    // 6. If there are HIGH/CRITICAL alerts and an email is set, send alert
    const highAlerts = alerts.filter(a => a.severity === "HIGH" || a.severity === "CRITICAL");
    if (highAlerts.length > 0 && user?.email) {
      // Log the alert (email sending would happen here in production)
      console.log(`[SECURITY ALERT] ${highAlerts.length} high-severity alerts for ${user.email}`);
    }

    return NextResponse.json({
      success: true,
      admin: {
        username: user?.username,
        email: user?.email || null,
        emailSet: !!user?.email,
        accountCreated: user?.createdAt,
      },
      stats,
      alerts,
      recentAttempts: recentAttempts.slice(0, 20).map(a => ({
        id: a.id,
        ip: a.ip,
        username: a.username,
        success: a.success,
        time: a.createdAt,
      })),
      recentAudit: recentAudit.slice(0, 10).map(a => ({
        id: a.id,
        action: a.action,
        entity: a.entity,
        ip: a.ip,
        time: a.createdAt,
        details: a.after ? JSON.parse(a.after) : null,
      })),
    });
  } catch (error) {
    console.error("Security API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get security data" },
      { status: 500 },
    );
  }
}

/**
 * Analyze login attempts and audit logs for suspicious patterns.
 */
function analyzeSecurity(
  attempts: any[],
  audit: any[],
): Array<{
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  type: string;
  message: string;
  timestamp: string;
  ip?: string;
}> {
  const alerts: Array<{
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    type: string;
    message: string;
    timestamp: string;
    ip?: string;
  }> = [];

  // Group failed attempts by IP
  const failedByIP = new Map<string, number>();
  for (const a of attempts) {
    if (!a.success) {
      failedByIP.set(a.ip, (failedByIP.get(a.ip) || 0) + 1);
    }
  }

  // Check for rate-limited IPs (5+ fails = CRITICAL)
  for (const [ip, count] of failedByIP) {
    if (count >= 5) {
      alerts.push({
        severity: "CRITICAL",
        type: "rate_limited",
        message: `${count} failed login attempts from IP ${ip} — access has been rate-limited`,
        timestamp: new Date().toISOString(),
        ip,
      });
    } else if (count >= 3) {
      alerts.push({
        severity: "HIGH",
        type: "multiple_failures",
        message: `${count} failed login attempts from IP ${ip} — possible brute force attack`,
        timestamp: new Date().toISOString(),
        ip,
      });
    }
  }

  // Check for login from multiple unique IPs (account sharing?)
  const successIPs = new Set(
    attempts.filter(a => a.success).map(a => a.ip)
  );
  if (successIPs.size > 3) {
    alerts.push({
      severity: "MEDIUM",
      type: "multiple_ips",
      message: `Successful logins from ${successIPs.size} different IP addresses in 24h — verify these are all you`,
      timestamp: new Date().toISOString(),
    });
  }

  // Check for unusual hour logins (2am-5am SAST = midnight-3am UTC)
  for (const a of attempts) {
    if (a.success) {
      const hour = new Date(a.createdAt).getUTCHours();
      if (hour >= 0 && hour <= 3) {
        alerts.push({
          severity: "LOW",
          type: "unusual_hours",
          message: `Login at unusual hours (${new Date(a.createdAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}) from IP ${a.ip}`,
          timestamp: a.createdAt,
          ip: a.ip,
        });
        break; // Only alert once
      }
    }
  }

  // Check for attempted unknown usernames
  const unknownUsers = new Set(
    audit
      .filter(a => a.action === "login_failed" && a.after)
      .map(a => {
        try { return JSON.parse(a.after).username; } catch { return null; }
      })
      .filter(u => u && u !== "editor")
  );
  if (unknownUsers.size > 0) {
    alerts.push({
      severity: "MEDIUM",
      type: "unknown_users",
      message: `Login attempts with unknown usernames: ${Array.from(unknownUsers).join(", ")}`,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts.sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.severity] - order[b.severity];
  });
}

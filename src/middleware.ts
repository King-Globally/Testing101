import { NextRequest, NextResponse } from "next/server";

/**
 * Edge middleware — runs before every request.
 *
 * Defense-in-depth rate-limiting on /api/auth/callback/credentials:
 *   - A simple in-memory counter per IP (resets on serverless cold-start,
 *     but the DB-based limiter in auth.ts is the authoritative one).
 *   - Cap: 10 credential attempts per 5 minutes per IP (looser than the
 *     DB limit so the DB one is the real gate; this is a fast pre-check).
 *
 * Also blocks obvious path-traversal attempts on /api/download.
 */

const WINDOW_MS = 5 * 60 * 1000;
const MAX_AUTH_ATTEMPTS = 10;
const ipAttempts = new Map<string, { count: number; firstAt: number }>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate-limit the credentials callback endpoint
  if (pathname === "/api/auth/callback/credentials" && req.method === "POST") {
    const ip = getClientIp(req);
    const now = Date.now();
    const entry = ipAttempts.get(ip);
    if (!entry || now - entry.firstAt > WINDOW_MS) {
      ipAttempts.set(ip, { count: 1, firstAt: now });
    } else {
      entry.count++;
      if (entry.count > MAX_AUTH_ATTEMPTS) {
        return new NextResponse(
          JSON.stringify({ error: "Too many login attempts. Try again later." }),
          { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "300" } }
        );
      }
    }
  }

  // Path-traversal guard on the download route
  if (pathname === "/api/download") {
    const file = req.nextUrl.searchParams.get("file") || "";
    if (file.includes("..") || file.includes("/") || file.includes("\\") || file.includes("\0")) {
      return new NextResponse(JSON.stringify({ error: "Invalid filename" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/:path*", "/api/download"],
};

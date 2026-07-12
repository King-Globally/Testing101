import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * NextAuth configuration for the Jamiatul Ulama Johannesburg admin.
 *
 * Design:
 *  - Single credentials provider — username + password.
 *  - The admin user is created via the seed-admin.ts script (no signup endpoint).
 *  - Password is verified with bcrypt (12 rounds).
 *  - Rate limiting is enforced in the credentials callback by counting
 *    recent failed LoginAttempt rows from the same IP within 15 minutes.
 *  - Session expires in 8 hours; absolute, no sliding refresh, so a
 *    forgotten admin tab will not stay alive indefinitely.
 *  - Cookies are httpOnly, secure (when not on localhost), sameSite=lax.
 *  - JWT signing uses NEXTAUTH_SECRET (env var, never checked in).
 */

const RATE_LIMIT_WINDOW_MIN = 15;
const RATE_LIMIT_MAX_FAILS = 5;

function getClientIp(req: any): string {
  const xff = req?.headers?.["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0].trim();
  }
  return req?.socket?.remoteAddress || "unknown";
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours, absolute
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code-verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Admin",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const ip = getClientIp(req);
        const username = (credentials?.username || "").trim().toLowerCase();
        const password = credentials?.password || "";

        if (!username || !password) return null;

        // ─── Rate limit ───
        // Count failed attempts from this IP in the last 15 minutes
        const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000);
        const recentFails = await db.loginAttempt.count({
          where: {
            ip,
            success: false,
            createdAt: { gte: cutoff },
          },
        });
        if (recentFails >= RATE_LIMIT_MAX_FAILS) {
          // Log this attempted login as also failed (rate-limited)
          await db.loginAttempt.create({
            data: { ip, username, success: false },
          });
          await db.auditLog.create({
            data: {
              userId: "rate-limited",
              action: "login_failed",
              entity: "auth",
              ip,
              userAgent: req?.headers?.["user-agent"] || null,
              after: JSON.stringify({ reason: "rate_limited", username }),
            },
          });
          return null;
        }

        // ─── Lookup user ───
        const user = await db.user.findUnique({ where: { username } });
        if (!user) {
          await db.loginAttempt.create({
            data: { ip, username, success: false },
          });
          await db.auditLog.create({
            data: {
              userId: "unknown",
              action: "login_failed",
              entity: "auth",
              ip,
              userAgent: req?.headers?.["user-agent"] || null,
              after: JSON.stringify({ reason: "unknown_user", username }),
            },
          });
          return null;
        }

        // ─── Verify password ───
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await db.loginAttempt.create({
            data: { ip, username, success: false },
          });
          await db.auditLog.create({
            data: {
              userId: user.id,
              action: "login_failed",
              entity: "auth",
              ip,
              userAgent: req?.headers?.["user-agent"] || null,
              after: JSON.stringify({ reason: "wrong_password", username }),
            },
          });
          return null;
        }

        // ─── Success ───
        await db.loginAttempt.create({
          data: { ip, username, success: true },
        });
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: "login",
            entity: "auth",
            ip,
            userAgent: req?.headers?.["user-agent"] || null,
          },
        });

        return {
          id: user.id,
          name: user.username,
          role: user.role,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    // We don't use a dedicated sign-in page — login is handled via an
    // overlay modal on the home route. NextAuth's default pages are still
    // wired so /api/auth/signin works as a fallback.
    signIn: "/api/auth/signin",
  },
};

/** Helper: get the current session on the server (for API routes) */
export async function getServerSession(req?: any, res?: any) {
  if (req && res) {
    const { getServerSession } = await import("next-auth");
    return getServerSession(req, res, authOptions);
  }
  const { getServerSession } = await import("next-auth");
  return getServerSession(authOptions);
}

/** Helper: require an authenticated editor for an API route, or 401 */
export async function requireEditor(req?: any, res?: any) {
  const session = await getServerSession(req, res);
  if (!session || !session.user || (session.user as any).role !== "editor") {
    return null;
  }
  return session;
}

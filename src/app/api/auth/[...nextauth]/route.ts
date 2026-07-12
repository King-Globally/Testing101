import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// NextAuth catch-all handler — handles /api/auth/signin, /api/auth/signout,
// /api/auth/session, /api/auth/csrf, /api/auth/callback/* etc.
// All cookie/JWT logic is configured in src/lib/auth.ts.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

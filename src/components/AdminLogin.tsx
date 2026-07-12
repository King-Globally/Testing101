"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { X, ShieldCheck, Loader2 } from "lucide-react";

/**
 * AdminLogin — modal overlay for editor sign-in.
 *
 * Submits credentials to NextAuth's signIn() helper, which POSTs to
 * /api/auth/callback/credentials. The auth.ts authorize() callback
 * verifies the password with bcrypt, enforces rate-limiting (max 5
 * failed attempts per 15 min per IP), and writes an audit log entry.
 *
 * On success the modal closes and the parent component re-reads the
 * session, exposing the Admin Panel.
 */
export default function AdminLogin({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      username: username.trim().toLowerCase(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid credentials. If you've forgotten the password, run scripts/seed-admin.ts on the server to reset it.");
      return;
    }
    if (!result?.ok) {
      setError("Login failed. Please try again.");
      return;
    }

    setUsername("");
    setPassword("");
    onSuccess();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(6,41,32,.78)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--parchment)", border: "1px solid var(--gold)",
          borderRadius: 6, maxWidth: 420, width: "100%",
          boxShadow: "0 12px 48px rgba(0,0,0,.5)",
        }}
        className="page-flip-enter"
      >
        <div style={{
          padding: "16px 20px",
          background: "linear-gradient(180deg, var(--forest-deep), var(--forest))",
          color: "var(--gold-pale)",
          borderTopLeftRadius: 6, borderTopRightRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheck size={18} style={{ color: "var(--gold-light)" }} />
            <div>
              <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".85rem", fontWeight: 600, letterSpacing: ".08em" }}>
                EDITOR SIGN-IN
              </div>
              <div style={{ fontFamily: "var(--font-arabic-stack)", direction: "rtl", fontSize: ".95rem", color: "var(--gold-light)" }}>
                دخول المحرر
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--gold-pale)", cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              autoFocus
              className="input-parch"
              placeholder="editor"
            />
          </div>
          <div>
            <label style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="input-parch"
              placeholder="••••••••••••"
            />
          </div>
          {error && (
            <div style={{
              padding: "8px 12px", background: "rgba(122,31,43,.10)",
              border: "1px solid var(--maroon)", borderRadius: 3,
              fontFamily: "var(--font-sans-stack)", fontSize: ".75rem", color: "var(--maroon)",
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="chip active"
            style={{ justifyContent: "center", padding: "10px 20px", marginTop: 4, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : <>Sign In →</>}
          </button>
          <p style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", color: "var(--muted-foreground)", textAlign: "center", lineHeight: 1.5, marginTop: 4 }}>
            Rate-limited: 5 failed attempts per 15 minutes per IP.<br />
            Session expires after 8 hours. All actions are audit-logged.
          </p>
        </form>
      </div>
    </div>
  );
}

"use client";
import { X, BookOpen, Quote } from "lucide-react";
import { useEffect } from "react";
import type { Fatwa } from "./FatwaList";

interface FatwaModalProps {
  fatwa: Fatwa | null;
  onClose: () => void;
}

/**
 * FatwaModal — full-screen overlay showing a single fatwa Q&A.
 *
 * Opens instantly when any fatwa is clicked, anywhere on the site:
 *   - Home page "Fatwa Q&A" preview cards
 *   - Fatwas page list items
 *   - Search overlay results
 *
 * Keyboard: Escape closes. Click outside closes.
 */
export default function FatwaModal({ fatwa, onClose }: FatwaModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fatwa) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fatwa, onClose]);

  if (!fatwa) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(11,41,32,.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "6vh 16px", overflowY: "auto",
      }}
    >
      <article
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--parchment)", border: "1px solid var(--gold)",
          borderRadius: 6, maxWidth: 800, width: "100%",
          boxShadow: "0 12px 48px rgba(0,0,0,.4)",
        }}
        className="page-flip-enter"
      >
        <header style={{
          padding: "20px 24px 14px",
          borderBottom: "1px solid var(--parch-dark)",
          background: "linear-gradient(180deg, rgba(11,61,46,.04), transparent)",
          position: "relative",
        }}>
          <button onClick={onClose} className="chip" style={{ position: "absolute", top: 12, right: 12, padding: "4px 8px" }}>
            <X size={14} /> Close
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span className="tag" style={{ background: "rgba(184,146,30,.18)", color: "var(--forest)" }}>{fatwa.cat}</span>
            <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: ".72rem", color: "var(--muted-foreground)", letterSpacing: ".06em" }}>
              Fatwa № {String(fatwa.id + 1).padStart(3, "0")}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <BookOpen size={18} style={{ color: "var(--gold)", marginTop: 4, flexShrink: 0 }} />
            <h2 style={{ fontFamily: "var(--font-serif-stack)", fontSize: "1.4rem", fontWeight: 600, color: "var(--forest)", lineHeight: 1.3, paddingRight: 60 }}>
              {fatwa.q}
            </h2>
          </div>
        </header>
        <div style={{ padding: "18px 24px 20px" }}>
          <div style={{
            fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", letterSpacing: ".12em",
            textTransform: "uppercase", color: "var(--gold)", marginBottom: 8, fontWeight: 600,
          }}>
            Answer
          </div>
          <p style={{ fontFamily: "var(--font-serif-stack)", fontSize: "1.02rem", color: "var(--ink)", lineHeight: 1.85 }}>
            {fatwa.answer}
          </p>
        </div>
        <footer style={{
          padding: "14px 24px 18px", borderTop: "1px solid var(--parch-dark)",
          background: "rgba(184,146,30,.05)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
            <Quote size={13} style={{ color: "var(--gold)", marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 2 }}>
                Source
              </div>
              <div style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".88rem", color: "var(--forest)", fontStyle: "italic" }}>
                {fatwa.source}
              </div>
            </div>
          </div>
          <p style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".72rem", color: "var(--muted-foreground)", textAlign: "center" }}>
            Reviewed by the Darul Iftā · Jamiatul Ulama Johannesburg
          </p>
          <p style={{ marginTop: 6, fontFamily: "var(--font-arabic-stack)", direction: "rtl", color: "var(--gold)", fontSize: ".9rem", textAlign: "center" }}>
            وَمَا عَلَيْنَا إِلَّا الْبَلَاغُ الْمُبِينُ
          </p>
        </footer>
      </article>
    </div>
  );
}

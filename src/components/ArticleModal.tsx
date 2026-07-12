"use client";
import { X, BookOpen, Quote } from "lucide-react";
import { useEffect } from "react";
import type { Article } from "./ArticleGrid";

export default function ArticleModal({ article, onClose }: { article: Article | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && article) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [article, onClose]);
  if (!article) return null;

  const paragraphs = article.body.split(/\n\n+/).filter(p => p.trim());
  const wordCount = article.body.split(/\s+/).filter(w => w.length > 0).length;
  const readingTime = Math.max(1, Math.round(wordCount / 200));
  // Find the index of the first non-Arabic paragraph > 80 chars (for drop-cap)
  const firstEnglishIdx = paragraphs.findIndex(p => {
    const trimmed = p.trim();
    const arabicChars = (trimmed.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
    const totalChars = trimmed.replace(/\s/g, "").length;
    const isArabic = totalChars > 0 && arabicChars / totalChars > 0.5;
    return !isArabic && !/^Q\s*[:.]/i.test(trimmed) && !/^A\s*[:.]/i.test(trimmed) && trimmed.length > 80;
  });

  // Category color mapping
  const catColors: Record<string, string> = {
    "Fiqh": "#2E6E6A", "Ṣalāh": "#2E6E6A", "Zakāh": "#B08D4C", "Qurbāni": "#B08D4C",
    "Akhlāq": "#7A2E2E", "Bid'ah": "#7A2E2E", "Current Affairs": "#455A64",
  };
  const catColor = catColors[article.catLabel] || "#2E6E6A";

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "radial-gradient(ellipse at center, rgba(15,26,35,.82) 0%, rgba(8,16,22,.95) 100%)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "3vh 12px", overflowY: "auto",
    }}>
      <div onClick={e => e.stopPropagation()} className="scroll-article-enter" style={{
        position: "relative", maxWidth: 860, width: "100%", margin: "0 auto",
      }}>
        {/* ─── Top scroll roll ─── */}
        <div style={{
          height: 16,
          background: "linear-gradient(180deg, #8B6914 0%, #B08D4C 35%, #C9A85E 50%, #B08D4C 65%, #8B6914 100%)",
          borderRadius: "8px 8px 0 0",
          boxShadow: "0 4px 16px rgba(0,0,0,.4), inset 0 1px 2px rgba(255,255,255,.15)",
          position: "relative",
        }}>
          <div style={{ position: "absolute", left: -5, top: -3, width: 22, height: 22, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #E8D8A8, #B08D4C, #8B6914)", boxShadow: "0 3px 6px rgba(0,0,0,.3)" }} />
          <div style={{ position: "absolute", right: -5, top: -3, width: 22, height: 22, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #E8D8A8, #B08D4C, #8B6914)", boxShadow: "0 3px 6px rgba(0,0,0,.3)" }} />
        </div>

        {/* ─── Scroll body ─── */}
        <div style={{
          background: `
            radial-gradient(ellipse at 15% 5%, rgba(176,141,76,.05) 0%, transparent 45%),
            radial-gradient(ellipse at 85% 95%, rgba(46,110,106,.03) 0%, transparent 45%),
            linear-gradient(180deg, #F5EFE0 0%, #F1E9D8 100%)
          `,
          borderLeft: "1px solid rgba(176,141,76,.25)",
          borderRight: "1px solid rgba(176,141,76,.25)",
          boxShadow: "0 12px 48px rgba(0,0,0,.4)",
          position: "relative",
        }}>
          {/* Inner decorative border */}
          <div style={{ position: "absolute", top: 10, left: 10, right: 10, bottom: 10, border: "1px solid rgba(176,141,76,.2)", borderRadius: 2, pointerEvents: "none" }} />

          {/* Close button */}
          <button onClick={onClose} aria-label="Close" style={{
            position: "absolute", top: 18, right: 18,
            width: 34, height: 34, borderRadius: "50%",
            background: "rgba(176,141,76,.1)", border: "1px solid rgba(176,141,76,.3)",
            color: "#1B2A38", cursor: "pointer", zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background .2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(176,141,76,.25)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(176,141,76,.1)"}
          ><X size={15} /></button>

          {/* ─── Header ─── */}
          <header style={{ padding: "32px 44px 16px", textAlign: "center" }}>
            {/* Category badge + date + reading time */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{
                fontFamily: "var(--font-sans-stack)", fontSize: ".58rem", letterSpacing: ".16em",
                textTransform: "uppercase", fontWeight: 700, color: catColor,
                padding: "3px 10px", border: `1px solid ${catColor}44`, borderRadius: 2,
                background: `${catColor}0a`,
              }}>{article.catLabel}</span>
              <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: ".62rem", color: "#8A8578" }}>{article.date}</span>
              <span style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".58rem", color: "#B08D4C", letterSpacing: ".06em", display: "inline-flex", alignItems: "center", gap: 3 }}>
                <BookOpen size={10} /> {readingTime} min read
              </span>
            </div>

            {/* Title — display serif, large, ink-navy */}
            <h1 style={{
              fontFamily: "var(--font-display-stack)", fontSize: "1.7rem", fontWeight: 600,
              color: "#1B2A38", lineHeight: 1.28, margin: "0 30px",
              letterSpacing: ".005em",
              textShadow: "0 1px 0 rgba(255,255,255,.4)",
            }}>{article.title}</h1>

            <ScrollDivider />
          </header>

          {/* ─── Body ─── */}
          <div style={{
            padding: "0 48px 24px",
            fontFamily: "var(--font-serif-stack)",
            fontSize: "1.05rem",
            color: "#2A2622",
            lineHeight: 1.95,
            textAlign: "justify",
            hyphens: "auto",
          }}>
            {paragraphs.map((para, i) => {
              const trimmed = para.trim();

              // ─── Arabic paragraph detection ───
              // If >60% of characters are Arabic, render as an Arabic verse/hadith block
              const arabicChars = (trimmed.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
              const totalChars = trimmed.replace(/\s/g, "").length;
              const isArabic = totalChars > 0 && arabicChars / totalChars > 0.5;

              // ─── Arabic verse/hadith block ───
              if (isArabic) {
                return (
                  <div key={i} style={{
                    marginBottom: 18, marginTop: i > 0 ? 4 : 0,
                    padding: "16px 20px",
                    background: "linear-gradient(135deg, rgba(46,110,106,.05), rgba(176,141,76,.04))",
                    border: "1px solid rgba(176,141,76,.12)",
                    borderRadius: 4,
                    textAlign: "center",
                  }}>
                    <p style={{
                      fontFamily: "var(--font-arabic-stack)",
                      direction: "rtl",
                      fontSize: "1.35rem",
                      color: "#1B2A38",
                      lineHeight: 2.0,
                      margin: 0,
                      letterSpacing: ".01em",
                    }} lang="ar">{trimmed}</p>
                  </div>
                );
              }

              // Q&A question
              if (/^Q\s*[:.]/i.test(trimmed)) {
                return (
                  <div key={i} style={{
                    marginBottom: 16,
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, rgba(46,110,106,.06), rgba(46,110,106,.02))",
                    borderLeft: `3px solid ${catColor}`,
                    borderRadius: "0 4px 4px 0",
                  }}>
                    <div style={{
                      fontFamily: "var(--font-sans-stack)", fontSize: ".58rem", letterSpacing: ".16em",
                      textTransform: "uppercase", color: catColor, fontWeight: 700, marginBottom: 4,
                    }}>Question</div>
                    <p style={{
                      fontFamily: "var(--font-display-stack)", fontSize: "1.05rem", fontWeight: 600,
                      color: "#1B2A38", lineHeight: 1.6, margin: 0,
                    }}>{trimmed.replace(/^Q\s*[:.]\s*/i, "")}</p>
                  </div>
                );
              }

              // Q&A answer
              if (/^A\s*[:.]/i.test(trimmed)) {
                return (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{
                      fontFamily: "var(--font-sans-stack)", fontSize: ".58rem", letterSpacing: ".16em",
                      textTransform: "uppercase", color: "#B08D4C", fontWeight: 700, marginBottom: 6,
                    }}>Answer</div>
                    <p style={{ margin: 0, lineHeight: 1.95, fontSize: "1.02rem" }}>
                      {trimmed.replace(/^A\s*[:.]\s*/i, "")}
                    </p>
                  </div>
                );
              }

              // Section heading — short, no punctuation, follows a sentence-ending paragraph
              // Skip if Arabic (already handled above) or if it's a Q&A format
              const isHeading = !isArabic && trimmed.length < 120 && !trimmed.endsWith('.') && !trimmed.endsWith(':') && !trimmed.endsWith('?') && !trimmed.endsWith('!') && !trimmed.endsWith('"') && !trimmed.endsWith(')') && (i === 0 || paragraphs[i-1].trim().endsWith('.') || paragraphs[i-1].trim().endsWith(':') || paragraphs[i-1].trim().endsWith('!') || paragraphs[i-1].trim().endsWith('"'));
              if (isHeading && trimmed.length > 8) {
                return (
                  <div key={i} style={{
                    marginBottom: 14, marginTop: i > 0 ? 18 : 0,
                    textAlign: "center",
                  }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "4px 0",
                    }}>
                      <div style={{ width: 20, height: 1, background: catColor, opacity: .4 }} />
                      <h3 style={{
                        fontFamily: "var(--font-display-stack)", fontSize: "1.05rem", fontWeight: 600,
                        color: catColor, margin: 0, letterSpacing: ".02em",
                      }}>{trimmed}</h3>
                      <div style={{ width: 20, height: 1, background: catColor, opacity: .4 }} />
                    </div>
                  </div>
                );
              }

              // Regular paragraph — with drop-cap on first NON-Arabic paragraph
              const isFirstEnglish = i === firstEnglishIdx;
              if (isFirstEnglish) {
                return (
                  <p key={i} style={{ marginBottom: 14, lineHeight: 1.95 }}>
                    <span style={{
                      float: "left",
                      fontFamily: "var(--font-display-stack)",
                      fontSize: "3.4rem", fontWeight: 700,
                      color: catColor, lineHeight: .82,
                      paddingRight: 8, paddingTop: 4, marginRight: 2,
                    }}>{trimmed[0]}</span>
                    {trimmed.slice(1)}
                  </p>
                );
              }

              // Regular paragraph
              return <p key={i} style={{ marginBottom: 14, lineHeight: 1.95 }}>{trimmed}</p>;
            })}
          </div>

          {/* ─── Footer ─── */}
          <footer style={{
            padding: "14px 48px 24px",
            borderTop: "1px solid rgba(176,141,76,.15)",
            textAlign: "center",
          }}>
            <ScrollDivider small />

            {/* Organisation seal */}
            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 3, marginTop: 8 }}>
              <div style={{
                fontFamily: "var(--font-sans-stack)", fontSize: ".62rem", letterSpacing: ".14em",
                textTransform: "uppercase", color: "#B08D4C", fontWeight: 600,
              }}>Jamiatul Ulama Johannesburg</div>
              <div style={{
                fontFamily: "var(--font-arabic-stack)", direction: "rtl",
                color: "#1B2A38", fontSize: ".92rem",
              }}>جمعية العلماء جوهانسبرغ</div>
              <div style={{
                fontFamily: "var(--font-sans-stack)", fontSize: ".56rem", color: "#8A8578",
                letterSpacing: ".06em", marginTop: 2,
              }}>Reviewed by the Darul Iftā · {wordCount.toLocaleString()} words</div>
            </div>

            {/* Closing ayah */}
            <div style={{
              marginTop: 12, padding: "10px 20px",
              background: "linear-gradient(135deg, rgba(46,110,106,.04), rgba(176,141,76,.04))",
              borderRadius: 4, display: "inline-block",
            }}>
              <div style={{
                fontFamily: "var(--font-arabic-stack)", direction: "rtl",
                color: "#1B2A38", fontSize: "1.1rem", lineHeight: 1.6,
              }}>وَمَا عَلَيْنَا إِلَّا الْبَلَاغُ الْمُبِينُ</div>
              <div style={{
                fontFamily: "var(--font-serif-stack)", fontStyle: "italic",
                fontSize: ".7rem", color: "#5A5750", marginTop: 3,
              }}>"Clear propagation is our only responsibility." — Sūrah Yāsīn 36:17</div>
            </div>
          </footer>
        </div>

        {/* ─── Bottom scroll roll ─── */}
        <div style={{
          height: 16,
          background: "linear-gradient(180deg, #8B6914 0%, #B08D4C 35%, #C9A85E 50%, #B08D4C 65%, #8B6914 100%)",
          borderRadius: "0 0 8px 8px",
          boxShadow: "0 -2px 8px rgba(0,0,0,.2), inset 0 1px 2px rgba(255,255,255,.15)",
          position: "relative",
        }}>
          <div style={{ position: "absolute", left: -5, bottom: -3, width: 22, height: 22, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #E8D8A8, #B08D4C, #8B6914)", boxShadow: "0 3px 6px rgba(0,0,0,.3)" }} />
          <div style={{ position: "absolute", right: -5, bottom: -3, width: 22, height: 22, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #E8D8A8, #B08D4C, #8B6914)", boxShadow: "0 3px 6px rgba(0,0,0,.3)" }} />
        </div>
      </div>
    </div>
  );
}

function ScrollDivider({ small = false }: { small?: boolean }) {
  const sz = small ? 7 : 11, gap = small ? 8 : 14, lw = small ? 50 : 70;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap, margin: small ? "10px 0" : "16px 0" }}>
      <div style={{ height: 1, width: lw, background: "linear-gradient(90deg, transparent, rgba(176,141,76,.4), rgba(176,141,76,.7))" }} />
      <div style={{ width: sz, height: sz, background: "#B08D4C", clipPath: "polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)", opacity: .7 }} />
      <div style={{ width: sz * 1.4, height: sz * 1.4, background: "#C9A85E", clipPath: "polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" }} />
      <div style={{ width: sz, height: sz, background: "#B08D4C", clipPath: "polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)", opacity: .7 }} />
      <div style={{ height: 1, width: lw, background: "linear-gradient(90deg, rgba(176,141,76,.7), rgba(176,141,76,.4), transparent)" }} />
    </div>
  );
}

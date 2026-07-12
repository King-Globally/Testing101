"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Search, Send, HelpCircle } from "lucide-react";
import ImagePlaceholder, { CATEGORY_ICONS } from "./ImagePlaceholder";

export interface Fatwa { id: number; q: string; cat: string; answer: string; source: string; imageUrl?: string; }

const FATWA_CATS = ["all","Zakāh","Ṣawm (Fasting)","Iʿtikāf","Bidʿah","Ḥalāl & Ḥarām"];

export default function FatwaList({ initial, onSubmitQuestion, onOpenFatwa }: { initial: Fatwa[]; onSubmitQuestion: (q: string) => void; onOpenFatwa?: (f: Fatwa) => void }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const filtered = initial.filter(f => {
    const matchCat = filter === "all" || f.cat === filter;
    const q = query.toLowerCase().trim();
    const matchQ = !q || f.q.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const handleFatwaClick = (f: Fatwa) => {
    // If a modal handler is provided, open the modal instantly.
    // Otherwise, fall back to inline expand/collapse.
    if (onOpenFatwa) {
      onOpenFatwa(f);
    } else {
      setOpenId(openId === f.id ? null : f.id);
    }
  };

  return (
    <div>
      <div className="archive-search" style={{ marginBottom: 12 }}>
        <input
          className="input-parch"
          type="text"
          placeholder="Search fatwas by keyword or category…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {FATWA_CATS.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`chip ${filter === c ? "active" : ""}`}>
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--muted-foreground)", padding: 20, fontFamily: "var(--font-sans-stack)", fontSize: ".9rem" }}>
            No fatwas match your search. Try a different keyword.
          </p>
        )}
        {filtered.map(f => {
          const open = openId === f.id;
          return (
            <div key={f.id} className="scard glow-on-hover" style={{ cursor: "pointer" }} onClick={() => handleFatwaClick(f)}>
              <div className="sbody" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <ImagePlaceholder mode="icon" icon={CATEGORY_ICONS[f.cat] || HelpCircle} slotId={`fatwa-${f.id}-cat-icon`} iconSize={20} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span className="tag" style={{ background: "rgba(184,146,30,.18)", color: "var(--forest)" }}>{f.cat}</span>
                      <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: ".65rem", color: "var(--muted-foreground)" }}>
                        № {String(f.id + 1).padStart(3, "0")}
                      </span>
                    </div>
                    <h4 style={{ fontFamily: "var(--font-serif-stack)", fontSize: "1rem", fontWeight: 600, color: "var(--forest)", lineHeight: 1.4, marginBottom: 4 }}>
                      {f.q}
                    </h4>
                    {!open && (
                      <p style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".85rem", color: "var(--ink-mid)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {f.answer}
                      </p>
                    )}
                  </div>
                  {open ? <ChevronUp size={16} style={{ color: "var(--gold)", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "var(--gold)", flexShrink: 0 }} />}
                </div>
                {open && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--parch-dark)" }}>
                    <p style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".92rem", color: "var(--ink)", lineHeight: 1.7 }}>
                      {f.answer}
                    </p>
                    <p style={{ marginTop: 10, fontFamily: "var(--font-sans-stack)", fontSize: ".72rem", color: "var(--gold)", letterSpacing: ".05em" }}>
                      Source: {f.source}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setFormOpen(s => !s)}
        className="chip active"
        style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 8 }}
      >
        <Send size={14} /> Submit a Question to the Darul Iftā
      </button>
      {formOpen && (
        <div className="scard" style={{ marginTop: 12 }}>
          <div className="sbody">
            <textarea
              className="input-parch"
              rows={4}
              placeholder="Type your question for the Darul Iftā. Provide as much context as possible."
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />
            <button
              onClick={() => { onSubmitQuestion(draft); setDraft(""); setFormOpen(false); }}
              className="chip active"
              style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
              disabled={!draft.trim()}
            >
              <Send size={14} /> Send Question
            </button>
            <p style={{ marginTop: 10, fontFamily: "var(--font-sans-stack)", fontSize: ".72rem", color: "var(--muted-foreground)" }}>
              For urgent matters, WhatsApp +27 786 786 713 (Q&A only — no calls).
              All questions are reviewed by qualified 'Ulamā of the Darul Iftā.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

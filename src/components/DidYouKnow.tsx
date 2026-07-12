"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Dyk { id: number; text: string; }

export default function DidYouKnow({ initial }: { initial: Dyk[] }) {
  const [idx, setIdx] = useState(0);
  const [list] = useState(initial);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % list.length), 11000);
    return () => clearInterval(t);
  }, [list.length]);

  if (!list.length) return null;
  const cur = list[idx];

  return (
    <div className="scard arch-frame">
      <div className="shead">
        <span>Did You Know</span>
        <span className="ar">هل تعلم</span>
      </div>
      <div className="sbody">
        <p style={{
          fontFamily: "var(--font-serif-stack)",
          fontSize: ".9rem",
          lineHeight: 1.65,
          color: "var(--ink-mid)",
          fontStyle: "italic",
          minHeight: 110,
        }}>"{cur.text.replace(/^"|"$/g, "")}"</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <button onClick={() => setIdx(i => (i - 1 + list.length) % list.length)} className="chip" aria-label="Previous" style={{ padding: "4px 8px" }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".7rem", color: "var(--muted-foreground)", letterSpacing: ".06em" }}>
            {idx + 1} / {list.length}
          </span>
          <button onClick={() => setIdx(i => (i + 1) % list.length)} className="chip" aria-label="Next" style={{ padding: "4px 8px" }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

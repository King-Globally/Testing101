"use client";
import { useState, useEffect } from "react";
import { RotateCcw, Save } from "lucide-react";

/**
 * TasbihCounter — digital dhikr counter.
 * - Three classic dhikr formulas (Subḥān-Allāh, Alḥamdulillāh, Allāhu Akbar).
 * - Click anywhere in the counter area (or press Space) to increment.
 * - Cycles through 33 / 99 / 0 (reset) on completing 33.
 * - Persisted total to localStorage.
 */

const DHIKR_OPTIONS = [
  { arabic: "سُبْحَانَ اللَّه", latin: "Subḥān-Allāh",  meaning: "Glory be to Allah" },
  { arabic: "الْحَمْدُ لِلَّه", latin: "Alḥamdulillāh",   meaning: "All praise is for Allah" },
  { arabic: "اللَّهُ أَكْبَر",  latin: "Allāhu Akbar",   meaning: "Allah is the Greatest" },
  { arabic: "لَا إِلَهَ إِلَّا اللَّه", latin: "Lā ilāha illā-Llāh", meaning: "There is no god but Allah" },
  { arabic: "أَسْتَغْفِرُ اللَّه", latin: "Astaghfirullāh", meaning: "I seek Allah's forgiveness" },
  { arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّد", latin: "Ṣalawāt", meaning: "Blessings upon the Prophet ﷺ" },
];

const STORAGE_KEY = "jamiat.joburg.tasbih.v1";

export default function TasbihCounter() {
  // Always start with defaults (0) on both server and first client render
  // to guarantee hydration matching. Read from localStorage in an effect
  // after mount.
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);

  // Read persisted values from localStorage after mount (client-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage read on mount (hydration-safe pattern)
        if (typeof parsed.total === "number") setTotal(parsed.total);
        if (typeof parsed.idx === "number") setIdx(parsed.idx);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist on changes
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ total, idx })); } catch { /* ignore */ }
  }, [total, idx]);

  // Increment logic — defined as a useCallback so the keydown handler is stable.
  const increment = () => {
    setCount(c => {
      const next = c + 1;
      if (next >= 33) {
        setTotal(t => t + 33);
        return 0;
      }
      setTotal(t => t + 1);
      return next;
    });
  };

  // Spacebar to increment when this card is in focus / hovered
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && document.activeElement?.closest("[data-tasbih-card]")) {
        e.preventDefault();
        increment();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // empty deps — increment is stable via closure over setCount/setTotal

  const reset = () => {
    setCount(0);
  };

  const resetTotal = () => {
    if (confirm("Reset total dhikr count? This cannot be undone.")) {
      setTotal(0);
      setCount(0);
    }
  };

  const dhikr = DHIKR_OPTIONS[idx];
  const progress = (count / 33) * 100;

  return (
    <div className="scard" data-tasbih-card tabIndex={0}>
      <div className="shead">
        <span>Tasbih Counter</span>
        <span className="ar">المسبحة</span>
      </div>
      <div className="sbody" style={{ textAlign: "center" }}>
        {/* Dhikr selector */}
        <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {DHIKR_OPTIONS.map((d, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); setCount(0); }}
              className={`chip ${i === idx ? "active" : ""}`}
              style={{ padding: "4px 8px", fontSize: ".7rem" }}
              title={d.meaning}
            >
              {d.latin}
            </button>
          ))}
        </div>

        {/* Dhikr display */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "var(--font-arabic-stack)", direction: "rtl", fontSize: "1.5rem", color: "var(--forest)", lineHeight: 1.4 }}>
            {dhikr.arabic}
          </div>
          <div style={{ fontFamily: "var(--font-serif-stack)", fontStyle: "italic", fontSize: ".8rem", color: "var(--muted-foreground)" }}>
            {dhikr.meaning}
          </div>
        </div>

        {/* Counter button */}
        <button
          onClick={increment}
          style={{
            width: 140, height: 140,
            borderRadius: "50%",
            border: "3px solid var(--gold)",
            background: `radial-gradient(circle, var(--parch-warm) 0%, var(--parch-dark) 100%)`,
            cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            margin: "0 auto 10px",
            boxShadow: "0 4px 12px rgba(11,61,46,.15), inset 0 0 0 1px rgba(184,146,30,.3)",
            transition: "transform .1s, box-shadow .15s",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseDown={e => { e.currentTarget.style.transform = "scale(.96)"; }}
          onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          aria-label="Increment dhikr counter"
        >
          {/* Progress ring */}
          <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="64" fill="none" stroke="var(--gold)" strokeWidth="3" strokeDasharray={`${(progress/100)*402} 402`} strokeLinecap="round" opacity="0.6" />
          </svg>
          <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: "2.4rem", fontWeight: 700, color: "var(--forest)", lineHeight: 1, position: "relative" }}>
            {count}
          </div>
          <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".65rem", color: "var(--muted-foreground)", letterSpacing: ".08em", marginTop: 2, position: "relative" }}>
            / 33
          </div>
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--font-sans-stack)", fontSize: ".72rem", color: "var(--ink-mid)", marginBottom: 8 }}>
          <span>Total: <strong style={{ color: "var(--forest)" }}>{total.toLocaleString()}</strong></span>
          <button onClick={reset} className="chip" style={{ padding: "3px 8px" }}>
            <RotateCcw size={11} /> Reset
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          <button onClick={resetTotal} className="chip" style={{ padding: "3px 10px", fontSize: ".68rem" }}>
            Reset Total
          </button>
        </div>

        <p style={{ marginTop: 8, fontFamily: "var(--font-sans-stack)", fontSize: ".65rem", color: "var(--muted-foreground)", lineHeight: 1.4 }}>
          Click the counter or press <kbd style={{ padding: "1px 4px", border: "1px solid var(--parch-dark)", borderRadius: 2, fontSize: ".6rem" }}>Space</kbd> when focused.
        </p>
        <p style={{ fontFamily: "var(--font-arabic-stack)", direction: "rtl", color: "var(--gold)", fontSize: ".85rem", marginTop: 6 }}>
          كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ
        </p>
      </div>
    </div>
  );
}

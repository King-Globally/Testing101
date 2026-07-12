"use client";
import { useState, useMemo } from "react";
import { Search, X, BookOpen, ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";
import ImagePlaceholder from "./ImagePlaceholder";

export interface Article {
  id: number; title: string; cat: string; catLabel: string; date: string; excerpt: string; body: string; imageUrl?: string;
}

const ARTICLE_CATS = [
  { key: "all", label: "All" }, { key: "fiqh", label: "Fiqh" }, { key: "salah", label: "Ṣalāh" },
  { key: "zakah", label: "Zakāh" }, { key: "qurbani", label: "Qurbāni" }, { key: "akhlaq", label: "Akhlāq" },
  { key: "bidah", label: "Bid'ah" }, { key: "current", label: "Current Affairs" },
];

function parseDate(s: string): number { if (!s || s === "—") return 0; const t = Date.parse(s); if (!isNaN(t)) return t; const c = s.replace(/(\d{1,2})(st|nd|rd|th)/g, "$1").trim(); const t2 = Date.parse(c); return isNaN(t2) ? 0 : t2; }

export default function ArticleGrid({ initial, onOpenArticle }: { initial: Article[]; onOpenArticle: (a: Article) => void }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const filtered = useMemo(() => {
    const result = initial.filter(a => {
      const matchCat = filter === "all" || a.cat === filter;
      const q = query.toLowerCase().trim();
      const matchQ = !q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q) || a.catLabel.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
    result.sort((a, b) => { const tA = parseDate(a.date); const tB = parseDate(b.date); if (tA === 0 && tB === 0) return b.id - a.id; if (tA === 0) return 1; if (tB === 0) return -1; return sortDir === "desc" ? tB - tA : tA - tB; });
    return result;
  }, [initial, filter, query, sortDir]);

  return (
    <div>
      <div className="archive-search" style={{ marginBottom: 12, position: "relative" }}>
        <input className="input-parch" type="text" placeholder="Search articles by title or topic…" value={query} onChange={e => setQuery(e.target.value)} style={{ paddingLeft: 36, paddingRight: 36 }} />
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
        {query && <button onClick={() => setQuery("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}><X size={14} /></button>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16, alignItems: "center" }}>
        {ARTICLE_CATS.map(c => <button key={c.key} onClick={() => setFilter(c.key)} className={`chip ${filter === c.key ? "active" : ""}`}>{c.label}</button>)}
        <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")} className="chip" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, background: sortDir === "desc" ? "rgba(184,146,30,.12)" : "rgba(11,61,46,.08)", borderColor: sortDir === "desc" ? "var(--gold)" : "var(--forest)", color: sortDir === "desc" ? "var(--gold)" : "var(--forest)", fontWeight: 600 }}>
          {sortDir === "desc" ? <ArrowDownWideNarrow size={13} /> : <ArrowUpWideNarrow size={13} />}
          {sortDir === "desc" ? "Latest First" : "Oldest First"}
        </button>
      </div>
      <div style={{ marginBottom: 10, fontFamily: "var(--font-sans-stack)", fontSize: ".72rem", color: "var(--muted-foreground)", letterSpacing: ".04em" }}>
        Showing {filtered.length} article{filtered.length !== 1 ? "s" : ""}{filter !== "all" && ` in ${ARTICLE_CATS.find(c => c.key === filter)?.label}`}{query && ` matching "${query}"`}{" · "}{sortDir === "desc" ? "Newest → Oldest" : "Oldest → Newest"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }} className="article-grid">
        {filtered.length === 0 && <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--muted-foreground)", padding: 32, fontFamily: "var(--font-sans-stack)", fontSize: ".9rem" }}>No articles match your search. Try a different keyword.</p>}
        {filtered.map(a => (
          <div key={a.id} className="scard glow-on-hover clickable" style={{ cursor: "pointer", padding: 0 }} onClick={() => onOpenArticle(a)}>
            <ImagePlaceholder mode="photo" src={a.imageUrl} alt={a.title} slotId={`article-${a.id}-grid`} ratio="16:9" />
            <div className="sbody" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className="tag">{a.catLabel}</span>
                <span style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".65rem", color: "var(--muted-foreground)", letterSpacing: ".06em" }}>{a.date}</span>
              </div>
              <h4 style={{ fontFamily: "var(--font-serif-stack)", fontSize: "1.02rem", fontWeight: 600, color: "var(--forest)", lineHeight: 1.35, marginBottom: 8 }}>{a.title}</h4>
              <p style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".85rem", color: "var(--ink-mid)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.excerpt}</p>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, color: "var(--gold)", fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", letterSpacing: ".04em" }}><BookOpen size={12} /> Read full article</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

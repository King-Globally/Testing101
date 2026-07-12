"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import type { Article } from "./ArticleGrid";
import type { Fatwa } from "./FatwaList";
import type { DownloadItem } from "./DownloadsGrid";
import type { SearchResult } from "@/types/content";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  articles: Article[];
  fatwas: Fatwa[];
  downloads: DownloadItem[];
  onOpenArticle: (a: Article) => void;
  onOpenFatwa: (f: Fatwa) => void;
  onNavigate: (page: string) => void;
}

export default function SearchOverlay({ open, onClose, articles, fatwas, downloads, onOpenArticle, onOpenFatwa, onNavigate }: SearchOverlayProps) {
  return open ? (
    <SearchOverlayInner
      key={Date.now()}
      onClose={onClose}
      articles={articles}
      fatwas={fatwas}
      downloads={downloads}
      onOpenArticle={onOpenArticle}
      onOpenFatwa={onOpenFatwa}
      onNavigate={onNavigate}
    />
  ) : null;
}

function SearchOverlayInner({ onClose, articles, fatwas, downloads, onOpenArticle, onOpenFatwa, onNavigate }: Omit<SearchOverlayProps, "open">) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Debounced server-side search with diacritic folding
  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`);
      const d = await r.json();
      if (d?.success) {
        setResults(d.results);
      }
    } catch {
      // Fallback to client-side search
      const nQ = q.toLowerCase().trim();
      const clientResults: SearchResult[] = [];
      for (const a of articles) {
        if (a.title.toLowerCase().includes(nQ) || a.excerpt.toLowerCase().includes(nQ)) {
          clientResults.push({ type: "article", id: a.id, title: a.title, excerpt: a.excerpt, meta: a.catLabel, score: 50 });
        }
      }
      for (const f of fatwas) {
        if (f.q.toLowerCase().includes(nQ) || f.answer.toLowerCase().includes(nQ)) {
          clientResults.push({ type: "fatwa", id: f.id, title: f.q, excerpt: f.answer.slice(0, 200), meta: f.cat, score: 50 });
        }
      }
      for (const dl of downloads) {
        if (dl.title.toLowerCase().includes(nQ) || dl.desc.toLowerCase().includes(nQ)) {
          clientResults.push({ type: "download", id: dl.id, title: dl.title, excerpt: dl.desc, meta: dl.catLabel, score: 50 });
        }
      }
      setResults(clientResults.slice(0, 18));
    } finally {
      setLoading(false);
    }
  }, [articles, fatwas, downloads]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const typeLabels: Record<string, string> = {
    article: "Articles", fatwa: "Fatwas", download: "Downloads",
    announcement: "Announcements", hadith: "Ahādīth", dyk: "Did You Know",
    link: "Useful Links",
  };

  const handleResultClick = (r: SearchResult) => {
    if (r.type === "article") {
      const a = articles.find(a => a.id === r.id);
      if (a) onOpenArticle(a);
    } else if (r.type === "fatwa") {
      const f = fatwas.find(f => f.id === r.id);
      if (f) onOpenFatwa(f);
      else onNavigate("fatwas");
    } else if (r.type === "download") {
      const d = downloads.find(d => d.id === r.id);
      if (d) window.open(`/api/download?file=${encodeURIComponent(d.filename)}&title=${encodeURIComponent(d.title)}`);
    } else if (r.type === "announcement") {
      onNavigate("announcements");
    } else if (r.type === "hadith") {
      onNavigate("home");
    }
    onClose();
  };

  const q = query.toLowerCase().trim();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(11,41,32,.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "8vh 16px 16px", overflowY: "auto",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--parchment)", border: "1px solid var(--gold)",
          borderRadius: 6, maxWidth: 720, width: "100%",
          boxShadow: "0 12px 48px rgba(0,0,0,.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--parch-dark)" }}>
          <Search size={16} style={{ color: "var(--gold)" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search fatwas, articles, downloads, announcements, ahādīth…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontFamily: "var(--font-serif-stack)", fontSize: "1rem", color: "var(--ink)",
            }}
          />
          {loading && <span style={{ fontSize: ".7rem", color: "var(--muted-foreground)" }}>…</span>}
          <button onClick={onClose} className="chip" style={{ padding: "4px 8px" }}>
            <X size={14} /> Close
          </button>
        </div>
        <div style={{ maxHeight: "60vh", overflowY: "auto" }} className="scroll-area">
          {!q && (
            <p style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontFamily: "var(--font-sans-stack)", fontSize: ".85rem" }}>
              Start typing to search the entire site — articles, fatwas, downloads, announcements, ahādīth, and more…
            </p>
          )}
          {q && !loading && results.length === 0 && (
            <p style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontFamily: "var(--font-sans-stack)", fontSize: ".85rem" }}>
              No results found for &ldquo;{query}&rdquo;.
            </p>
          )}
          {Object.entries(grouped).map(([type, items]) => items.length > 0 && (
            <div key={type} style={{ padding: "12px 16px", borderTop: "1px solid var(--parch-dark)" }}>
              <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 8 }}>
                {typeLabels[type] || type}
              </div>
              {items.map(r => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleResultClick(r)}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px 10px", borderRadius: 3, cursor: "pointer", fontFamily: "var(--font-serif-stack)" }}
                  className="search-result-item"
                >
                  <div style={{ fontWeight: 600, color: "var(--forest)", fontSize: ".92rem" }}>{r.title}</div>
                  <div style={{ fontSize: ".78rem", color: "var(--muted-foreground)", marginTop: 2, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {r.excerpt.slice(0, 120)}{r.excerpt.length > 120 ? "…" : ""}
                  </div>
                  {r.meta && <div style={{ fontSize: ".7rem", color: "var(--gold)", marginTop: 2 }}>{r.meta}</div>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { Search, Download, X, FileText } from "lucide-react";
import ImagePlaceholder from "./ImagePlaceholder";

export interface DownloadItem {
  id: number;
  title: string;
  cat: string;
  catLabel: string;
  meta: string;
  desc: string;
  filename: string;
  coverUrl?: string;
}

const DOWNLOAD_CATS = [
  { key: "all", label: "All" },
  { key: "fiqh", label: "Fiqh" },
  { key: "salah", label: "Ṣalāh" },
  { key: "zakah", label: "Zakāh" },
  { key: "urdu", label: "Urdu" },
];

export default function DownloadsGrid({ initial }: { initial: DownloadItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = initial.filter(d => {
    const matchCat = filter === "all" || d.cat === filter;
    const q = query.toLowerCase().trim();
    const matchQ = !q || d.title.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q) || d.catLabel.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return (
    <div>
      <div className="archive-search" style={{ marginBottom: 12, position: "relative" }}>
        <input
          className="input-parch"
          type="text"
          placeholder="Search downloads…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ paddingLeft: 36, paddingRight: 36 }}
        />
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}>
            <X size={14} />
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {DOWNLOAD_CATS.map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)} className={`chip ${filter === c.key ? "active" : ""}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {filtered.length === 0 && (
          <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--muted-foreground)", padding: 32, fontFamily: "var(--font-sans-stack)", fontSize: ".9rem" }}>
            No downloads match your search.
          </p>
        )}
        {filtered.map(d => (
          <div key={d.id} className="scard glow-on-hover" style={{ padding: 0 }}>
            <ImagePlaceholder mode="photo" src={d.coverUrl} alt={d.title} slotId={`download-${d.id}-cover`} ratio="4:3" />
            <div className="sbody" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className="tag">{d.catLabel}</span>
                <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: ".65rem", color: "var(--muted-foreground)" }}>{d.meta}</span>
              </div>
              <h4 style={{ fontFamily: "var(--font-serif-stack)", fontSize: "1rem", fontWeight: 600, color: "var(--forest)", lineHeight: 1.35, marginBottom: 6 }}>
                {d.title}
              </h4>
              <p style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".84rem", color: "var(--ink-mid)", lineHeight: 1.55, marginBottom: 12 }}>
                {d.desc}
              </p>
              <a
                href={`/api/download?file=${encodeURIComponent(d.filename)}&title=${encodeURIComponent(d.title)}`}
                className="chip active"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
              >
                <Download size={12} /> Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

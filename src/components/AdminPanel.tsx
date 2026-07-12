"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import {
  X, Plus, Edit2, Trash2, Save, RefreshCw, ShieldCheck, FileText,
  BookOpen, Download, Bell, Sparkles, Clock, ScrollText, Loader2, Upload,
  Search, Bold, Italic, List, Quote, Eye, Type, Pilcrow, Lock, Mail, AlertTriangle, CheckCircle,
} from "lucide-react";

/**
 * AdminPanel — robust, user-friendly CRUD drawer for the editor.
 *
 * Features:
 *   - Schema-driven edit forms with rich text formatting toolbar
 *   - Live preview for articles and fatwas
 *   - Category dropdown populated from existing values (prevents typos)
 *   - Character counters with visual warnings
 *   - Search/filter within admin lists
 *   - Confirmation dialogs with item names
 *   - Auto-save draft to localStorage (prevents data loss)
 *   - Validation with helpful error messages
 *   - All mutations audit-logged
 *   - Session expiry auto-handling
 *
 * The admin can add/edit/delete content WITHOUT touching code.
 * The website design is preserved because content is stored as structured
 * data (not HTML), and the rendering components handle the presentation.
 */

type Tab = "articles" | "fatwas" | "downloads" | "announcements" | "hadiths" | "dyks" | "prayer" | "security" | "audit";

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: "articles",      label: "Articles",      icon: FileText },
  { id: "fatwas",        label: "Fatwas",        icon: BookOpen },
  { id: "downloads",     label: "Downloads",     icon: Download },
  { id: "announcements", label: "Announcements", icon: Bell },
  { id: "hadiths",       label: "Hadiths",       icon: ScrollText },
  { id: "dyks",          label: "Did You Know",  icon: Sparkles },
  { id: "prayer",        label: "Prayer Times",  icon: Clock },
  { id: "security",      label: "Security",      icon: Lock },
  { id: "audit",         label: "Audit Log",     icon: ShieldCheck },
];

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  onSessionExpired: () => void;
}

export default function AdminPanel({ open, onClose, onSessionExpired }: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>("articles");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${tab}`, { cache: "no-store" });
      if (res.status === 401) { onSessionExpired(); return; }
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      showToast("Network error while loading");
    } finally {
      setLoading(false);
    }
  }, [tab, onSessionExpired]);

  useEffect(() => {
    if (open) loadItems();
  }, [open, tab, loadItems]);

  const handleSave = async (payload: any, id?: number) => {
    try {
      const method = id ? "PUT" : "POST";
      const url = id ? `/api/admin/${tab}?id=${id}` : `/api/admin/${tab}`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { onSessionExpired(); return false; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || `Failed to save`);
        return false;
      }
      showToast(id ? "Saved successfully" : "Created successfully");
      setEditing(null);
      setCreating(false);
      await loadItems();
      return true;
    } catch {
      showToast("Network error");
      return false;
    }
  };

  const handleDelete = async (id: number) => {
    const item = items.find(i => i.id === id);
    const itemName = item?.title || item?.q || item?.text || item?.name || `#${id}`;
    if (!confirm(`Delete "${itemName.substring(0, 60)}${itemName.length > 60 ? "..." : ""}"?\n\nThis action is audit-logged and cannot be undone.`)) return;
    const res = await fetch(`/api/admin/${tab}?id=${id}`, { method: "DELETE" });
    if (res.status === 401) { onSessionExpired(); return; }
    if (!res.ok) { showToast("Delete failed"); return; }
    showToast("Deleted");
    await loadItems();
  };

  // Export current tab's data as JSON backup
  const handleExport = async (currentTab: Tab) => {
    try {
      const entity = currentTab === "prayer" ? "prayer" : currentTab;
      const res = await fetch(`/api/admin/exports?entity=${entity}`);
      if (res.status === 401) { onSessionExpired(); return; }
      if (!res.ok) { showToast("Export failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jamiat-${entity}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Exported");
    } catch {
      showToast("Export failed");
    }
  };

  const handleBulkImportClick = () => {
    setShowBulkImport(s => !s);
    if (!showBulkImport) setBulkImportText("");
  };

  const handleBulkImport = async (currentTab: Tab) => {
    if (!bulkImportText.trim()) { showToast("Paste JSON first"); return; }
    try {
      const parsed = JSON.parse(bulkImportText);
      if (!parsed.items || !Array.isArray(parsed.items)) {
        showToast("JSON must have 'items' array");
        return;
      }
      const res = await fetch(`/api/admin/${currentTab}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bulkImportText,
      });
      if (res.status === 401) { onSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        showToast(`Imported ${data.imported}, skipped ${data.skipped}`);
        setShowBulkImport(false);
        setBulkImportText("");
        await loadItems();
      } else {
        showToast(data.error || "Import failed");
      }
    } catch (e) {
      showToast("Invalid JSON: " + String(e));
    }
  };

  if (!open) return null;

  // Filter items by search query
  const filteredItems = searchQuery
    ? items.filter(item => {
        const q = searchQuery.toLowerCase();
        return Object.values(item).some(v =>
          String(v).toLowerCase().includes(q)
        );
      })
    : items;

  // Collect existing categories for dropdown suggestions
  const existingCategories = Array.from(new Set(
    items.map(i => i.cat).filter(Boolean)
  ));

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 150,
      display: "flex", justifyContent: "flex-end",
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(6,41,32,.55)", backdropFilter: "blur(3px)" }} />

      {/* Drawer */}
      <div style={{
        position: "relative", width: "min(1100px, 96vw)", height: "100vh",
        background: "var(--parchment)",
        borderLeft: "2px solid var(--gold)",
        boxShadow: "-12px 0 48px rgba(0,0,0,.3)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }} className="page-flip-enter">
        {/* Header */}
        <div style={{
          padding: "12px 20px",
          background: "linear-gradient(135deg, var(--ink-navy) 0%, var(--forest) 100%)",
          color: "var(--gold-pale)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--gold)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheck size={18} style={{ color: "var(--gold)" }} />
            <div>
              <div style={{ fontFamily: "var(--font-serif-stack)", fontSize: "1.05rem", fontWeight: 600 }}>
                Admin Panel
              </div>
              <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", opacity: .7 }}>
                Manage content — all changes are audit-logged
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => loadItems()} className="chip" style={{ color: "var(--gold-pale)", border: "1px solid var(--gold)", padding: "5px 10px" }}>
              <RefreshCw size={12} /> Refresh
            </button>
            <button onClick={onClose} className="chip" style={{ color: "var(--gold-pale)", border: "1px solid var(--gold)", padding: "5px 10px" }}>
              <X size={14} /> Close
            </button>
          </div>
        </div>

        {/* Tab sidebar + content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Tab sidebar */}
          <nav style={{
            width: 180, flexShrink: 0,
            background: "var(--parch-warm)",
            borderRight: "1px solid var(--parch-dark)",
            padding: "12px 8px", overflowY: "auto",
          }}>
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setEditing(null); setCreating(false); setSearchQuery(""); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "10px 12px", marginBottom: 2,
                    background: active ? "var(--ink-navy)" : "transparent",
                    color: active ? "var(--gold-pale)" : "var(--ink-mid)",
                    border: "none", borderRadius: 3,
                    fontFamily: "var(--font-sans-stack)", fontSize: ".82rem",
                    cursor: "pointer", textAlign: "left",
                    transition: "background .2s, color .2s",
                  }}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {/* Content area */}
          <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto" }} className="scroll-area">
            {/* Action bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ fontFamily: "var(--font-serif-stack)", fontSize: "1.2rem", color: "var(--forest)", fontWeight: 600 }}>
                {TABS.find(t => t.id === tab)?.label}
                <span style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".72rem", color: "var(--muted-foreground)", marginLeft: 10 }}>
                  ({filteredItems.length} {searchQuery ? `of ${items.length}` : ""} records)
                </span>
              </h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {/* Search box */}
                {tab !== "audit" && (
                  <div style={{ position: "relative" }}>
                    <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="input-parch"
                      style={{ paddingLeft: 26, padding: "5px 8px 5px 26px", fontSize: ".78rem", width: 180 }}
                    />
                  </div>
                )}
                {tab !== "audit" && (
                  <>
                    <button type="button" onClick={() => handleExport(tab)} className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }} title="Export as JSON backup">
                      <Download size={12} /> Export
                    </button>
                    {(tab === "articles" || tab === "fatwas") && (
                      <button type="button" onClick={handleBulkImportClick} className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }} title="Bulk import from JSON">
                        <Upload size={12} /> Import
                      </button>
                    )}
                    <button type="button" onClick={() => { setCreating(true); setEditing(null); }} className="chip active" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Plus size={14} /> New
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Bulk import textarea */}
            {showBulkImport && (tab === "articles" || tab === "fatwas") && (
              <div className="scard" style={{ marginBottom: 14 }}>
                <div className="sbody" style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".75rem", fontWeight: 600, color: "var(--forest)" }}>
                      Bulk Import {tab === "articles" ? "Articles" : "Fatwas"} (JSON)
                    </span>
                    <button type="button" onClick={() => setShowBulkImport(false)} className="chip" style={{ padding: "2px 6px" }}>
                      <X size={12} />
                    </button>
                  </div>
                  <textarea
                    value={bulkImportText}
                    onChange={e => setBulkImportText(e.target.value)}
                    placeholder={tab === "articles"
                      ? `{"items":[{"title":"...","cat":"fiqh","catLabel":"Fiqh","date":"2026-07-10","excerpt":"...","body":"..."}]}`
                      : `{"items":[{"q":"Question?","cat":"Zakāh","answer":"...","source":"..."}]}`}
                    style={{
                      width: "100%", minHeight: 120, fontFamily: "var(--font-mono-stack)",
                      fontSize: ".72rem", padding: 8, border: "1px solid var(--parch-dark)",
                      borderRadius: 3, background: "var(--parchment)", color: "var(--ink)",
                      resize: "vertical",
                    }}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button type="button" onClick={() => handleBulkImport(tab)} className="chip active" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Upload size={12} /> Import Now
                    </button>
                    <span style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".65rem", color: "var(--muted-foreground)", alignSelf: "center" }}>
                      Paste JSON above. Existing items are NOT overwritten.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--muted-foreground)" }}>
                <Loader2 size={20} className="animate-spin" style={{ display: "inline-block" }} />
              </div>
            )}

            {!loading && tab === "audit" && <AuditView items={filteredItems} />}
            {!loading && tab === "security" && <SecurityView onToast={showToast} onSessionExpired={onSessionExpired} />}
            {!loading && tab !== "audit" && tab !== "security" && creating && (
              <EditForm
                tab={tab}
                existingCategories={existingCategories}
                onSave={(payload) => handleSave(payload)}
                onCancel={() => setCreating(false)}
              />
            )}
            {!loading && tab !== "audit" && tab !== "security" && editing && (
              <EditForm
                tab={tab}
                initial={editing}
                existingCategories={existingCategories}
                onSave={(payload) => handleSave(payload, editing.id)}
                onCancel={() => setEditing(null)}
              />
            )}
            {!loading && tab !== "audit" && tab !== "security" && !creating && !editing && (
              <ListView tab={tab} items={filteredItems} onEdit={setEditing} onDelete={handleDelete} />
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
            background: "var(--forest)", color: "var(--gold-pale)",
            padding: "10px 20px", borderRadius: 4, border: "1px solid var(--gold)",
            fontFamily: "var(--font-sans-stack)", fontSize: ".82rem",
            boxShadow: "0 6px 24px rgba(0,0,0,.3)", zIndex: 200,
            maxWidth: "90vw", textAlign: "center",
          }} className="page-flip-enter">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── List view (read-only table of records) ─── */
function ListView({ tab, items, onEdit, onDelete }: { tab: Tab; items: any[]; onEdit: (item: any) => void; onDelete: (id: number) => void }) {
  if (items.length === 0) {
    return <p style={{ textAlign: "center", padding: 40, color: "var(--muted-foreground)", fontFamily: "var(--font-sans-stack)" }}>No records. Click "New" to create one.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map(item => (
        <div key={item.id} className="scard" style={{ padding: 0 }}>
          <div className="sbody" style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: ".68rem", color: "var(--muted-foreground)" }}>#{item.id}</span>
                {item.cat && <span className="tag">{item.cat}</span>}
                {item.catLabel && <span className="tag">{item.catLabel}</span>}
                {item.kind && <span className="tag">{item.kind}</span>}
                {item.order !== undefined && <span className="tag">order: {item.order}</span>}
              </div>
              <div style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".92rem", color: "var(--forest)", fontWeight: 500, lineHeight: 1.35, marginBottom: 4 }}>
                {item.title || item.q || item.text || item.name || item.label || "(no title)"}
              </div>
              {(item.excerpt || item.answer || item.desc || item.body || item.source || item.start) && (
                <div style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".8rem", color: "var(--ink-mid)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.excerpt || item.answer || item.desc || item.body || (item.source ? "Source: " + item.source : "") || (item.start ? `${item.start} – ${item.end}` : "")}
                </div>
              )}
              {item.date && (
                <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", color: "var(--muted-foreground)", marginTop: 4 }}>
                  {item.date}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button type="button" onClick={() => onEdit(item)} className="chip" style={{ padding: "4px 8px" }} aria-label="Edit">
                <Edit2 size={12} />
              </button>
              <button type="button" onClick={() => onDelete(item.id)} className="chip" style={{ padding: "4px 8px", color: "var(--maroon)", borderColor: "var(--maroon)" }} aria-label="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Edit / Create form (schema-driven with rich text toolbar) ─── */
function EditForm({ tab, initial, existingCategories, onSave, onCancel }: {
  tab: Tab;
  initial?: any;
  existingCategories: string[];
  onSave: (payload: any) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<any>(initial ? { ...initial } : {});
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const draftKey = `admin-draft-${tab}`;

  // Auto-save draft to localStorage
  useEffect(() => {
    if (initial) return; // Only auto-save for new records
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDraft(parsed);
      } catch { /* ignore */ }
    }
  }, [draftKey, initial]);

  useEffect(() => {
    if (initial) return; // Only auto-save for new records
    if (Object.keys(draft).length > 0) {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [draft, draftKey, initial]);

  const fields = SCHEMAS[tab] || [];

  // Validate form
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    for (const f of fields) {
      if (f.required && !draft[f.key]?.toString().trim()) {
        errs[f.key] = `${f.label} is required`;
      }
      if (f.pattern && draft[f.key]) {
        const re = new RegExp(f.pattern);
        if (!re.test(draft[f.key])) {
          errs[f.key] = `Invalid format`;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }
    setSaving(true);
    const success = await onSave(draft);
    setSaving(false);
    if (success && !initial) {
      // Clear draft on successful create
      localStorage.removeItem(draftKey);
    }
  };

  // Rich text formatting helpers for textarea fields
  const formatText = (key: string, format: "bold" | "italic" | "heading" | "paragraph" | "list" | "quote") => {
    const textarea = document.querySelector(`textarea[data-field="${key}"]`) as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft[key]?.substring(start, end) || "";
    const before = draft[key]?.substring(0, start) || "";
    const after = draft[key]?.substring(end) || "";
    let insertion = "";
    switch (format) {
      case "bold": insertion = `**${selected || "bold text"}**`; break;
      case "italic": insertion = `*${selected || "italic text"}*`; break;
      case "heading": insertion = `\n## ${selected || "Heading"}\n`; break;
      case "paragraph": insertion = `\n\n${selected || "New paragraph"}\n\n`; break;
      case "list": insertion = `\n- ${selected || "List item"}\n`; break;
      case "quote": insertion = `\n> ${selected || "Quoted text"}\n`; break;
    }
    const newDraft = { ...draft, [key]: before + insertion + after };
    setDraft(newDraft);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
    }, 0);
  };

  return (
    <form onSubmit={submit} className="scard" style={{ padding: 0 }}>
      <div className="sbody" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", color: "var(--muted-foreground)", letterSpacing: ".08em", textTransform: "uppercase" }}>
            {initial ? `Editing #${initial.id}` : "New record"}
            {!initial && <span style={{ marginLeft: 8, fontSize: ".65rem", color: "var(--gold)" }}>· Draft auto-saved</span>}
          </div>
          {/* Preview toggle for articles and fatwas */}
          {(tab === "articles" || tab === "fatwas") && (
            <button
              type="button"
              onClick={() => setShowPreview(s => !s)}
              className="chip"
              style={{ padding: "4px 8px", fontSize: ".72rem" }}
            >
              <Eye size={12} /> {showPreview ? "Edit" : "Preview"}
            </button>
          )}
        </div>

        {showPreview ? (
          /* Live preview for articles and fatwas */
          <LivePreview tab={tab} draft={draft} />
        ) : (
          <>
            {fields.map(f => (
              <div key={f.key}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", color: "var(--muted-foreground)" }}>
                    {f.label} {f.required && <span style={{ color: "var(--maroon)" }}>*</span>}
                  </label>
                  {/* Character counter for text fields */}
                  {(f.type === "textarea" || f.type === "text" || !f.type) && f.maxlength && (
                    <CharCounter current={draft[f.key]?.length || 0} max={f.maxlength} />
                  )}
                </div>

                {/* Rich text toolbar for body/answer fields */}
                {f.type === "textarea" && (f.key === "body" || f.key === "answer") && (
                  <RichTextToolbar onFormat={(fmt) => formatText(f.key, fmt)} />
                )}

                {f.type === "textarea" ? (
                  <textarea
                    data-field={f.key}
                    value={draft[f.key] ?? ""}
                    onChange={e => setDraft({ ...draft, [f.key]: e.target.value })}
                    required={f.required}
                    rows={f.rows || 4}
                    className="input-parch"
                    style={{
                      resize: "vertical", minHeight: 80,
                      borderColor: errors[f.key] ? "var(--maroon)" : undefined,
                    }}
                    maxLength={f.maxlength || 50000}
                  />
                ) : f.type === "select" ? (
                  <select
                    value={draft[f.key] ?? ""}
                    onChange={e => setDraft({ ...draft, [f.key]: e.target.value })}
                    required={f.required}
                    className="input-parch"
                    style={{ borderColor: errors[f.key] ? "var(--maroon)" : undefined }}
                  >
                    <option value="">— select —</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.key === "cat" && existingCategories.length > 0 ? (
                  /* Category field with datalist for suggestions */
                  <>
                    <input
                      type="text"
                      list={`cat-suggestions-${f.key}`}
                      value={draft[f.key] ?? ""}
                      onChange={e => setDraft({ ...draft, [f.key]: e.target.value })}
                      required={f.required}
                      className="input-parch"
                      maxLength={f.maxlength || 500}
                      pattern={f.pattern}
                      placeholder={f.placeholder || "Type or select a category"}
                      style={{ borderColor: errors[f.key] ? "var(--maroon)" : undefined }}
                    />
                    <datalist id={`cat-suggestions-${f.key}`}>
                      {existingCategories.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </>
                ) : (
                  <input
                    type={f.type === "number" ? "number" : "text"}
                    value={draft[f.key] ?? ""}
                    onChange={e => setDraft({ ...draft, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                    required={f.required}
                    className="input-parch"
                    maxLength={f.maxlength || 500}
                    pattern={f.pattern}
                    placeholder={f.placeholder}
                    style={{ borderColor: errors[f.key] ? "var(--maroon)" : undefined }}
                  />
                )}
                {/* Error message */}
                {errors[f.key] && (
                  <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".7rem", color: "var(--maroon)", marginTop: 2 }}>
                    {errors[f.key]}
                  </div>
                )}
                {/* Help text */}
                {f.helpText && (
                  <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", color: "var(--muted-foreground)", marginTop: 2 }}>
                    {f.helpText}
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button type="submit" disabled={saving} className="chip active" style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: saving ? 0.6 : 1 }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {initial ? "Save Changes" : "Create"}
              </button>
              <button type="button" onClick={onCancel} className="chip">Cancel</button>
              {!initial && (
                <button
                  type="button"
                  onClick={() => { localStorage.removeItem(draftKey); setDraft({}); }}
                  className="chip"
                  style={{ fontSize: ".72rem", color: "var(--muted-foreground)" }}
                >
                  Clear Draft
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </form>
  );
}

/* ─── Rich Text Toolbar ─── */
function RichTextToolbar({ onFormat }: { onFormat: (format: "bold" | "italic" | "heading" | "paragraph" | "list" | "quote") => void }) {
  const tools = [
    { format: "bold" as const, icon: Bold, title: "Bold (**text**)" },
    { format: "italic" as const, icon: Italic, title: "Italic (*text*)" },
    { format: "heading" as const, icon: Type, title: "Heading (## text)" },
    { format: "paragraph" as const, icon: Pilcrow, title: "New paragraph" },
    { format: "list" as const, icon: List, title: "Bullet list item" },
    { format: "quote" as const, icon: Quote, title: "Blockquote (> text)" },
  ];
  return (
    <div style={{
      display: "flex", gap: 2, marginBottom: 4, padding: "4px 6px",
      background: "var(--parch-warm)", border: "1px solid var(--parch-dark)",
      borderRadius: 3,
    }}>
      {tools.map(t => {
        const Icon = t.icon;
        return (
          <button
            key={t.format}
            type="button"
            onClick={() => onFormat(t.format)}
            title={t.title}
            style={{
              width: 28, height: 28, borderRadius: 3, border: "none",
              background: "transparent", color: "var(--ink-mid)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(176,141,76,.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <Icon size={13} />
          </button>
        );
      })}
      <span style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".6rem", color: "var(--muted-foreground)", alignSelf: "center", marginLeft: 6 }}>
        Formatting toolbar — use for structured content
      </span>
    </div>
  );
}

/* ─── Character Counter ─── */
function CharCounter({ current, max }: { current: number; max: number }) {
  const pct = (current / max) * 100;
  const color = pct > 95 ? "var(--maroon)" : pct > 80 ? "var(--gold)" : "var(--muted-foreground)";
  return (
    <span style={{
      fontFamily: "var(--font-mono-stack)", fontSize: ".62rem",
      color,
    }}>
      {current} / {max}
    </span>
  );
}

/* ─── Live Preview ─── */
function LivePreview({ tab, draft }: { tab: Tab; draft: any }) {
  if (tab === "articles") {
    return (
      <div className="scard" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", background: "var(--parch-warm)", borderBottom: "1px solid var(--parch-dark)" }}>
          <span className="tag" style={{ marginBottom: 6 }}>{draft.catLabel || draft.cat || "Category"}</span>
          <h3 style={{ fontFamily: "var(--font-serif-stack)", fontSize: "1.3rem", fontWeight: 600, color: "var(--forest)", lineHeight: 1.3, margin: "4px 0 6px" }}>
            {draft.title || "Article title will appear here"}
          </h3>
          <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".72rem", color: "var(--muted-foreground)" }}>
            {draft.date || "Date"}
          </div>
        </div>
        <div style={{ padding: "14px 16px" }}>
          <p style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".88rem", color: "var(--ink-mid)", lineHeight: 1.6, marginBottom: 10, fontStyle: "italic" }}>
            {draft.excerpt || "Excerpt will appear here..."}
          </p>
          <div style={{
            fontFamily: "var(--font-serif-stack)", fontSize: ".88rem", color: "var(--ink)", lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}>
            {renderMarkdownPreview(draft.body || "Article body will appear here...")}
          </div>
        </div>
      </div>
    );
  }
  if (tab === "fatwas") {
    return (
      <div className="scard" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", background: "var(--parch-warm)", borderBottom: "1px solid var(--parch-dark)" }}>
          <span className="tag" style={{ marginBottom: 6 }}>{draft.cat || "Category"}</span>
          <p style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".95rem", fontWeight: 600, color: "var(--forest)", lineHeight: 1.4, margin: "4px 0 0" }}>
            {draft.q || "Question will appear here..."}
          </p>
        </div>
        <div style={{ padding: "14px 16px" }}>
          <div style={{
            fontFamily: "var(--font-serif-stack)", fontSize: ".88rem", color: "var(--ink)", lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}>
            {renderMarkdownPreview(draft.answer || "Answer will appear here...")}
          </div>
          <p style={{ fontFamily: "var(--font-mono-stack)", fontSize: ".68rem", color: "var(--gold)", marginTop: 12 }}>
            — {draft.source || "Source citation"}
          </p>
        </div>
      </div>
    );
  }
  return null;
}

/* ─── Simple markdown preview renderer ─── */
function renderMarkdownPreview(text: string): React.ReactNode {
  // Simple markdown: **bold**, *italic*, ## heading, > quote, - list
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("## ")) {
      return <h4 key={i} style={{ fontFamily: "var(--font-serif-stack)", fontSize: "1.05rem", fontWeight: 600, color: "var(--forest)", margin: "10px 0 4px" }}>{line.slice(3)}</h4>;
    }
    if (line.startsWith("> ")) {
      return <blockquote key={i} style={{ borderLeft: "3px solid var(--gold)", paddingLeft: 10, margin: "6px 0", fontStyle: "italic", color: "var(--ink-mid)" }}>{line.slice(2)}</blockquote>;
    }
    if (line.startsWith("- ")) {
      return <div key={i} style={{ paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 4 }}>•</span>{formatInline(line.slice(2))}</div>;
    }
    if (line.trim() === "") {
      return <div key={i} style={{ height: 8 }} />;
    }
    return <p key={i} style={{ margin: "2px 0" }}>{formatInline(line)}</p>;
  });
}

function formatInline(text: string): React.ReactNode {
  // Handle **bold** and *italic*
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*(.+?)\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      parts.push(remaining.substring(0, boldMatch.index));
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
    } else if (italicMatch && italicMatch.index !== undefined) {
      parts.push(remaining.substring(0, italicMatch.index));
      parts.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }
  return <>{parts}</>;
}

/* ─── Audit log view ─── */
function AuditView({ items }: { items: any[] }) {
  if (items.length === 0) return <p style={{ textAlign: "center", padding: 40, color: "var(--muted-foreground)" }}>No audit entries yet.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map(l => (
        <div key={l.id} style={{
          padding: "8px 12px", background: "var(--parch-warm)",
          border: "1px solid var(--parch-dark)", borderRadius: 3,
          display: "grid", gridTemplateColumns: "100px 80px 100px 1fr 120px", gap: 12, alignItems: "center",
          fontFamily: "var(--font-sans-stack)", fontSize: ".76rem",
        }}>
          <span style={{ color: "var(--muted-foreground)" }}>{new Date(l.createdAt).toLocaleString()}</span>
          <span style={{
            padding: "2px 6px", borderRadius: 2, textAlign: "center", fontWeight: 600,
            background: l.action === "create" ? "rgba(11,100,50,.15)" : l.action === "update" ? "rgba(184,146,30,.20)" : l.action === "delete" ? "rgba(122,31,43,.18)" : "rgba(11,61,46,.08)",
            color: l.action === "create" ? "#0a5c1a" : l.action === "update" ? "var(--gold)" : l.action === "delete" ? "var(--maroon)" : "var(--forest)",
          }}>
            {l.action}
          </span>
          <span style={{ color: "var(--forest)", fontWeight: 500 }}>{l.entity}{l.entityId ? ` #${l.entityId}` : ""}</span>
          <span style={{ color: "var(--ink-mid)", fontFamily: "var(--font-mono-stack)", fontSize: ".7rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {l.username} {l.ip && `· ${l.ip}`}
          </span>
          <span style={{ color: "var(--muted-foreground)", fontSize: ".68rem", textAlign: "right" }}>
            {l.userAgent?.slice(0, 40) || "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Security View — password change + security dashboard ─── */
function SecurityView({ onToast, onSessionExpired }: { onToast: (msg: string) => void; onSessionExpired: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [securityData, setSecurityData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Load security data
  const loadSecurityData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [secRes, emailRes] = await Promise.all([
        fetch("/api/admin/security"),
        fetch("/api/admin/change-password"),
      ]);
      if (secRes.status === 401 || emailRes.status === 401) { onSessionExpired(); return; }
      const secData = await secRes.json();
      const emailData = await emailRes.json();
      setSecurityData(secData);
      if (emailData.email) setAdminEmail(emailData.email);
    } catch {
      onToast("Failed to load security data");
    } finally {
      setLoadingData(false);
    }
  }, [onToast, onSessionExpired]);

  useEffect(() => { loadSecurityData(); }, [loadSecurityData]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      onToast("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      onToast("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      onToast("Password must have uppercase, lowercase, digit, and symbol");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, adminEmail }),
      });
      if (res.status === 401) { onSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        onToast(data.message || "Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        await loadSecurityData();
      } else {
        onToast(data.error || "Failed to change password");
      }
    } catch {
      onToast("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={20} className="animate-spin" style={{ display: "inline-block" }} /></div>;
  }

  const alerts = securityData?.alerts || [];
  const stats = securityData?.stats || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Security alerts */}
      {alerts.length > 0 && (
        <div className="scard" style={{ padding: 0 }}>
          <div className="sbody" style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <AlertTriangle size={16} style={{ color: "var(--maroon)" }} />
              <span style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", fontWeight: 600, color: "var(--forest)", letterSpacing: ".08em", textTransform: "uppercase" }}>
                Security Alerts ({alerts.length})
              </span>
            </div>
            {alerts.map((alert: any, i: number) => {
              const color = alert.severity === "CRITICAL" ? "#7A2E2E" : alert.severity === "HIGH" ? "#B08D4C" : alert.severity === "MEDIUM" ? "#2E6E6A" : "var(--muted-foreground)";
              const bg = alert.severity === "CRITICAL" ? "rgba(122,46,46,.08)" : alert.severity === "HIGH" ? "rgba(176,141,76,.08)" : alert.severity === "MEDIUM" ? "rgba(46,110,106,.06)" : "var(--parch-warm)";
              return (
                <div key={i} style={{
                  padding: "8px 12px", marginBottom: 6,
                  background: bg, border: `1px solid ${color}33`,
                  borderRadius: 4, display: "flex", alignItems: "flex-start", gap: 8,
                }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 10,
                    background: color, color: "white",
                    fontFamily: "var(--font-sans-stack)", fontSize: ".55rem", fontWeight: 700,
                    letterSpacing: ".1em", textTransform: "uppercase", flexShrink: 0,
                  }}>{alert.severity}</span>
                  <span style={{
                    fontFamily: "var(--font-serif-stack)", fontSize: ".8rem",
                    color: "var(--ink)", lineHeight: 1.4,
                  }}>{alert.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Security stats */}
      <div className="scard" style={{ padding: 0 }}>
        <div className="sbody" style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <ShieldCheck size={16} style={{ color: "var(--forest)" }} />
            <span style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", fontWeight: 600, color: "var(--forest)", letterSpacing: ".08em", textTransform: "uppercase" }}>
              Last 24 Hours
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
            <StatCard label="Total Attempts" value={stats.totalAttempts || 0} color="var(--ink-mid)" />
            <StatCard label="Successful" value={stats.successful || 0} color="var(--forest)" />
            <StatCard label="Failed" value={stats.failed || 0} color="var(--maroon)" />
            <StatCard label="Unique IPs" value={stats.uniqueIPs || 0} color="var(--gold)" />
            <StatCard label="Rate-Limited" value={stats.rateLimited || 0} color="#7A2E2E" />
          </div>
        </div>
      </div>

      {/* Password change form */}
      <div className="scard" style={{ padding: 0 }}>
        <div className="sbody" style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Lock size={16} style={{ color: "var(--gold)" }} />
            <span style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", fontWeight: 600, color: "var(--forest)", letterSpacing: ".08em", textTransform: "uppercase" }}>
              Change Password
            </span>
          </div>
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Admin email (for verification & alerts) */}
            <div>
              <label style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".76rem", color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
                <Mail size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                Admin Email (for verification & security alerts)
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                className="input-parch"
                placeholder="your@email.com"
                style={{ width: "100%" }}
              />
              <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".66rem", color: "var(--muted-foreground)", marginTop: 2 }}>
                Security alerts and password change confirmations will be sent to this email.
              </div>
            </div>

            {/* Current password */}
            <div>
              <label style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".76rem", color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
                Current Password *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                className="input-parch"
                style={{ width: "100%" }}
                autoComplete="current-password"
              />
            </div>

            {/* New password */}
            <div>
              <label style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".76rem", color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
                New Password *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                className="input-parch"
                style={{ width: "100%" }}
                autoComplete="new-password"
              />
              <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".66rem", color: "var(--muted-foreground)", marginTop: 2 }}>
                Min 8 characters with uppercase, lowercase, digit, and symbol.
              </div>
            </div>

            {/* Confirm new password */}
            <div>
              <label style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".76rem", color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
                Confirm New Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="input-parch"
                style={{ width: "100%", borderColor: confirmPassword && newPassword !== confirmPassword ? "var(--maroon)" : undefined }}
                autoComplete="new-password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", color: "var(--maroon)", marginTop: 2 }}>
                  Passwords do not match
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="chip active"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Change Password
            </button>
          </form>
        </div>
      </div>

      {/* No lockout guarantee */}
      <div style={{
        padding: "10px 14px",
        background: "rgba(46,110,106,.06)",
        border: "1px solid rgba(46,110,106,.2)",
        borderRadius: 4,
        display: "flex", alignItems: "flex-start", gap: 8,
      }}>
        <CheckCircle size={14} style={{ color: "var(--forest)", flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".78rem", color: "var(--ink-mid)", lineHeight: 1.5 }}>
          <strong>No lockout guarantee:</strong> You remain logged in after changing your password.
          If you forget your new password, contact the system administrator to reset it via the server script.
          A confirmation email will be sent to your admin email after every password change.
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: "8px 10px", background: "var(--parch-warm)",
      border: "1px solid var(--parch-dark)", borderRadius: 4, textAlign: "center",
    }}>
      <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: "1.2rem", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".58rem", color: "var(--muted-foreground)", letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

/* ─── Per-tab field schemas (drives the dynamic edit form) ─── */
const SCHEMAS: Record<Tab, { key: string; label: string; type?: "text" | "textarea" | "select" | "number"; required?: boolean; options?: string[]; rows?: number; maxlength?: number; pattern?: string; placeholder?: string; helpText?: string }[]> = {
  articles: [
    { key: "title", label: "Title", required: true, maxlength: 500, helpText: "The article headline — will be displayed in ALL CAPS on the site" },
    { key: "cat", label: "Category key", required: true, maxlength: 50, placeholder: "fiqh / salah / zakah / akhlaq / bidah", helpText: "Machine key (lowercase). Type or select from existing categories." },
    { key: "catLabel", label: "Category label", required: true, maxlength: 50, helpText: "Display label (e.g. 'Fiqh & Ijtihād')" },
    { key: "date", label: "Hijri date", required: true, maxlength: 100, placeholder: "e.g. 12 Dhul-Hijjah 1446", helpText: "Displayed as the article date" },
    { key: "excerpt", label: "Excerpt", required: true, type: "textarea", rows: 3, maxlength: 1000, helpText: "Short summary shown in article cards" },
    { key: "body", label: "Full body", required: true, type: "textarea", rows: 12, maxlength: 50000, helpText: "Use the formatting toolbar for structure. **bold**, *italic*, ## heading, > quote, - list" },
  ],
  fatwas: [
    { key: "q", label: "Question", required: true, type: "textarea", rows: 3, maxlength: 1000 },
    { key: "cat", label: "Category", required: true, maxlength: 50, helpText: "Type or select from existing categories" },
    { key: "answer", label: "Answer", required: true, type: "textarea", rows: 8, maxlength: 20000, helpText: "Use the formatting toolbar for structure" },
    { key: "source", label: "Source citation", required: true, maxlength: 300, placeholder: "e.g. Ṣaḥīḥ al-Bukhārī 6018" },
  ],
  downloads: [
    { key: "title", label: "Title", required: true, maxlength: 300 },
    { key: "cat", label: "Category key", required: true, maxlength: 50, helpText: "Type or select from existing categories" },
    { key: "catLabel", label: "Category label", required: true, maxlength: 50 },
    { key: "meta", label: "Meta (e.g. 'PDF · 24 pages')", required: true, maxlength: 200 },
    { key: "desc", label: "Description", required: true, type: "textarea", rows: 3, maxlength: 1000 },
    { key: "filename", label: "Filename (must end in .pdf)", required: true, maxlength: 200, pattern: "^[\\w.-]+\\.pdf$", placeholder: "my-booklet.pdf", helpText: "The PDF file must be placed in public/downloads/" },
  ],
  announcements: [
    { key: "title", label: "Title", required: true, maxlength: 300 },
    { key: "body", label: "Body", required: true, type: "textarea", rows: 6, maxlength: 5000 },
    { key: "date", label: "Date label", required: true, maxlength: 100, placeholder: "e.g. 10 July 2026" },
    { key: "kind", label: "Kind", required: true, type: "select", options: ["urgent", "info", "moon", "ramadan"] },
  ],
  hadiths: [
    { key: "text", label: "Hadith text (English)", required: true, type: "textarea", rows: 3, maxlength: 1000 },
    { key: "source", label: "Source (specific book + number)", required: true, maxlength: 300, placeholder: "Ṣaḥīḥ al-Bukhārī 6018 · Ṣaḥīḥ Muslim 47" },
  ],
  dyks: [
    { key: "text", label: "Did-You-Know text (with citation)", required: true, type: "textarea", rows: 4, maxlength: 1000 },
  ],
  prayer: [
    { key: "name", label: "Name (e.g. Fajr)", required: true, maxlength: 50 },
    { key: "arabic", label: "Arabic name", required: true, maxlength: 50 },
    { key: "start", label: "Azaan time (HH:MM)", required: true, pattern: "^\\d{2}:\\d{2}$", placeholder: "06:00", helpText: "Note: Sunrise and Maghrib are auto-calculated — only Fajr/Dhuhr/Asr/Isha times are editable here" },
    { key: "end", label: "Jama'ah time (HH:MM)", required: true, pattern: "^\\d{2}:\\d{2}$", placeholder: "06:15" },
    { key: "order", label: "Sort order", required: true, type: "number" },
  ],
  audit: [],
  security: [],
};

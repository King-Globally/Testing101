"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Menu, X, Moon, Mail, MessageSquare, MapPin, FileText, BookOpen, Calendar as CalendarIcon, Bell, Info, Download, Home, ChevronRight, ShieldCheck, Lock, Link2, AlertCircle, Sparkles } from "lucide-react";
import WavingFlag from "./WavingFlag";
import PeacockFeatherCursor from "./PeacockFeatherCursor";
import PrayerTimes from "./PrayerTimes";
import IslamicCalendar from "./IslamicCalendar";
import DidYouKnow from "./DidYouKnow";
import FatwaList, { type Fatwa } from "./FatwaList";
import ArticleGrid, { type Article } from "./ArticleGrid";
import DownloadsGrid, { type DownloadItem } from "./DownloadsGrid";
import SearchOverlay from "./SearchOverlay";
import ArticleModal from "./ArticleModal";
import AdminLogin from "./AdminLogin";
import AdminPanel from "./AdminPanel";
import FatwaModal from "./FatwaModal";
import RandIcon, { RandIconAsNav } from "./RandIcon";
import MoonSightingAlert from "./MoonSightingAlert";
import WebsiteTour from "./WebsiteTour";
import ImagePlaceholder from "./ImagePlaceholder";
import WhatsAppPopup from "./WhatsAppPopup";

interface HomeClientProps {
  articles: Article[];
  fatwas: Fatwa[];
  downloads: DownloadItem[];
  announcements: { id: number; title: string; body: string; date: string; kind: string }[];
  hadiths: { id: number; text: string; source: string }[];
  dyks: { id: number; text: string }[];
}

type PageId = "home" | "fatwas" | "articles" | "calendar" | "financials" | "downloads" | "announcements" | "links" | "contact";

const NAV: { id: PageId; label: string; arabic: string; icon: typeof Home }[] = [
  { id: "home",          label: "Home",          arabic: "الرئيسية",        icon: Home },
  { id: "fatwas",        label: "Fatwas & Q&A",  arabic: "فتاوى",          icon: BookOpen },
  { id: "articles",      label: "Articles",      arabic: "مقالات",         icon: FileText },
  { id: "calendar",      label: "Calendar",      arabic: "التقويم",        icon: CalendarIcon },
  { id: "financials",    label: "Financials",    arabic: "المؤشرات",       icon: RandIconAsNav },
  { id: "downloads",     label: "Downloads",     arabic: "مكتبة",          icon: Download },
  { id: "announcements", label: "Announcements", arabic: "إعلانات",        icon: Bell },
  { id: "links",          label: "Useful Links",  arabic: "روابط",           icon: Link2 },
  { id: "contact",       label: "Contact",       arabic: "تواصل",          icon: Mail },
];

export default function HomeClient(props: HomeClientProps) {
  const { articles, fatwas, downloads, announcements, hadiths, dyks } = props;
  const { data: session, status } = useSession();
  const isEditor = status === "authenticated" && (session?.user as any)?.role === "editor";

  const [page, setPage] = useState<PageId>("home");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [hadithIdx, setHadithIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeFatwa, setActiveFatwa] = useState<Fatwa | null>(null);
  const [tourOpen, setTourOpen] = useState(false);

  // Rotate hadith bar
  useEffect(() => {
    const t = setInterval(() => setHadithIdx(i => (i + 1) % hadiths.length), 9000);
    return () => clearInterval(t);
  }, [hadiths.length]);

  // Keyboard shortcuts:
  //   Cmd/Ctrl + K           → search
  //   Cmd/Ctrl + Shift + A   → admin login (if not signed in) or admin panel (if signed in)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (isEditor) setPanelOpen(true);
        else setLoginOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEditor]);

  // When session becomes available after a fresh login, auto-open the panel.
  // Suppressed lint: this is a one-time side-effect of session state change.
  useEffect(() => {
    if (status === "authenticated" && loginOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reactive to external session state
      setLoginOpen(false);
      setPanelOpen(true);
    }
  }, [status, loginOpen]);

  const navigate = useCallback((p: string) => {
    setPage(p as PageId);
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Nav marquee pause state
  const [rotatingPaused, setRotatingPaused] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const onSubmitQuestion = (q: string) => {
    showToast("Your question has been submitted to the Darul Iftā. We will respond via WhatsApp or email, in shā’ Allah.");
  };

  const onSubmitContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget; // capture before any await
    const fd = new FormData(form);
    const payload = { name: fd.get("name"), contact: fd.get("contact"), message: fd.get("message") };
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast("Your message has been received. The Jamiat will respond, in shā’ Allah.");
        form.reset();
      } else {
        showToast("There was a problem submitting. Please WhatsApp us directly.");
      }
    } catch {
      showToast("Network error. Please WhatsApp +27 786 786 713.");
    }
  };

  const curHadith = hadiths[hadithIdx] || hadiths[0];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--parchment)" }}>
      <PeacockFeatherCursor />
      {/* Skip-to-content link for screen reader / keyboard users */}
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* ── Masthead ── */}
      <header style={{
        background: "linear-gradient(180deg, #0F1A23 0%, var(--ink-navy) 100%)",
        color: "var(--parchment)",
        padding: "0 0 0",
        borderBottom: "2px solid var(--gold)",
      }} className="islamic-pattern-bg">
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "8px 16px 6px" }} className="masthead-inner">
          {/* Islamic calligraphic signature frame — wraps both flag and title together */}
          <div className="brand-signature-frame" style={{
            position: "relative",
            display: "flex",
            alignItems: "stretch",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            padding: "10px 16px 10px 12px",
            margin: "0 auto",
          }}>
            {/* Decorative corner ornaments — Islamic arabesque */}
            <span className="sig-corner sig-tl" />
            <span className="sig-corner sig-tr" />
            <span className="sig-corner sig-bl" />
            <span className="sig-corner sig-br" />
            {/* Decorative top/bottom borders with Islamic pattern */}
            <span className="sig-border-top" />
            <span className="sig-border-bottom" />

            {/* Flag — slightly lengthier than title, in sync — clickable to start tour */}
            <div
              className="flag-wrap"
              onClick={() => setTourOpen(true)}
              title="Click to take a website tour"
              style={{
                flex: "1.15 1 0", padding: 0, minWidth: 0, margin: 0,
                position: "relative", zIndex: 2,
                display: "flex", justifyContent: "center", alignItems: "center",
                overflow: "hidden", boxSizing: "border-box",
                cursor: "pointer",
              }}
            >
              <WavingFlag width={900} height={280} />
              {/* Tour hint badge */}
              <div style={{
                position: "absolute", bottom: 6, right: 8, zIndex: 5,
                padding: "3px 8px", borderRadius: 10,
                background: "rgba(201, 168, 94, 0.85)",
                color: "#1B2A38",
                fontFamily: "var(--font-sans-stack)", fontSize: ".55rem",
                fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase",
                pointerEvents: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,.3)",
                animation: "livepulse 2s infinite",
              }}>
                ✦ Click for Tour
              </div>
            </div>
            {/* Brand title block — in sync with flag */}
            <div style={{ flex: "1 1 0", textAlign: "center", minWidth: 280, padding: 0, position: "relative", zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "center", boxSizing: "border-box" }}>
              <div style={{ fontFamily: "var(--font-arabic-stack)", direction: "rtl", fontSize: "3.4rem", color: "var(--gold-pale)", lineHeight: 1.05, textShadow: "0 2px 14px rgba(0,0,0,.35)", letterSpacing: ".005em" }}>
                جمعية العلماء جوهانسبرغ
              </div>
              <div style={{ fontFamily: "var(--font-serif-stack)", fontSize: "2.35rem", fontWeight: 700, color: "var(--parch-warm)", lineHeight: 1.05, marginTop: 4, letterSpacing: ".015em", textShadow: "0 2px 14px rgba(0,0,0,.35)" }}>
                Jamiatul Ulama Johannesburg
              </div>
              <div style={{ marginTop: 10, padding: "8px 24px", background: "rgba(184,146,30,.14)", border: "1px solid var(--gold)", borderRadius: 4, display: "inline-block", fontFamily: "var(--font-arabic-stack)", direction: "rtl", color: "var(--gold-pale)", fontSize: "1.35rem" }}>
                وَمَا عَلَيْنَا إِلَّا الْبَلَاغُ الْمُبِينُ
                <span style={{ display: "block", fontFamily: "var(--font-sans-stack)", direction: "ltr", fontSize: ".76rem", color: "var(--gold-light)", letterSpacing: ".12em", marginTop: 3, fontWeight: 500 }}>
                  "Clear propagation is our only responsibility." — Sūrah Yāsīn 36:17
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Headline Banner — creative rotating display ──
            Alternates between:
            1. Hadith of the moment (gold bar, italic)
            2. Latest announcement (teal alert bar with pulse)
            3. Another hadith
            Crossfades every 7s with a smooth slide. */}
        <HeadlineBanner
          hadiths={hadiths}
          announcements={announcements}
          hadithIdx={hadithIdx}
          onNavigate={navigate}
        />

        {/* Nav — ALL 9 menu items flow together in a continuous, seamless marquee
            on EVERY screen size. Triple-rendered for a perfect loop. Hover pauses. */}
        <nav style={{ background: "#0F1A23", borderTop: "1px solid #B08D4C", borderBottom: "1px solid #B08D4C" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 12px", display: "flex", alignItems: "center", gap: 0 }}>
            {/* Mobile menu toggle */}
            <button onClick={() => setNavOpen(o => !o)} className="chip" style={{ display: "none", color: "#F1E9D8", background: "transparent", border: "1px solid #B08D4C" }} id="mobile-menu-btn">
              {navOpen ? <X size={14} /> : <Menu size={14} />}
            </button>

            {/* Flowing marquee — all 9 items, always moving */}
            <div
              className="nav-flow-wrap"
              onMouseEnter={() => setRotatingPaused(true)}
              onMouseLeave={() => setRotatingPaused(false)}
              style={{
                flex: 1, overflow: "hidden", position: "relative",
                maskImage: "linear-gradient(90deg, transparent 0%, #000 3%, #000 97%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 3%, #000 97%, transparent 100%)",
              }}
            >
              <div
                className="nav-flow-track"
                style={{
                  display: "flex",
                  animation: "navMarquee 18s linear infinite",
                  animationPlayState: rotatingPaused ? "paused" : "running",
                }}
              >
                {[...NAV, ...NAV, ...NAV].map((n, idx) => {
                  const Icon = n.icon;
                  const active = page === n.id;
                  return (
                    <button
                      key={n.id + "-" + idx}
                      onClick={() => navigate(n.id)}
                      className="nav-btn"
                      style={{
                        padding: "12px 14px",
                        background: "transparent",
                        border: "none",
                        borderBottom: active ? "2px solid #C9A85E" : "2px solid transparent",
                        color: active ? "#E8D8A8" : "#C8BFA6",
                        fontFamily: "var(--font-sans-stack)",
                        fontSize: ".78rem",
                        letterSpacing: ".04em",
                        cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 5,
                        whiteSpace: "nowrap",
                        transition: "color .25s ease, border-bottom-color .25s ease",
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "#C9A85E"; e.currentTarget.style.borderBottomColor = "#B08D4C"; } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "#C8BFA6"; e.currentTarget.style.borderBottomColor = "transparent"; } }}
                    >
                      <Icon size={13} />
                      {n.label}
                      <span style={{ fontFamily: "var(--font-arabic-stack)", direction: "rtl", fontSize: ".88rem", opacity: .7, marginRight: 18 }}>{n.arabic}</span>
                      {n.id === "announcements" && <span className="dot-pulse" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setSearchOpen(true)}
              style={{
                padding: "8px 14px", margin: "6px 8px",
                background: "rgba(176,141,76,.15)",
                border: "1px solid #B08D4C",
                color: "#E8D8A8",
                borderRadius: 3,
                fontFamily: "var(--font-sans-stack)",
                fontSize: ".78rem",
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                flexShrink: 0,
              }}
            >
              <Search size={13} /> Search <kbd style={{ marginLeft: 4, padding: "1px 5px", border: "1px solid #B08D4C", borderRadius: 2, fontSize: ".65rem" }}>⌘K</kbd>
            </button>
          </div>
          {/* Mobile drawer — all 9 items in a scrollable grid */}
          {navOpen && (
            <div style={{ background: "var(--forest-deep)", padding: "8px 12px", borderTop: "1px solid var(--gold)", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6, maxHeight: "60vh", overflowY: "auto" }} className="mobile-nav-drawer scroll-area">
              {NAV.map(n => (
                <button key={n.id} onClick={() => navigate(n.id)} style={{
                  padding: "10px 12px", background: page === n.id ? "rgba(184,146,30,.18)" : "transparent",
                  border: "1px solid var(--gold)", color: "var(--gold-pale)",
                  fontFamily: "var(--font-sans-stack)", fontSize: ".78rem",
                  display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-start", cursor: "pointer",
                  borderRadius: 3, whiteSpace: "nowrap",
                }}>
                  <n.icon size={13} /> {n.label}
                </button>
              ))}
            </div>
          )}
        </nav>
      </header>

      {/* ── Page body (animated transitions) ── */}
      <main id="main-content" style={{ flex: 1, maxWidth: 1400, margin: "0 auto", padding: "22px 16px", width: "100%" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 14, rotateX: -6, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(2px)" }}
            transition={{ duration: .45, ease: [0.4, 0, 0.2, 1] }}
          >
            {page === "home" && (
              <HomeView
                articles={articles}
                fatwas={fatwas}
                downloads={downloads}
                announcements={announcements}
                dyks={dyks}
                onNavigate={navigate}
                onOpenArticle={a => setActiveArticle(a)}
                onOpenFatwa={f => setActiveFatwa(f)}
                onSubmitQuestion={onSubmitQuestion}
              />
            )}
            {page === "fatwas" && (
              <FullPage
                title="Fatwa Archive & Q&A"
                arabic="فتاوى"
                sub="Verified Ḥanafī rulings from the Darul Iftā"
              >
                <FatwaList initial={fatwas} onSubmitQuestion={onSubmitQuestion} onOpenFatwa={f => setActiveFatwa(f)} />
              </FullPage>
            )}
            {page === "articles" && (
              <FullPage title="Articles & Publications" arabic="مقالات" sub="Islamic guidance, fiqh, and educational content — complete archive">
                <ArticleGrid initial={articles} onOpenArticle={a => setActiveArticle(a)} />
              </FullPage>
            )}
            {page === "calendar" && (
              <FullPage title="Islamic Calendar" arabic="التقويم الهجري" sub="Hijri–Gregorian calendar with Sunnah fast days, verified against the Ṣiḥāḥ Sittah">
                <IslamicCalendar />
              </FullPage>
            )}
            {page === "financials" && <FinancialsView />}
            {page === "downloads" && (
              <FullPage title="Resource Library" arabic="مكتبة" sub="PDF booklets, guides, posters and scholarly works">
                <DownloadsGrid initial={downloads} />
              </FullPage>
            )}
            {page === "announcements" && <AnnouncementsView announcements={announcements} />}
            {page === "links" && <UsefulLinksView />}
            {page === "contact" && <ContactView onSubmit={onSubmitContact} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── World-class Footer ── */}
      <footer style={{ marginTop: "auto" }}>
        {/* Top accent bar */}
        <div style={{
          height: 3,
          background: "linear-gradient(90deg, transparent, #B08D4C 20%, #2E6E6A 50%, #B08D4C 80%, transparent)",
        }} />

        {/* Main footer body */}
        <div style={{
          background: "#0F1A23",
          padding: "36px 24px 0",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Subtle pattern overlay */}
          <div style={{
            position: "absolute", inset: 0, opacity: .03,
            backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='none' stroke='%23B08D4C' stroke-width='0.8'><circle cx='60' cy='60' r='30'/><circle cx='60' cy='60' r='15'/><rect x='38' y='38' width='44' height='44'/><rect x='38' y='38' width='44' height='44' transform='rotate(45 60 60)'/><path d='M60 15 L67 53 L105 60 L67 67 L60 105 L53 67 L15 60 L53 53 Z'/></g></svg>\")",
            backgroundSize: "120px 120px",
            pointerEvents: "none",
          }} />

          {/* Content grid */}
          <div style={{
            position: "relative",
            maxWidth: 1400, margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1.8fr 1fr 1fr 1.2fr 1.5fr",
            gap: 32, paddingBottom: 32,
          }} className="footer-grid">

            {/* Column 1: Brand + verse */}
            <div>
              <div style={{
                fontFamily: "var(--font-display-stack)", fontSize: "1.15rem", fontWeight: 600,
                color: "#F1E9D8", marginBottom: 2, letterSpacing: ".01em",
              }}>
                Jamiatul Ulama Johannesburg
              </div>
              <div style={{
                fontFamily: "var(--font-arabic-stack)", direction: "rtl",
                color: "#2E6E6A", fontSize: "1.1rem", marginBottom: 12,
              }}>
                جمعية العلماء جوهانسبرغ
              </div>
              <div style={{
                padding: "12px 14px",
                background: "rgba(46,110,106,.08)",
                borderLeft: "2px solid #2E6E6A",
                borderRadius: "0 3px 3px 0",
                marginBottom: 12,
              }}>
                <div style={{
                  fontFamily: "var(--font-arabic-stack)", direction: "rtl",
                  fontSize: "1rem", color: "#C9A85E", lineHeight: 1.6, marginBottom: 4,
                }}>
                  وَمَا عَلَيْنَا إِلَّا الْبَلَاغُ الْمُبِينُ
                </div>
                <div style={{
                  fontFamily: "var(--font-serif-stack)", fontStyle: "italic",
                  fontSize: ".7rem", color: "rgba(241,233,216,.5)",
                }}>
                  "Clear propagation is our only responsibility." — Sūrah Yāsīn 36:17
                </div>
              </div>
            </div>

            {/* Column 2: Knowledge */}
            <div>
              <h5 style={{
                fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", letterSpacing: ".14em",
                textTransform: "uppercase", color: "#B08D4C", fontWeight: 600,
                marginBottom: 14, paddingBottom: 8,
                borderBottom: "1px solid rgba(176,141,76,.2)",
              }}>Knowledge</h5>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Fatwa Archive", page: "fatwas" },
                  { label: "Articles", page: "articles" },
                  { label: "Resource Library", page: "downloads" },
                  { label: "Financial Indicators", page: "financials" },
                ].map((item, i) => (
                  <button key={i} onClick={() => navigate(item.page)} style={{
                    background: "none", border: "none", cursor: "pointer", textAlign: "left",
                    fontFamily: "var(--font-serif-stack)", fontSize: ".82rem",
                    color: "rgba(241,233,216,.65)", padding: 0,
                    transition: "color .2s, padding-left .2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#F1E9D8"; e.currentTarget.style.paddingLeft = "6px"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(241,233,216,.65)"; e.currentTarget.style.paddingLeft = "0"; }}
                  >{item.label}</button>
                ))}
              </div>
            </div>

            {/* Column 3: Organisation */}
            <div>
              <h5 style={{
                fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", letterSpacing: ".14em",
                textTransform: "uppercase", color: "#B08D4C", fontWeight: 600,
                marginBottom: 14, paddingBottom: 8,
                borderBottom: "1px solid rgba(176,141,76,.2)",
              }}>Organisation</h5>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Useful Links", page: "links" },
                  { label: "Contact Us", page: "contact" },
                  { label: "Announcements", page: "announcements" },
                  { label: "Islamic Calendar", page: "calendar" },
                ].map((item, i) => (
                  <button key={i} onClick={() => navigate(item.page)} style={{
                    background: "none", border: "none", cursor: "pointer", textAlign: "left",
                    fontFamily: "var(--font-serif-stack)", fontSize: ".82rem",
                    color: "rgba(241,233,216,.65)", padding: 0,
                    transition: "color .2s, padding-left .2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#F1E9D8"; e.currentTarget.style.paddingLeft = "6px"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(241,233,216,.65)"; e.currentTarget.style.paddingLeft = "0"; }}
                  >{item.label}</button>
                ))}
              </div>
            </div>

            {/* Column 4: Contact */}
            <div>
              <h5 style={{
                fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", letterSpacing: ".14em",
                textTransform: "uppercase", color: "#B08D4C", fontWeight: 600,
                marginBottom: 14, paddingBottom: 8,
                borderBottom: "1px solid rgba(176,141,76,.2)",
              }}>Contact</h5>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <a href="https://wa.me/27786786713" target="_blank" rel="noopener noreferrer" style={{
                  fontFamily: "var(--font-serif-stack)", fontSize: ".82rem",
                  color: "rgba(241,233,216,.65)", textDecoration: "none",
                  transition: "color .2s, padding-left .2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#F1E9D8"; e.currentTarget.style.paddingLeft = "6px"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(241,233,216,.65)"; e.currentTarget.style.paddingLeft = "0"; }}
                >Fatwā Q&A — WhatsApp Only</a>
                <a href="https://wa.me/27786786713" target="_blank" rel="noopener noreferrer" style={{
                  fontFamily: "var(--font-mono-stack)", fontSize: ".78rem",
                  color: "rgba(241,233,216,.65)", textDecoration: "none",
                  transition: "color .2s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#F1E9D8"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(241,233,216,.65)"}
                >+27 786 786 713</a>
                <a href="mailto:admin@jamiat.joburg" style={{
                  fontFamily: "var(--font-mono-stack)", fontSize: ".78rem",
                  color: "rgba(241,233,216,.65)", textDecoration: "none",
                  transition: "color .2s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#F1E9D8"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(241,233,216,.65)"}
                >admin@jamiat.joburg</a>
                <div style={{
                  fontFamily: "var(--font-sans-stack)", fontSize: ".72rem",
                  color: "rgba(241,233,216,.4)", lineHeight: 1.5, marginTop: 4,
                }}>
                  P.O. Box 961195, Brixton<br />2019, Johannesburg, South Africa
                </div>
              </div>
            </div>

            {/* Column 5: Banking Details */}
            <div>
              <h5 style={{
                fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", letterSpacing: ".14em",
                textTransform: "uppercase", color: "#B08D4C", fontWeight: 600,
                marginBottom: 14, paddingBottom: 8,
                borderBottom: "1px solid rgba(176,141,76,.2)",
              }}>Banking Details</h5>
              <dl className="banking-block">
                <dt>Account Name</dt>
                <dd>Jamiatul Ulama Johannesburg NPC</dd>
                <dt>Bank / Branch</dt>
                <dd>FNB · 210 835</dd>
                <dt>Account Number</dt>
                <dd>
                  6321 4722 399
                  <button className="copy-btn" onClick={async (e) => {
                    const btn = e.currentTarget;
                    if (!btn) return;
                    const text = "63214722399";
                    let success = false;
                    try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(text);
                        success = true;
                      } else {
                        // Fallback for older browsers / insecure contexts
                        const ta = document.createElement("textarea");
                        ta.value = text;
                        ta.style.position = "fixed"; ta.style.opacity = "0";
                        document.body.appendChild(ta);
                        ta.select();
                        success = document.execCommand("copy");
                        document.body.removeChild(ta);
                      }
                    } catch { success = false; }
                    btn.textContent = success ? "✓ Copied" : "✗ Failed";
                    btn.classList.add(success ? "copied" : "");
                    setTimeout(() => { if (btn) { btn.textContent = "Copy"; btn.classList.remove("copied"); } }, 2000);
                  }}>Copy</button>
                </dd>
                <dt>Swift Code</dt>
                <dd>FIRNZAJJ</dd>
                <dt>Note</dt>
                <dd style={{ fontSize: ".66rem", color: "rgba(241,233,216,.35)", lineHeight: 1.5, marginTop: 4 }}>
                  Please specify Lillah, interest, or Zakaat. Add extra for cash deposit Zakaat.
                </dd>
              </dl>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            position: "relative",
            borderTop: "1px solid rgba(176,141,76,.15)",
            padding: "14px 24px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 10,
            fontFamily: "var(--font-sans-stack)", fontSize: ".72rem",
            color: "rgba(241,233,216,.35)",
          }}>
            <span>© 1448 AH · Jamiatul Ulama Johannesburg · All content verified by the Darul Iftā</span>
            <span style={{ fontFamily: "var(--font-arabic-stack)", direction: "rtl", color: "rgba(241,233,216,.2)" }}>
              وَمَا عَلَيْنَا إِلَّا الْبَلَاغُ الْمُبِينُ · يس ١٧
            </span>
            {/* Discreet Editor entry */}
            <button
              onClick={() => isEditor ? setPanelOpen(true) : setLoginOpen(true)}
              aria-label="Editor access"
              title={isEditor ? "Open Editor Panel (Cmd+Shift+A)" : "Editor sign-in (Cmd+Shift+A)"}
              style={{
                background: "transparent", border: "none",
                color: "rgba(241,233,216,.12)", cursor: "pointer",
                padding: 4, transition: "color .25s",
                display: "inline-flex", alignItems: "center", gap: 4,
                fontFamily: "var(--font-sans-stack)", fontSize: ".68rem",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#C9A85E"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(241,233,216,.12)"}
            >
              {isEditor ? <ShieldCheck size={11} /> : <Lock size={11} />}
              {isEditor ? "Editor" : ""}
            </button>
          </div>
        </div>
      </footer>

      {/* Overlays */}
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        articles={articles}
        fatwas={fatwas}
        downloads={downloads}
        onOpenArticle={a => { setActiveArticle(a); }}
        onOpenFatwa={f => setActiveFatwa(f)}
        onNavigate={navigate}
      />
      <ArticleModal article={activeArticle} onClose={() => setActiveArticle(null)} />
      <FatwaModal fatwa={activeFatwa} onClose={() => setActiveFatwa(null)} />

      {/* Editor auth + admin panel */}
      <AdminLogin
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => {
          // The useEffect watching `status` will close the login modal and
          // open the panel automatically. This callback is a fallback.
          setLoginOpen(false);
        }}
      />
      <AdminPanel
        open={panelOpen && isEditor}
        onClose={() => setPanelOpen(false)}
        onSessionExpired={() => { setPanelOpen(false); setLoginOpen(true); showToast("Session expired. Please sign in again."); }}
      />

      {/* Website Tour — triggered by clicking the flag */}
      <WebsiteTour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        onNavigate={navigate}
      />

      {/* WhatsApp popup — auto-appears after 5s, connects immediately */}
      <WhatsAppPopup />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "var(--forest)", color: "var(--gold-pale)",
          padding: "12px 22px", borderRadius: 4, border: "1px solid var(--gold)",
          fontFamily: "var(--font-sans-stack)", fontSize: ".85rem",
          boxShadow: "0 6px 24px rgba(0,0,0,.3)", zIndex: 200,
          maxWidth: "90vw", textAlign: "center",
        }} className="page-flip-enter">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ─── Page-frame helpers ─── */
function FullPage({ title, arabic, sub, children }: { title: string; arabic: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="bilingual-title" style={{ marginBottom: 8 }}>
        <span className="ar">{arabic}</span>
        <span className="en">{title}</span>
      </div>
      <p className="bilingual-sub" style={{ marginBottom: 18 }}>{sub}</p>
      {children}
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; onClick?: () => void; href?: string | null }[] }) {
  return (
    <div>
      <h5 style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 10 }}>{title}</h5>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it, i) => (
          it.href !== undefined && it.href !== null ? (
            <a key={i} href={it.href || "#"} target={it.href?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".85rem", color: "var(--ink-mid)", textDecoration: "none", cursor: "pointer", transition: "color .15s" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--forest)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--ink-mid)"}
            >{it.label}</a>
          ) : (
            <button key={i} onClick={it.onClick} style={{ textAlign: "left", background: "none", border: "none", padding: 0, fontFamily: "var(--font-serif-stack)", fontSize: ".85rem", color: "var(--ink-mid)", cursor: "pointer", transition: "color .15s" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--forest)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--ink-mid)"}
            >{it.label}</button>
          )
        ))}
      </div>
    </div>
  );
}

/* ─── Headline Banner — intelligent, context-aware rotating display ─── */
/* Fetches the intelligent headline slide deck from /api/moon-sighting, which
   already applies all filtering rules:
    - Last-week suppression of month-specific announcements
    - Moon-sighting alert prominence when within 5 days of month-end
    - Transition hadith for the upcoming month
    - Ushering hadith for early-month welcoming
    - Rotating hadith with 3-month cycle (no repeats)
   Each slide is 7 seconds. Hover pauses. */
type ApiSlide = {
  id: string;
  type: "hadith" | "announcement" | "moon-sighting" | "month-usher";
  text: string;
  source?: string;
  title?: string;
  date?: string;
  kind?: string;
  priority: number;
};
function HeadlineBanner({ hadiths, announcements, hadithIdx, onNavigate }: {
  hadiths: { id: number; text: string; source: string }[];
  announcements: { id: number; title: string; body: string; date: string; kind: string }[];
  hadithIdx: number;
  onNavigate: (p: string) => void;
}) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [apiSlides, setApiSlides] = useState<ApiSlide[] | null>(null);

  // Fetch intelligent slide deck from the API
  useEffect(() => {
    let mounted = true;
    fetch("/api/moon-sighting")
      .then(r => r.json())
      .then(d => {
        if (!mounted) return;
        if (d?.success && Array.isArray(d.intelligentFilter?.headlineSlides)) {
          setApiSlides(d.intelligentFilter.headlineSlides);
        }
      })
      .catch(() => {});
    // Refresh every 10 minutes to pick up state changes
    const refresh = setInterval(() => {
      fetch("/api/moon-sighting").then(r => r.json()).then(d => {
        if (!mounted) return;
        if (d?.success && Array.isArray(d.intelligentFilter?.headlineSlides)) {
          setApiSlides(d.intelligentFilter.headlineSlides);
        }
      }).catch(() => {});
    }, 10 * 60 * 1000);
    return () => { mounted = false; clearInterval(refresh); };
  }, []);

  // Build slides: if API slides available, use them; else fall back to local build
  const slides: ApiSlide[] = apiSlides && apiSlides.length > 0
    ? apiSlides
    : (() => {
        const localSlides: ApiSlide[] = [];
        const latestAnn = announcements[0];
        if (hadiths.length > 0) {
          const h = hadiths[hadithIdx % hadiths.length];
          localSlides.push({ id: `h1`, type: "hadith", text: h.text, source: h.source, kind: "rotating", priority: 50 });
        }
        if (latestAnn) {
          localSlides.push({ id: `a1`, type: "announcement", text: latestAnn.title, title: latestAnn.title, date: latestAnn.date, kind: latestAnn.kind, priority: 70 });
        }
        if (hadiths.length > 1) {
          const h2 = hadiths[(hadithIdx + 1) % hadiths.length];
          localSlides.push({ id: `h2`, type: "hadith", text: h2.text, source: h2.source, kind: "rotating", priority: 50 });
        }
        return localSlides;
      })();

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const t = setInterval(() => setSlideIdx(i => (i + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[slideIdx % slides.length];
  const isMoon = slide.type === "moon-sighting" || slide.kind === "moon";
  const isUsher = slide.type === "month-usher";
  const isAnn = slide.type === "announcement";
  const isTransition = slide.kind === "transition";

  // Type-based labels and colors
  let kindLabel = "Notice";
  let kindColor = "#7DB8D4";
  let bgGradient = "linear-gradient(135deg, #1B2A38 0%, #2A2622 40%, #5A4A2A 100%)";
  let leftBarColor = "#B08D4C";
  let labelIcon: string = "ﷺ";

  if (isMoon) {
    kindLabel = "Moon Sighting";
    kindColor = "#5dd4a1";
    bgGradient = "linear-gradient(135deg, #1B2A38 0%, #2E6E6A 100%)";
    leftBarColor = kindColor;
    labelIcon = "☾";
  } else if (isUsher) {
    kindLabel = "New Month Usher";
    kindColor = "#5dd4a1";
    bgGradient = "linear-gradient(135deg, #2E6E6A 0%, #1B2A38 100%)";
    leftBarColor = kindColor;
    labelIcon = "✦";
  } else if (isTransition) {
    kindLabel = "Upcoming Month · Hadith";
    kindColor = "#C9A85E";
    bgGradient = "linear-gradient(135deg, #1B2A38 0%, #5A4A2A 100%)";
    leftBarColor = kindColor;
  } else if (isAnn) {
    kindLabel = slide.kind === "ramadan" ? "Ramaḍān" : slide.kind === "urgent" ? "Urgent" : slide.kind === "eid" ? "Eid" : slide.kind === "hajj" ? "Ḥajj" : "Notice";
    kindColor = slide.kind === "ramadan" ? "#C9A85E" : slide.kind === "urgent" ? "#E07070" : slide.kind === "eid" ? "#5dd4a1" : slide.kind === "hajj" ? "#B08D4C" : "#7DB8D4";
    bgGradient = `linear-gradient(135deg, #1B2A38 0%, #243845 40%, #2E6E6A 100%)`;
    leftBarColor = kindColor;
  }

  const hasAlertDot = isAnn || isMoon || isUsher;
  const alertDotColor = isMoon ? "#5dd4a1" : isUsher ? "#5dd4a1" : isAnn ? kindColor : "#B08D4C";

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={() => { if (isAnn || isMoon) onNavigate("announcements"); }}
      style={{
        marginTop: 8,
        position: "relative",
        overflow: "hidden",
        cursor: (isAnn || isMoon) ? "pointer" : "default",
        background: bgGradient,
        color: "#F1E9D8",
        borderRadius: 0,
        minHeight: 56,
        display: "flex",
        flexDirection: "column",
        transition: "background .8s cubic-bezier(0.65,0,0.35,1)",
        borderTop: "1px solid rgba(176,141,76,.3)",
        borderBottom: "1px solid rgba(176,141,76,.3)",
      }}
    >
      {/* Decorative left accent bar */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
        background: leftBarColor,
        boxShadow: (isAnn || isMoon || isUsher) ? `0 0 12px ${alertDotColor}88` : "none",
      }} />

      {/* Top row: category label + slide dots */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 20px 4px 24px",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasAlertDot ? (
            <>
              {/* Pulsing alert dot */}
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: alertDotColor, flexShrink: 0,
                boxShadow: `0 0 8px ${alertDotColor}`,
                animation: "livepulse 1.5s infinite",
              }} />
              <span style={{
                fontFamily: "var(--font-sans-stack)", fontSize: ".56rem", letterSpacing: ".2em",
                textTransform: "uppercase", fontWeight: 700, color: alertDotColor,
              }}>{kindLabel}</span>
            </>
          ) : (
            <>
              <span style={{ fontFamily: "var(--font-arabic-display)", fontSize: ".85rem", color: "#B08D4C", opacity: .8 }}>{labelIcon}</span>
              <span style={{
                fontFamily: "var(--font-sans-stack)", fontSize: ".56rem", letterSpacing: ".2em",
                textTransform: "uppercase", fontWeight: 700, color: "#B08D4C",
              }}>{isTransition ? "Upcoming Month · Hadith" : "Ḥadīth of the Moment"}</span>
            </>
          )}
        </div>
        {/* Slide indicator dots */}
        <div style={{ display: "flex", gap: 5, opacity: .5, flexShrink: 0, marginLeft: 12 }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: i === slideIdx % slides.length ? "#F1E9D8" : "rgba(241,233,216,.25)",
              transition: "background .3s, transform .3s",
              transform: i === slideIdx % slides.length ? "scale(1.3)" : "scale(1)",
            }} />
          ))}
        </div>
      </div>

      {/* Bottom row: main content — auto-adjusts height, wraps fully */}
      <div key={slideIdx} style={{
        padding: "0 20px 12px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        animation: "headlineSlide .8s cubic-bezier(0.65,0,0.35,1) both",
      }}>
        {(isAnn || isMoon) ? (
          <>
            {/* Announcement / moon-sighting title — wraps fully, no truncation */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap",
            }}>
              <span style={{
                fontFamily: "var(--font-display-stack)", fontSize: ".95rem", fontWeight: 600,
                color: "#F1E9D8", letterSpacing: ".01em", lineHeight: 1.4,
                flex: "1 1 auto", minWidth: 0,
                wordBreak: "break-word", overflowWrap: "break-word",
              }}>
                {slide.title || slide.text}
              </span>
              {slide.date && (
                <span style={{
                  fontFamily: "var(--font-mono-stack)", fontSize: ".62rem",
                  color: "rgba(241,233,216,.4)", whiteSpace: "nowrap", flexShrink: 0,
                  alignSelf: "center",
                }}>{slide.date}</span>
              )}
              <span style={{
                fontFamily: "var(--font-sans-stack)", fontSize: ".62rem",
                color: alertDotColor, whiteSpace: "nowrap", flexShrink: 0,
                padding: "2px 8px", background: `rgba(255,255,255,.08)`, borderRadius: 2,
                border: `1px solid ${alertDotColor}33`,
                alignSelf: "center",
              }}>{isMoon ? "View →" : "Read →"}</span>
            </div>
          </>
        ) : (
          <>
            {/* Hadith / usher / transition text — wraps fully, no truncation */}
            <div style={{
              fontFamily: "var(--font-serif-stack)", fontStyle: "italic",
              fontSize: ".88rem", color: "rgba(241,233,216,.9)", lineHeight: 1.5,
              wordBreak: "break-word", overflowWrap: "break-word",
            }}>
              &ldquo;{slide.text}&rdquo;
            </div>
            {/* Source — wraps if needed, stays on its own line */}
            {slide.source && (
              <div style={{
                fontFamily: "var(--font-mono-stack)", fontSize: ".6rem",
                color: "rgba(241,233,216,.45)",
                wordBreak: "break-word", overflowWrap: "break-word",
              }}>
                — {slide.source}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Home view ─── */
function HomeView({ articles, fatwas, downloads, announcements, dyks, onNavigate, onOpenArticle, onOpenFatwa, onSubmitQuestion }: {
  articles: Article[];
  fatwas: Fatwa[];
  downloads: DownloadItem[];
  announcements: { id: number; title: string; body: string; date: string; kind: string }[];
  dyks: { id: number; text: string }[];
  onNavigate: (p: string) => void;
  onOpenArticle: (a: Article) => void;
  onOpenFatwa: (f: Fatwa) => void;
  onSubmitQuestion: (q: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 28 }} className="home-grid">
      <div>
        {/* Moon Sighting Alert — auto-shows in last 5 days of Hijri month */}
        <MoonSightingAlert />

        {/* Featured */}
        <SectionHead en="Featured" ar="مميز" />
        <div className="scard glow-on-hover clickable" style={{ cursor: "pointer", padding: 0, marginBottom: 22 }} onClick={() => onOpenArticle(articles[0])}>
          <ImagePlaceholder
            src={(articles[0] as any)?.imageUrl}
            alt={articles[0]?.title || "Featured article"}
            slotId={`article-${articles[0]?.id}-hero`}
            ratio="21:9"
            lazy={false}
          />
          <div className="sbody" style={{ padding: "20px 22px" }}>
            <p style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 6 }}>
              Ijtihād &amp; Contemporary Fiqh
            </p>
            <h3 style={{ fontFamily: "var(--font-serif-stack)", fontSize: "1.45rem", fontWeight: 600, color: "var(--forest)", lineHeight: 1.25, marginBottom: 8 }}>
              {articles[0]?.title}
            </h3>
            <p style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".95rem", color: "var(--ink-mid)", lineHeight: 1.7 }}>
              {articles[0]?.excerpt}
            </p>
            <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6, color: "var(--gold)", fontFamily: "var(--font-sans-stack)", fontSize: ".85rem", letterSpacing: ".04em" }}>
              Read the full article <ChevronRight size={14} />
            </div>
          </div>
        </div>

        {/* Recent articles */}
        <SectionHead en="Recent Articles" ar="مقالات" actionLabel="View All" onAction={() => onNavigate("articles")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, marginBottom: 22 }}>
          {articles.slice(0, 4).map(a => (
            <div key={a.id} className="scard glow-on-hover clickable" style={{ cursor: "pointer", padding: 0 }} onClick={() => onOpenArticle(a)}>
              <ImagePlaceholder
                src={(a as any)?.imageUrl}
                alt={a.title}
                slotId={`article-${a.id}-card`}
                ratio="16:9"
              />
              <div className="sbody" style={{ padding: "14px 16px" }}>
                <span className="tag" style={{ marginBottom: 8, display: "inline-block" }}>{a.catLabel}</span>
                <h4 style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".98rem", fontWeight: 600, color: "var(--forest)", lineHeight: 1.35, marginBottom: 6 }}>
                  {a.title}
                </h4>
                <p style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".82rem", color: "var(--ink-mid)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {a.excerpt}
                </p>
                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--font-sans-stack)", fontSize: ".7rem", color: "var(--muted-foreground)" }}>
                  <span>{a.date}</span>
                  <span style={{ color: "var(--gold)" }}>Read →</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <GeometricDivider />

        {/* Fatwa list preview */}
        <SectionHead en="Fatwa Q&A" ar="فتاوى" actionLabel="View All" onAction={() => onNavigate("fatwas")} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {fatwas.slice(0, 4).map(f => (
            <div key={f.id} className="scard glow-on-hover clickable" style={{ cursor: "pointer", padding: 0 }} onClick={() => onOpenFatwa(f)}>
              <div className="sbody" style={{ padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: ".78rem", color: "var(--gold)", fontWeight: 600, paddingTop: 2, flexShrink: 0 }}>
                  № {String(f.id + 1).padStart(3, "0")}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".92rem", color: "var(--forest)", fontWeight: 500, lineHeight: 1.45, marginBottom: 4 }}>
                    {f.q}
                  </p>
                  <span className="tag" style={{ background: "rgba(184,146,30,.18)", color: "var(--forest)", fontSize: ".62rem" }}>{f.cat}</span>
                </div>
                <ChevronRight size={14} style={{ color: "var(--gold)", marginTop: 4, flexShrink: 0 }} />
              </div>
            </div>
          ))}
        </div>

        <GeometricDivider />

        {/* Latest announcement */}
        <SectionHead en="Latest Announcement" ar="إعلان" actionLabel="View All" onAction={() => onNavigate("announcements")} />
        <AnnouncementCard announcement={announcements[0]} />
      </div>

      {/* Sidebar */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 14 }} className="home-sidebar">
        <PrayerTimes />
        <IslamicCalendar variant="compact" />
        <DidYouKnow initial={dyks} />
        <FinancialCard onNavigate={onNavigate} />
        <ContactCard />
        <DownloadsCard downloads={downloads} onNavigate={onNavigate} />
      </aside>
    </div>
  );
}

function SectionHead({ en, ar, actionLabel, onAction }: { en: string; ar: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <h2 style={{ fontFamily: "var(--font-serif-stack)", fontSize: "1.3rem", fontWeight: 600, color: "var(--forest)" }}>
        {en}
      </h2>
      <span style={{ fontFamily: "var(--font-arabic-stack)", direction: "rtl", color: "var(--gold)", fontSize: "1.15rem" }}>{ar}</span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, var(--gold-pale), transparent)" }} />
      {actionLabel && (
        <button onClick={onAction} style={{ background: "none", border: "none", fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", color: "var(--gold)", cursor: "pointer", letterSpacing: ".04em" }}>
          {actionLabel} →
        </button>
      )}
    </div>
  );
}

function GeometricDivider() {
  return (
    <div className="geometric-divider" aria-hidden="true">
      <div className="line" />
      <div className="diamond" />
      <div className="star" />
      <div className="star big" />
      <div className="star" />
      <div className="diamond" />
      <div className="line" />
    </div>
  );
}

function AnnouncementCard({ announcement }: { announcement: { id: number; title: string; body: string; date: string; kind: string } }) {
  if (!announcement) return null;
  const color = announcement.kind === "moon" ? "var(--teal)" :
                announcement.kind === "urgent" ? "var(--maroon)" :
                announcement.kind === "ramadan" ? "var(--forest)" : "var(--gold)";
  const annIcon = announcement.kind === "moon" ? Moon :
                  announcement.kind === "urgent" ? AlertCircle :
                  announcement.kind === "ramadan" ? Sparkles : Bell;
  return (
    <div className="scard" style={{ padding: 0, borderLeft: `4px solid ${color}` }}>
      {/* Visual placeholder — communicates announcement type at a glance */}
      <ImagePlaceholder
        mode="pattern"
        slotId={`announcement-${announcement.id}-visual`}
        ratio="21:9"
        icon={annIcon}
      />
      <div className="sbody" style={{ padding: "14px 18px" }}>
        <h4 style={{ fontFamily: "var(--font-serif-stack)", fontSize: "1.05rem", fontWeight: 600, color: "var(--forest)", marginBottom: 6 }}>
          {announcement.title}
        </h4>
        <p style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".88rem", color: "var(--ink-mid)", lineHeight: 1.65 }}>
          {announcement.body}
        </p>
        <p style={{ marginTop: 8, fontFamily: "var(--font-sans-stack)", fontSize: ".7rem", color: "var(--muted-foreground)", letterSpacing: ".05em" }}>
          {announcement.date}
        </p>
      </div>
    </div>
  );
}

function FinancialCard({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="scard clickable" style={{ cursor: "pointer", padding: 0 }} onClick={() => onNavigate("financials")}>
      <div className="shead">
        <span>Financial Indicators</span>
        <span className="ar">المؤشرات المالية</span>
      </div>
      <div className="sbody">
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans-stack)", fontSize: ".78rem" }}>
          <tbody>
            <tr style={{ background: "rgba(11,61,46,.06)" }}><td style={{ padding: "5px 6px", color: "var(--ink-mid)" }}><strong>Zakāt Niṣāb</strong></td><td style={{ padding: "5px 6px", textAlign: "right", color: "var(--forest)", fontWeight: 600 }}>R22,136.44</td></tr>
            <tr><td style={{ padding: "5px 6px", color: "var(--ink-mid)" }}>Mahr Fāṭimī</td><td style={{ padding: "5px 6px", textAlign: "right", color: "var(--forest)" }}>R55,342.04</td></tr>
            <tr><td style={{ padding: "5px 6px", color: "var(--ink-mid)" }}>Gold 24 kt/g</td><td style={{ padding: "5px 6px", textAlign: "right", color: "var(--forest)" }}>R2,252.68</td></tr>
            <tr><td style={{ padding: "5px 6px", color: "var(--ink-mid)" }}>Silver/g</td><td style={{ padding: "5px 6px", textAlign: "right", color: "var(--forest)" }}>R36.15</td></tr>
            <tr><td style={{ padding: "5px 6px", color: "var(--ink-mid)" }}>Fidyah (Ḥanafī)</td><td style={{ padding: "5px 6px", textAlign: "right", color: "var(--forest)" }}>R38.00</td></tr>
          </tbody>
        </table>
        <p style={{ marginTop: 10, fontFamily: "var(--font-sans-stack)", fontSize: ".66rem", color: "var(--muted-foreground)", textAlign: "center" }}>
          As at 22 June 2026 · 06 Muḥarram 1448
        </p>
      </div>
    </div>
  );
}

function ContactCard() {
  return (
    <div className="scard">
      <div className="shead">
        <span>Contact &amp; WhatsApp</span>
        <span className="ar">تواصل</span>
      </div>
      <div className="sbody" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <a href="https://wa.me/27786786713" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "rgba(37,211,102,.10)", border: "1px solid rgba(37,211,102,.3)", borderRadius: 3, textDecoration: "none" }}>
          <MessageSquare size={16} style={{ color: "#25D366", flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".72rem", color: "var(--muted-foreground)" }}>Fatwā Q&A · WhatsApp Only</div>
            <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".88rem", color: "var(--forest)", fontWeight: 600 }}>+27 786 786 713</div>
          </div>
        </a>
        <a href="mailto:admin@jamiat.joburg" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "rgba(184,146,30,.10)", border: "1px solid var(--parch-dark)", borderRadius: 3, textDecoration: "none" }}>
          <Mail size={16} style={{ color: "var(--gold)", flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".72rem", color: "var(--muted-foreground)" }}>Email</div>
            <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".85rem", color: "var(--forest)", fontWeight: 600 }}>admin@jamiat.joburg</div>
          </div>
        </a>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", background: "rgba(11,61,46,.04)", borderRadius: 3 }}>
          <MapPin size={16} style={{ color: "var(--forest)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".72rem", color: "var(--muted-foreground)" }}>Postal Address</div>
            <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", color: "var(--ink-mid)", lineHeight: 1.5 }}>
              P.O. Box 961195, Brixton, 2019<br />Johannesburg, South Africa
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DownloadsCard({ downloads, onNavigate }: { downloads: DownloadItem[]; onNavigate: (p: string) => void }) {
  return (
    <div className="scard">
      <div className="shead">
        <span>Resource Library</span>
        <span className="ar">مكتبة</span>
      </div>
      <div className="sbody" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {downloads.slice(0, 3).map(d => (
          <a key={d.id} href={`/api/download?file=${encodeURIComponent(d.filename)}&title=${encodeURIComponent(d.title)}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid var(--parch-dark)", borderRadius: 3, textDecoration: "none", transition: "background .15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(11,61,46,.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <FileText size={14} style={{ color: "var(--gold)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".82rem", color: "var(--forest)", fontWeight: 500 }}>{d.title}</div>
              <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: ".62rem", color: "var(--muted-foreground)" }}>{d.meta}</div>
            </div>
            <Download size={12} style={{ color: "var(--gold)" }} />
          </a>
        ))}
        <button onClick={() => onNavigate("downloads")} className="chip active" style={{ marginTop: 6, justifyContent: "center" }}>
          View All Downloads →
        </button>
      </div>
    </div>
  );
}

/* ─── Financials view ─── */
function FinancialsView() {
  return (
    <div>
      <div className="bilingual-title" style={{ marginBottom: 8 }}>
        <span className="ar">المؤشرات المالية</span>
        <span className="en">Islamic Financial Indicators</span>
      </div>
      <p className="bilingual-sub" style={{ marginBottom: 18 }}>
        Updated values for Zakāh, Mahr, Gold &amp; Krugerrand · As at 22 June 2026
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }} className="fin-grid">
        <div className="scard">
          <div className="shead"><span>Zakāh &amp; Mahr Values</span><span className="ar">الزكاة والمهر</span></div>
          <div className="sbody">
            <FinTable rows={[
              { sec: "Zakāh Obligations" },
              { l: "Zakāt Niṣāb", r: "R22,136.44", hi: true, bold: true },
              { sec: "Mahr" },
              { l: "Mahr Fāṭimī / Mahr Azwājin Nabī ﷺ", r: "R55,342.04", hi: true },
              { l: "Minimum Mahr", r: "R1,106.84" },
              { sec: "Fidyah & Expiation" },
              { l: "Fidyah — Ḥanafī", r: "R38.00" },
              { l: "Fidyah — Shāfi'ī", r: "R13.00" },
            ]} />
          </div>
        </div>
        <div className="scard">
          <div className="shead"><span>Gold &amp; Silver Prices</span><span className="ar">الذهب والفضة</span></div>
          <div className="sbody">
            <FinTable rows={[
              { sec: "Gold (per gram)" },
              { l: "9 karat/g", r: "R844.76" },
              { l: "14 karat/g", r: "R1,306.55", hi: true },
              { l: "18 karat/g", r: "R1,689.51" },
              { l: "21 karat/g", r: "R1,971.10", hi: true },
              { l: "22 karat/g", r: "R2,065.03" },
              { l: "24 karat/g", r: "R2,252.68", hi: true },
              { sec: "Silver" },
              { l: "Silver/g", r: "R36.15" },
              { sec: "Krugerrand (Selling Price)" },
              { l: "1 Krugerrand (1 oz)", r: "R73,300" },
              { l: "½ Krugerrand (0.5 oz)", r: "R36,700", hi: true },
              { l: "¼ Krugerrand (0.25 oz)", r: "R18,450" },
              { l: "1/10 Krugerrand (0.10 oz)", r: "R8,300", hi: true },
            ]} />
            <p style={{ marginTop: 10, fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", color: "var(--muted-foreground)", textAlign: "center" }}>
              As at 17:00 · 06 Muḥarram 1448 · 22 June 2026
            </p>
            <p style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".65rem", color: "var(--muted-foreground)", textAlign: "center", fontStyle: "italic" }}>
              * Krugerrand values are selling price (market value)
            </p>
          </div>
        </div>
      </div>
      <div className="scard" style={{ marginTop: 22, borderLeft: "4px solid var(--gold)" }}>
        <div className="sbody" style={{ padding: "16px 20px" }}>
          <h4 style={{ fontFamily: "var(--font-serif-stack)", fontSize: "1.1rem", color: "var(--forest)", marginBottom: 8 }}>
            About the Niṣāb Threshold
          </h4>
          <p style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".92rem", color: "var(--ink-mid)", lineHeight: 1.75 }}>
            The Niṣāb is the minimum amount of wealth a Muslim must possess before Zakāh becomes obligatory. It is calculated as the equivalent of 612.35 grams of silver or 87.48 grams of gold. The South African Rand values above are updated periodically by the Jamiat based on current precious metal prices. Any Muslim possessing this amount (or equivalent assets) for a full lunar year must pay 2.5% as Zakāh.
          </p>
        </div>
      </div>
    </div>
  );
}

function FinTable({ rows }: { rows: ({ sec: string } | { l: string; r: string; hi?: boolean; bold?: boolean })[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans-stack)", fontSize: ".85rem" }}>
      <tbody>
        {rows.map((row, i) => "sec" in row ? (
          <tr key={i} style={{ background: "rgba(184,146,30,.10)" }}>
            <td colSpan={2} style={{ padding: "6px 8px", color: "var(--forest)", fontWeight: 600, letterSpacing: ".05em", fontSize: ".72rem", textTransform: "uppercase" }}>
              {row.sec}
            </td>
          </tr>
        ) : (
          <tr key={i} style={{ background: row.hi ? "rgba(11,61,46,.04)" : "transparent", borderBottom: "1px solid var(--parch-dark)" }}>
            <td style={{ padding: "6px 8px", color: "var(--ink)", fontWeight: row.bold ? 600 : 400 }}>{row.l}</td>
            <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--forest)", fontWeight: row.bold ? 700 : 500 }}>{row.r}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── Announcements view ─── */
function AnnouncementsView({ announcements }: { announcements: { id: number; title: string; body: string; date: string; kind: string }[] }) {
  return (
    <div>
      <div className="bilingual-title" style={{ marginBottom: 8 }}>
        <span className="ar">إعلانات</span>
        <span className="en">Announcements</span>
      </div>
      <p className="bilingual-sub" style={{ marginBottom: 18 }}>
        Community notices, moon sightings, and important updates
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {announcements.map(a => <AnnouncementCard key={a.id} announcement={a} />)}
      </div>
    </div>
  );
}

/* ─── Useful Links view ─── */
const USEFUL_LINKS = [
  { name: "Jamiatul Ulama of South Africa", url: "http://jusa.co.za", domain: "jusa.co.za", desc: "National body of Muslim scholars" },
  { name: "The Mujlisul Ulama of South Africa", url: "http://www.themajlis.co.za", domain: "themajlis.co.za", desc: "Islamic guidance and publications" },
  { name: "Beneficial Islamic Literature", url: "http://www.asic-sa.co.za", domain: "asic-sa.co.za", desc: "Authentic Islamic literature resource" },
  { name: "Jamiatul Ulama Gauteng", url: "http://www.thejamiat.co.za", domain: "thejamiat.co.za", desc: "Sister organisation — Gauteng region" },
  { name: "Jamiatul Ulama (Northern Cape)", url: "http://www.jamiatnc.co.za", domain: "jamiatnc.co.za", desc: "Sister organisation — Northern Cape" },
  { name: "The Majlis Publications", url: "http://www.themajlis.info", domain: "themajlis.info", desc: "Islamic publications and articles" },
];

function UsefulLinksView() {
  return (
    <div>
      <div className="bilingual-title" style={{ marginBottom: 8 }}>
        <span className="ar">روابط مفيدة</span>
        <span className="en">Useful Links</span>
      </div>
      <p className="bilingual-sub" style={{ marginBottom: 18 }}>Affiliated organisations and resources</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {USEFUL_LINKS.map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="scard glow-on-hover"
            style={{
              padding: 0, textDecoration: "none",
              cursor: "pointer",
            }}
          >
            <div className="sbody" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 4, flexShrink: 0,
                  background: "linear-gradient(135deg, rgba(46,110,106,.12), rgba(176,141,76,.12))",
                  border: "1px solid rgba(46,110,106,.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Link2 size={16} style={{ color: "#2E6E6A" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "var(--font-serif-stack)", fontSize: ".95rem", fontWeight: 600,
                    color: "#1B2A38", lineHeight: 1.35, marginBottom: 2,
                  }}>
                    {link.name}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-mono-stack)", fontSize: ".68rem",
                    color: "#2E6E6A", letterSpacing: ".02em",
                  }}>
                    {link.domain}
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: "#B08D4C", marginTop: 4, flexShrink: 0 }} />
              </div>
              <p style={{
                fontFamily: "var(--font-serif-stack)", fontSize: ".8rem", color: "#5A5750",
                lineHeight: 1.5, margin: 0,
              }}>
                {link.desc}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Mission verse footer */}
      <div style={{
        marginTop: 28, padding: "20px 24px",
        background: "linear-gradient(135deg, rgba(46,110,106,.06), rgba(176,141,76,.06))",
        border: "1px solid rgba(176,141,76,.25)", borderRadius: 4,
        textAlign: "center",
      }}>
        <p style={{
          fontFamily: "var(--font-arabic-stack)", direction: "rtl",
          fontSize: "1.4rem", color: "#1B2A38", lineHeight: 1.5, marginBottom: 8,
        }}>
          وَمَا عَلَيْنَا إِلَّا الْبَلَاغُ الْمُبِينُ
        </p>
        <p style={{
          fontFamily: "var(--font-serif-stack)", fontStyle: "italic",
          fontSize: ".88rem", color: "#5A5750",
        }}>
          &ldquo;Clear propagation is our only responsibility.&rdquo; — Sūrah Yāsīn 36:17
        </p>
      </div>
    </div>
  );
}

/* ─── Contact view ─── */
function ContactView({ onSubmit }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <div>
      <div className="bilingual-title" style={{ marginBottom: 8 }}>
        <span className="ar">تواصل معنا</span>
        <span className="en">Contact Us</span>
      </div>
      <p className="bilingual-sub" style={{ marginBottom: 18 }}>Get in touch with the Jamiat</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }} className="contact-grid">
        <div className="scard">
          <div className="shead"><span>Office &amp; Postal Address</span><span className="ar">العنوان</span></div>
          <div className="sbody">
            <div style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".95rem", lineHeight: 1.75, color: "var(--ink)", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                <MapPin size={15} style={{ color: "var(--forest)", marginTop: 3, flexShrink: 0 }} />
                <div>
                  Jamiatul Ulama Johannesburg<br />
                  P.O. Box 961195, Brixton, 2019<br />
                  Johannesburg, South Africa
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Mail size={15} style={{ color: "var(--gold)", flexShrink: 0 }} />
                <a href="mailto:admin@jamiat.joburg" style={{ color: "var(--forest)", textDecoration: "none" }}>admin@jamiat.joburg</a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Mail size={15} style={{ color: "var(--gold)", flexShrink: 0 }} />
                <a href="mailto:jamiat.joburg@gmail.com" style={{ color: "var(--forest)", textDecoration: "none" }}>jamiat.joburg@gmail.com</a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={15} style={{ color: "var(--maroon)", flexShrink: 0 }} />
                Fax: 0865 777 786
              </div>
            </div>
            <iframe
              className="map-frame"
              height={200}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=Brixton,Johannesburg,South+Africa&output=embed"
              title="Map: Brixton, Johannesburg"
            />
          </div>
        </div>

        <div className="scard">
          <div className="shead"><span>WhatsApp &amp; Send a Message</span><span className="ar">رسالة</span></div>
          <div className="sbody">
            <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(37,211,102,.10)", border: "1px solid rgba(37,211,102,.3)", borderRadius: 3 }}>
              <strong style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".85rem", color: "var(--forest)" }}>
                Fatwā Q&A — WhatsApp Only:
              </strong>
              <a href="https://wa.me/27786786713" target="_blank" rel="noopener noreferrer" style={{ display: "block", fontFamily: "var(--font-mono-stack)", fontSize: "1rem", color: "var(--forest)", marginTop: 4, textDecoration: "none" }}>
                +27 786 786 713
              </a>
              <p style={{ marginTop: 6, color: "var(--maroon)", fontStyle: "italic", fontFamily: "var(--font-sans-stack)", fontSize: ".78rem" }}>
                Please submit queries via WhatsApp message only — no voice calls on this number.
              </p>
            </div>
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Your Name</label>
                <input name="name" type="text" placeholder="Full name" required className="input-parch" />
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Email / Phone</label>
                <input name="contact" type="text" placeholder="How to reach you" required className="input-parch" />
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Message</label>
                <textarea name="message" rows={4} placeholder="Your enquiry..." required className="input-parch" style={{ resize: "vertical" }} />
              </div>
              <button type="submit" className="chip active" style={{ alignSelf: "flex-start", padding: "10px 20px" }}>
                Send Message →
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { X, ChevronRight, ChevronLeft, Play, Pause, Sparkles, Compass, MapPin } from "lucide-react";

/**
 * WebsiteTour — Cinematic automated visual website tour with AWE.
 *
 * When triggered (by clicking the flag), this component provides:
 *   1. A cinematic welcome overlay with animated entrance
 *   2. Smooth page transitions with fade overlay between navigations
 *   3. Animated spotlight rings that pulse and glow around features
 *   4. Feature callouts with directional arrows pointing to highlights
 *   5. Smooth auto-scroll to bring features into view
 *   6. Rich narration with awe-inspiring language
 *   7. Progress tracking (both page-level and feature-level)
 *   8. Keyboard controls (ESC to close, Space to pause)
 *   9. A graceful farewell that returns to Home
 *
 * Every visual element uses smooth cubic-bezier transitions for
 * a polished, cinematic feel.
 */

interface TourStop {
  page: string;
  title: string;
  arabic: string;
  narration: string;
  features: FeatureSpot[];
  duration: number;
}

interface FeatureSpot {
  selector: string;
  label: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const TOUR_STOPS: TourStop[] = [
  {
    page: "home",
    title: "Home",
    arabic: "الرئيسية",
    narration: "Welcome to Jamiatul Ulama Johannesburg — your gateway to authentic Islamic guidance, scholarly wisdom, and spiritual enrichment.",
    duration: 5000,
    features: [
      {
        selector: ".brand-signature-frame",
        label: "Brand & Flag",
        description: "Click the flag anytime to restart this tour.",
        position: "bottom",
      },
      {
        selector: "[class*='MoonSightingAlert'], [class*='moon-sighting']",
        label: "Moon-Sighting Intelligence",
        description: "Appears in the last week of each Hijri month with crescent visibility data for Southern Africa.",
        position: "bottom",
      },
      {
        selector: ".prayer-grid, [class*='PrayerTimes']",
        label: "Live Prayer Times",
        description: "Sunrise and maghrib times for Johannesburg, with masjid jama'ah times.",
        position: "left",
      },
    ],
  },
  {
    page: "fatwas",
    title: "Fatwas & Q&A",
    arabic: "فتاوى",
    narration: "Authentic fatwas from the Darul Iftā — scholarly answers grounded in the Qur'ān, Sunnah, and the Ḥanafī school of jurisprudence.",
    duration: 4500,
    features: [
      {
        selector: ".bilingual-title, [class*='FatwaList'] h2",
        label: "Fatwa Archive",
        description: "Fatwas covering Zakāh, fasting, iʿtikāf, ḥalāl & ḥarām, and contemporary issues.",
        position: "bottom",
      },
      {
        selector: "[class*='FatwaList'] .scard, [class*='fatwa'] .scard",
        label: "Click to Explore",
        description: "Click any fatwa to read the full question and detailed answer in our elegant scroll-style reader with Arabic support.",
        position: "right",
      },
    ],
  },
  {
    page: "articles",
    title: "Articles",
    arabic: "مقالات",
    narration: "A treasury of 69 scholarly articles — verified knowledge from qualified ʿUlamā on Fiqh, Ṣalāh, Zakāh, and contemporary affairs.",
    duration: 4500,
    features: [
      {
        selector: ".bilingual-title, [class*='ArticleGrid'] h2",
        label: "Article Library",
        description: "Browse by category — Fiqh, Ṣalāh, Zakāh, Qurbānī, Akhlāq, and more. Every article is verified by the Darul Iftā.",
        position: "bottom",
      },
      {
        selector: ".article-grid, [class*='ArticleGrid'] .scard",
        label: "Read in Elegance",
        description: "Click any article to read it in the scroll-style reader.",
        position: "top",
      },
    ],
  },
  {
    page: "calendar",
    title: "Islamic Calendar",
    arabic: "التقويم",
    narration: "The Hijri calendar with South African moon-sighting dates — where astronomy meets the sacred.",
    duration: 5000,
    features: [
      {
        selector: ".cal-cell.today, [class*='calendar'] .today",
        label: "Today's Hijri Date",
        description: "Today's date is highlighted, based on the South African sighting calendar.",
        position: "bottom",
      },
      {
        selector: "[class*='IslamicCalendar'] input, [class*='converter']",
        label: "Date Converter",
        description: "Convert any Gregorian date to Hijri instantly — useful for planning, fasting, and Islamic events.",
        position: "top",
      },
    ],
  },
  {
    page: "financials",
    title: "Financial Indicators",
    arabic: "المؤشرات",
    narration: "Current Zakāt, Mahr, and precious metal rates — essential for fulfilling Islamic financial obligations with precision.",
    duration: 4500,
    features: [
      {
        selector: "[class*='FinancialsView'] .scard, .fin-grid .scard",
        label: "Zakāt Niṣāb",
        description: "The minimum threshold for Zakāt — updated regularly based on current gold and silver prices for accurate calculation.",
        position: "bottom",
      },
    ],
  },
  {
    page: "downloads",
    title: "Downloads",
    arabic: "مكتبة",
    narration: "A curated library of PDF booklets — professionally typeset and ready for printing and distribution.",
    duration: 4500,
    features: [
      {
        selector: "[class*='DownloadsGrid'] .scard, .download-item",
        label: "PDF Library",
        description: "Booklets on Iʿtikāf, Islamic dress code, Qurbānī rulings, Zakāh, and more.",
        position: "bottom",
      },
    ],
  },
  {
    page: "announcements",
    title: "Announcements",
    arabic: "إعلانات",
    narration: "Official announcements from the Jamiat — moon-sighting confirmations, Eid notices, and community messages.",
    duration: 4000,
    features: [
      {
        selector: "[class*='AnnouncementsView'] .scard, .announcement-item",
        label: "Latest Announcements",
        description: "Stay informed with official moon-sighting confirmations and important community messages from the Jamiat.",
        position: "bottom",
      },
    ],
  },
  {
    page: "links",
    title: "Useful Links",
    arabic: "روابط",
    narration: "Connect with trusted Islamic organizations across South Africa — a network of scholarly bodies.",
    duration: 4000,
    features: [
      {
        selector: "[class*='UsefulLinksView'] a, .useful-link",
        label: "Islamic Organizations",
        description: "Links to Jamiat KZN, MJC, UUCSA, SANHA, and other Islamic bodies in South Africa.",
        position: "bottom",
      },
    ],
  },
  {
    page: "contact",
    title: "Contact",
    arabic: "تواصل",
    narration: "Reach the Jamiat for fatwas, questions, and general inquiries — the Darul Iftā is here to serve.",
    duration: 4000,
    features: [
      {
        selector: "[class*='ContactView'] a, .contact-card",
        label: "Get in Touch",
        description: "WhatsApp +27 786 786 713 for fatwa questions, or email admin@jamiat.joburg.",
        position: "top",
      },
    ],
  },
  {
    page: "home",
    title: "Return Home",
    arabic: "العودة للرئيسية",
    narration: "Thank you for exploring with us. May Allah grant you beneficial knowledge and guide your steps. Āmīn.",
    duration: 3000,
    features: [],
  },
];

interface WebsiteTourProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

export default function WebsiteTour({ open, onClose, onNavigate }: WebsiteTourProps) {
  const [stopIdx, setStopIdx] = useState(0);
  const [featureIdx, setFeatureIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState<"intro" | "tour" | "outro">("intro");
  const [pageTransition, setPageTransition] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStop = TOUR_STOPS[stopIdx];
  const currentFeature = currentStop?.features[featureIdx];

  // Find element to highlight
  const findHighlightElement = useCallback((selector: string): HTMLElement | null => {
    if (!selector) return null;
    try {
      const parts = selector.split(",").map(s => s.trim());
      for (const part of parts) {
        const el = document.querySelector(part);
        if (el) return el as HTMLElement;
      }
    } catch {
      // invalid selector
    }
    return null;
  }, []);

  // Update spotlight position
  const updateSpotlight = useCallback(() => {
    if (!currentFeature || phase !== "tour") {
      setSpotlightRect(null);
      return;
    }
    const el = findHighlightElement(currentFeature.selector);
    if (!el) {
      setSpotlightRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setSpotlightRect({ x: rect.x, y: rect.y, w: rect.width, h: rect.height });
    }, 500);
  }, [currentFeature, phase, findHighlightElement]);

  // Navigate with transition
  const navigateWithTransition = useCallback((page: string) => {
    setPageTransition(true);
    setTimeout(() => {
      onNavigate(page);
      setTimeout(() => setPageTransition(false), 400);
    }, 350);
  }, [onNavigate]);

  // Start the tour
  const startTour = useCallback(() => {
    setPhase("tour");
    setStopIdx(0);
    setFeatureIdx(0);
    onNavigate(TOUR_STOPS[0].page);
  }, [onNavigate]);

  // Advance to next feature or next stop
  const advance = useCallback(() => {
    const stop = TOUR_STOPS[stopIdx];
    if (featureIdx < stop.features.length - 1) {
      setFeatureIdx(featureIdx + 1);
    } else {
      const next = stopIdx + 1;
      if (next >= TOUR_STOPS.length) {
        setPhase("outro");
      } else {
        setStopIdx(next);
        setFeatureIdx(0);
        navigateWithTransition(TOUR_STOPS[next].page);
      }
    }
  }, [stopIdx, featureIdx, navigateWithTransition]);

  // Go back
  const goBack = useCallback(() => {
    if (featureIdx > 0) {
      setFeatureIdx(featureIdx - 1);
    } else if (stopIdx > 0) {
      const prev = stopIdx - 1;
      setStopIdx(prev);
      setFeatureIdx(Math.max(0, TOUR_STOPS[prev].features.length - 1));
      navigateWithTransition(TOUR_STOPS[prev].page);
    }
  }, [stopIdx, featureIdx, navigateWithTransition]);

  // Auto-advance timer
  useEffect(() => {
    if (!open || paused || phase !== "tour") return;
    const duration = currentFeature ? currentStop.duration : 2500;
    timerRef.current = setTimeout(advance, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, paused, phase, stopIdx, featureIdx, advance, currentFeature, currentStop]);

  // Update spotlight when feature changes
  useEffect(() => {
    if (phase !== "tour") {
      setSpotlightRect(null);
      return;
    }
    const t = setTimeout(updateSpotlight, 700);
    return () => clearTimeout(t);
  }, [stopIdx, featureIdx, phase, updateSpotlight]);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setPhase("intro");
      setStopIdx(0);
      setFeatureIdx(0);
      setPaused(false);
      setSpotlightRect(null);
    }
  }, [open]);

  // Keyboard controls
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " && phase === "tour") {
        e.preventDefault();
        setPaused(p => !p);
      }
      if (e.key === "ArrowRight" && phase === "tour") advance();
      if (e.key === "ArrowLeft" && phase === "tour") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, onClose, advance, goBack]);

  // Update spotlight on resize/scroll
  useEffect(() => {
    if (phase !== "tour") return;
    const handler = () => updateSpotlight();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [phase, updateSpotlight]);

  if (!open) return null;

  const totalFeatures = TOUR_STOPS.reduce((sum, s) => sum + Math.max(1, s.features.length), 0);
  const currentFeatureNum = TOUR_STOPS.slice(0, stopIdx).reduce((sum, s) => sum + Math.max(1, s.features.length), 0)
    + Math.max(1, featureIdx + (currentStop.features.length > 0 ? 1 : 0));
  const progress = phase === "tour"
    ? (currentFeatureNum / totalFeatures) * 100
    : phase === "outro" ? 100 : 0;

  // Calculate callout position with bounds checking
  const getCalloutStyle = (): React.CSSProperties => {
    if (!spotlightRect || !currentFeature?.position) return {};
    const { x, y, w, h } = spotlightRect;
    const pos = currentFeature.position || "bottom";
    const calloutW = 320;
    const margin = 12;
    const base: React.CSSProperties = {
      position: "fixed",
      maxWidth: calloutW,
      zIndex: 202,
    };
    if (pos === "bottom") {
      const left = Math.max(margin, Math.min(x, window.innerWidth - calloutW - margin));
      return { ...base, top: y + h + margin, left };
    }
    if (pos === "top") {
      const left = Math.max(margin, Math.min(x, window.innerWidth - calloutW - margin));
      return { ...base, bottom: window.innerHeight - y + margin, left };
    }
    if (pos === "right") {
      const left = Math.min(x + w + margin, window.innerWidth - calloutW - margin);
      return { ...base, top: Math.max(margin, y), left };
    }
    if (pos === "left") {
      return { ...base, top: Math.max(margin, y), right: Math.max(margin, window.innerWidth - x + margin), maxWidth: 280 };
    }
    return { ...base, top: y + h + margin, left: "50%", transform: "translateX(-50%)" };
  };

  return (
    <>
      {/* ── Page transition fade overlay ── */}
      {pageTransition && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 198,
          background: "rgba(11, 41, 32, 0.6)",
          backdropFilter: "blur(3px)",
          opacity: pageTransition ? 1 : 0,
          transition: "opacity 0.35s cubic-bezier(0.65, 0, 0.35, 1)",
          pointerEvents: "none",
        }} />
      )}

      {/* ── Spotlight overlay (darkened with cut-out) ── */}
      {phase === "tour" && spotlightRect && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 199,
          pointerEvents: "none",
          background: "rgba(11, 41, 32, 0.72)",
          clipPath: `polygon(0% 0%, 0% 100%, ${spotlightRect.x}px 100%, ${spotlightRect.x}px ${spotlightRect.y}px, ${spotlightRect.x + spotlightRect.w}px ${spotlightRect.y}px, ${spotlightRect.x + spotlightRect.w}px ${spotlightRect.y + spotlightRect.h}px, ${spotlightRect.x}px ${spotlightRect.y + spotlightRect.h}px, ${spotlightRect.x}px 100%, 100% 100%, 100% 0%)`,
          transition: "clip-path 0.6s cubic-bezier(0.65, 0, 0.35, 1)",
        }} />
      )}

      {/* ── Spotlight ring (animated, glowing) ── */}
      {phase === "tour" && spotlightRect && (
        <>
          {/* Outer glow ring */}
          <div style={{
            position: "fixed",
            left: spotlightRect.x - 8,
            top: spotlightRect.y - 8,
            width: spotlightRect.w + 16,
            height: spotlightRect.h + 16,
            zIndex: 200,
            pointerEvents: "none",
            border: "2px solid #C9A85E",
            borderRadius: 8,
            boxShadow: "0 0 0 4px rgba(201, 168, 94, 0.15), 0 0 32px rgba(201, 168, 94, 0.5), 0 0 64px rgba(201, 168, 94, 0.2)",
            transition: "all 0.6s cubic-bezier(0.65, 0, 0.35, 1)",
            animation: "livepulse 2.5s infinite",
          }} />
          {/* Corner accents — Islamic geometric style */}
          {[
            { top: spotlightRect.y - 12, left: spotlightRect.x - 12, borderTop: "2px solid #E8D8A8", borderLeft: "2px solid #E8D8A8" },
            { top: spotlightRect.y - 12, left: spotlightRect.x + spotlightRect.w + 4, borderTop: "2px solid #E8D8A8", borderRight: "2px solid #E8D8A8" },
            { top: spotlightRect.y + spotlightRect.h + 4, left: spotlightRect.x - 12, borderBottom: "2px solid #E8D8A8", borderLeft: "2px solid #E8D8A8" },
            { top: spotlightRect.y + spotlightRect.h + 4, left: spotlightRect.x + spotlightRect.w + 4, borderBottom: "2px solid #E8D8A8", borderRight: "2px solid #E8D8A8" },
          ].map((c, i) => (
            <div key={i} style={{
              position: "fixed", top: c.top, left: c.left,
              width: 8, height: 8, zIndex: 200, pointerEvents: "none",
              borderTop: c.borderTop,
              borderLeft: c.borderLeft,
              borderBottom: c.borderBottom,
              borderRight: c.borderRight,
              transition: "all 0.6s cubic-bezier(0.65, 0, 0.35, 1)",
            }} />
          ))}
        </>
      )}

      {/* ── Feature callout ── */}
      {phase === "tour" && spotlightRect && currentFeature && (
        <div style={{
          ...getCalloutStyle(),
          background: "linear-gradient(135deg, #1B2A38 0%, #2E6E6A 100%)",
          border: "1px solid rgba(201, 168, 94, 0.5)",
          borderRadius: 8,
          padding: "14px 16px",
          boxShadow: "0 12px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(201,168,94,.1) inset",
          animation: "headlineSlide 0.6s cubic-bezier(0.65, 0, 0.35, 1) both",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              background: "rgba(201, 168, 94, 0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Sparkles size={11} style={{ color: "#C9A85E" }} />
            </div>
            <span style={{
              fontFamily: "var(--font-sans-stack)", fontSize: ".6rem", letterSpacing: ".16em",
              textTransform: "uppercase", color: "#C9A85E", fontWeight: 700,
            }}>
              {currentFeature.label}
            </span>
          </div>
          <p style={{
            fontFamily: "var(--font-serif-stack)", fontSize: ".82rem",
            color: "rgba(241, 233, 216, 0.92)", lineHeight: 1.55, margin: 0,
          }}>
            {currentFeature.description}
          </p>
        </div>
      )}

      {/* ── Intro screen — cinematic welcome ── */}
      {phase === "intro" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 201,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
          background: "rgba(11, 41, 32, 0.75)", backdropFilter: "blur(6px)",
          animation: "headlineSlide 0.6s cubic-bezier(0.65, 0, 0.35, 1) both",
        }}>
          <div style={{
            maxWidth: 580, width: "100%",
            background: "linear-gradient(135deg, #1B2A38 0%, #2E6E6A 100%)",
            borderRadius: 14, overflow: "hidden",
            border: "1px solid rgba(201, 168, 94, 0.5)",
            boxShadow: "0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(201,168,94,.15) inset, 0 0 64px rgba(46,110,106,.2)",
            position: "relative",
          }}>
            {/* Top gold accent line */}
            <div style={{
              height: 4,
              background: "linear-gradient(90deg, transparent, #C9A85E 15%, #E8D8A8 50%, #C9A85E 85%, transparent)",
            }} />
            {/* Decorative corner ornaments */}
            <span style={{ position: "absolute", top: 8, left: 8, width: 16, height: 16, borderTop: "2px solid rgba(201,168,94,.5)", borderLeft: "2px solid rgba(201,168,94,.5)" }} />
            <span style={{ position: "absolute", top: 8, right: 8, width: 16, height: 16, borderTop: "2px solid rgba(201,168,94,.5)", borderRight: "2px solid rgba(201,168,94,.5)" }} />
            <span style={{ position: "absolute", bottom: 8, left: 8, width: 16, height: 16, borderBottom: "2px solid rgba(201,168,94,.5)", borderLeft: "2px solid rgba(201,168,94,.5)" }} />
            <span style={{ position: "absolute", bottom: 8, right: 8, width: 16, height: 16, borderBottom: "2px solid rgba(201,168,94,.5)", borderRight: "2px solid rgba(201,168,94,.5)" }} />

            <div style={{ padding: "36px 32px 28px", textAlign: "center" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(201, 168, 94, 0.12)",
                border: "1px solid rgba(201, 168, 94, 0.4)",
                marginBottom: 18,
                boxShadow: "0 0 32px rgba(201, 168, 94, 0.2)",
                animation: "livepulse 3s infinite",
              }}>
                <Compass size={30} style={{ color: "#C9A85E" }} />
              </div>
              <div style={{
                fontFamily: "var(--font-arabic-stack)", direction: "rtl",
                fontSize: "2rem", color: "#E8D8A8", marginBottom: 8,
                textShadow: "0 2px 12px rgba(201,168,94,.2)",
              }}>
                أهلاً وسهلاً
              </div>
              <h2 style={{
                fontFamily: "var(--font-serif-stack)", fontSize: "1.7rem", fontWeight: 700,
                color: "#F1E9D8", marginBottom: 12, lineHeight: 1.2,
                textShadow: "0 2px 12px rgba(0,0,0,.3)",
              }}>
                Explore the Website
              </h2>
              <p style={{
                fontFamily: "var(--font-serif-stack)", fontSize: ".98rem",
                color: "rgba(241, 233, 216, 0.82)", lineHeight: 1.65, marginBottom: 18,
              }}>
A brief guided tour of the website's features.
              </p>
              <div style={{
                padding: "12px 16px", marginBottom: 22,
                background: "rgba(201, 168, 94, 0.08)",
                border: "1px solid rgba(201, 168, 94, 0.2)",
                borderRadius: 6,
                fontFamily: "var(--font-serif-stack)", fontSize: ".82rem",
                color: "rgba(241, 233, 216, 0.78)", lineHeight: 1.55,
                display: "flex", alignItems: "flex-start", gap: 8, textAlign: "left",
              }}>
                <MapPin size={14} style={{ color: "#C9A85E", flexShrink: 0, marginTop: 2 }} />
                <span>The tour will automatically navigate and spotlight key features on each page. Use <kbd style={{ padding: "1px 5px", border: "1px solid rgba(201,168,94,.3)", borderRadius: 2, fontSize: ".7rem", fontFamily: "var(--font-mono-stack)" }}>Space</kbd> to pause, <kbd style={{ padding: "1px 5px", border: "1px solid rgba(201,168,94,.3)", borderRadius: 2, fontSize: ".7rem", fontFamily: "var(--font-mono-stack)" }}>←→</kbd> to navigate, <kbd style={{ padding: "1px 5px", border: "1px solid rgba(201,168,94,.3)", borderRadius: 2, fontSize: ".7rem", fontFamily: "var(--font-mono-stack)" }}>Esc</kbd> to exit.</span>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button
                  onClick={startTour}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "13px 32px", borderRadius: 6,
                    background: "linear-gradient(135deg, #C9A85E 0%, #B08D4C 100%)",
                    border: "none", color: "#1B2A38",
                    fontFamily: "var(--font-sans-stack)", fontSize: ".92rem", fontWeight: 700,
                    cursor: "pointer", letterSpacing: ".08em",
                    boxShadow: "0 6px 20px rgba(201,168,94,.35), 0 0 0 1px rgba(201,168,94,.2) inset",
                    transition: "transform .2s ease, box-shadow .2s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(201,168,94,.45)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(201,168,94,.35)"; }}
                >
                  <Play size={16} /> Begin Tour
                </button>
                <button
                  onClick={onClose}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "13px 22px", borderRadius: 6,
                    background: "transparent", border: "1px solid rgba(241,233,216,.3)",
                    color: "rgba(241,233,216,.7)",
                    fontFamily: "var(--font-sans-stack)", fontSize: ".85rem",
                    cursor: "pointer", transition: "border-color .2s, color .2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(241,233,216,.5)"; e.currentTarget.style.color = "rgba(241,233,216,.9)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(241,233,216,.3)"; e.currentTarget.style.color = "rgba(241,233,216,.7)"; }}
                >
                  <X size={14} /> Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tour narration bar (bottom) ── */}
      {phase === "tour" && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
          animation: "headlineSlide 0.5s cubic-bezier(0.65, 0, 0.35, 1) both",
        }}>
          {/* Progress bar */}
          <div style={{
            height: 3, background: "rgba(11, 41, 32, 0.3)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #C9A85E, #E8D8A8, #C9A85E)",
              transition: "width .8s cubic-bezier(0.65, 0, 0.35, 1)",
              boxShadow: "0 0 12px rgba(201,168,94,.6)",
            }} />
          </div>

          {/* Narration panel */}
          <div style={{
            background: "linear-gradient(180deg, rgba(27, 42, 56, 0.98) 0%, rgba(15, 26, 35, 0.99) 100%)",
            borderTop: "1px solid rgba(201, 168, 94, 0.4)",
            padding: "14px 20px 12px",
            display: "flex", alignItems: "center", gap: 14,
            flexWrap: "wrap",
            backdropFilter: "blur(8px)",
          }}>
            {/* Stop info */}
            <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(201, 168, 94, 0.2), rgba(201, 168, 94, 0.05))",
                border: "1px solid rgba(201, 168, 94, 0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono-stack)", fontSize: ".7rem",
                color: "#C9A85E", fontWeight: 700, flexShrink: 0,
                boxShadow: "0 0 12px rgba(201,168,94,.15)",
              }}>
                {stopIdx + 1}/{TOUR_STOPS.length}
              </div>
              <div>
                <div style={{
                  fontFamily: "var(--font-sans-stack)", fontSize: ".56rem", letterSpacing: ".18em",
                  textTransform: "uppercase", color: "#C9A85E", fontWeight: 700,
                }}>
                  {currentStop.title}
                  {currentFeature && ` · ${currentFeature.label}`}
                </div>
                <div style={{
                  fontFamily: "var(--font-arabic-stack)", direction: "rtl",
                  fontSize: ".9rem", color: "#E8D8A8",
                }}>
                  {currentStop.arabic}
                </div>
              </div>
            </div>

            {/* Narration text */}
            <div style={{ flex: "1 1 250px", minWidth: 200 }}>
              <p style={{
                fontFamily: "var(--font-serif-stack)", fontSize: ".85rem",
                color: "rgba(241, 233, 216, 0.92)", lineHeight: 1.5, margin: 0,
                fontStyle: "italic",
              }}>
                {currentFeature ? currentFeature.description : currentStop.narration}
              </p>
            </div>

            {/* Controls */}
            <div style={{ flex: "0 0 auto", display: "flex", gap: 6, alignItems: "center" }}>
              <button
                onClick={goBack}
                disabled={stopIdx === 0 && featureIdx === 0}
                style={{
                  width: 34, height: 34, borderRadius: 5,
                  background: "rgba(201, 168, 94, 0.1)",
                  border: "1px solid rgba(201, 168, 94, 0.3)",
                  color: (stopIdx === 0 && featureIdx === 0) ? "rgba(241,233,216,.2)" : "#C9A85E",
                  cursor: (stopIdx === 0 && featureIdx === 0) ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background .2s",
                }}
                aria-label="Previous"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPaused(p => !p)}
                style={{
                  width: 38, height: 38, borderRadius: 5,
                  background: "rgba(201, 168, 94, 0.2)",
                  border: "1px solid rgba(201, 168, 94, 0.4)",
                  color: "#C9A85E", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background .2s",
                }}
                aria-label={paused ? "Resume" : "Pause"}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
              </button>
              <button
                onClick={advance}
                style={{
                  width: 34, height: 34, borderRadius: 5,
                  background: "rgba(201, 168, 94, 0.1)",
                  border: "1px solid rgba(201, 168, 94, 0.3)",
                  color: "#C9A85E", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background .2s",
                }}
                aria-label="Next"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={onClose}
                style={{
                  marginLeft: 6, padding: "7px 14px", borderRadius: 5,
                  background: "transparent",
                  border: "1px solid rgba(241,233,216,.2)",
                  color: "rgba(241,233,216,.6)",
                  fontFamily: "var(--font-sans-stack)", fontSize: ".7rem",
                  cursor: "pointer", letterSpacing: ".06em",
                  transition: "border-color .2s, color .2s",
                }}
              >
                <X size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                End Tour
              </button>
            </div>
          </div>

          {/* Paused indicator */}
          {paused && (
            <div style={{
              position: "absolute", top: -44, left: "50%", transform: "translateX(-50%)",
              padding: "7px 18px", borderRadius: 20,
              background: "linear-gradient(135deg, #C9A85E, #B08D4C)", color: "#1B2A38",
              fontFamily: "var(--font-sans-stack)", fontSize: ".72rem", fontWeight: 700,
              letterSpacing: ".12em", textTransform: "uppercase",
              boxShadow: "0 6px 20px rgba(0,0,0,.3)",
              animation: "livepulse 2s infinite",
            }}>
              ⏸ Paused — Press Space or Play to resume
            </div>
          )}
        </div>
      )}

      {/* ── Outro screen — cinematic farewell ── */}
      {phase === "outro" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 201,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
          background: "rgba(11, 41, 32, 0.75)", backdropFilter: "blur(6px)",
          animation: "headlineSlide 0.6s cubic-bezier(0.65, 0, 0.35, 1) both",
        }}>
          <div style={{
            maxWidth: 500, width: "100%",
            background: "linear-gradient(135deg, #1B2A38 0%, #2E6E6A 100%)",
            borderRadius: 14, overflow: "hidden",
            border: "1px solid rgba(201, 168, 94, 0.5)",
            boxShadow: "0 32px 80px rgba(0,0,0,.6), 0 0 64px rgba(93,212,161,.15)",
            textAlign: "center",
            position: "relative",
          }}>
            <div style={{
              height: 4,
              background: "linear-gradient(90deg, transparent, #5dd4a1 15%, #E8D8A8 50%, #5dd4a1 85%, transparent)",
            }} />
            {/* Corner ornaments */}
            <span style={{ position: "absolute", top: 8, left: 8, width: 16, height: 16, borderTop: "2px solid rgba(93,212,161,.5)", borderLeft: "2px solid rgba(93,212,161,.5)" }} />
            <span style={{ position: "absolute", top: 8, right: 8, width: 16, height: 16, borderTop: "2px solid rgba(93,212,161,.5)", borderRight: "2px solid rgba(93,212,161,.5)" }} />
            <span style={{ position: "absolute", bottom: 8, left: 8, width: 16, height: 16, borderBottom: "2px solid rgba(93,212,161,.5)", borderLeft: "2px solid rgba(93,212,161,.5)" }} />
            <span style={{ position: "absolute", bottom: 8, right: 8, width: 16, height: 16, borderBottom: "2px solid rgba(93,212,161,.5)", borderRight: "2px solid rgba(93,212,161,.5)" }} />

            <div style={{ padding: "36px 32px" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(93, 212, 161, 0.12)",
                border: "1px solid rgba(93, 212, 161, 0.4)",
                marginBottom: 18,
                boxShadow: "0 0 32px rgba(93, 212, 161, 0.2)",
                animation: "livepulse 3s infinite",
              }}>
                <Sparkles size={30} style={{ color: "#5dd4a1" }} />
              </div>
              <div style={{
                fontFamily: "var(--font-arabic-stack)", direction: "rtl",
                fontSize: "2rem", color: "#E8D8A8", marginBottom: 8,
                textShadow: "0 2px 12px rgba(201,168,94,.2)",
              }}>
                جزاك الله خيراً
              </div>
              <h2 style={{
                fontFamily: "var(--font-serif-stack)", fontSize: "1.6rem", fontWeight: 700,
                color: "#F1E9D8", marginBottom: 12,
                textShadow: "0 2px 12px rgba(0,0,0,.3)",
              }}>
                Tour Complete
              </h2>
              <p style={{
                fontFamily: "var(--font-serif-stack)", fontSize: ".95rem",
                color: "rgba(241, 233, 216, 0.82)", lineHeight: 1.65, marginBottom: 22,
              }}>
                You are now back at the Home page. May Allah grant you beneficial knowledge
                and guide your every step. Explore freely — the treasures of guidance await you. Āmīn.
              </p>
              <button
                onClick={() => {
                  onNavigate("home");
                  onClose();
                }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "13px 32px", borderRadius: 6,
                  background: "linear-gradient(135deg, #C9A85E 0%, #B08D4C 100%)",
                  border: "none", color: "#1B2A38",
                  fontFamily: "var(--font-sans-stack)", fontSize: ".92rem", fontWeight: 700,
                  cursor: "pointer", letterSpacing: ".08em",
                  boxShadow: "0 6px 20px rgba(201,168,94,.35)",
                  transition: "transform .2s ease, box-shadow .2s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(201,168,94,.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(201,168,94,.35)"; }}
              >
                <ChevronRight size={16} /> Explore Home
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Moon, Sunrise, Clock, Calendar, Telescope, MapPin, Sparkles } from "lucide-react";
import ImagePlaceholder from "./ImagePlaceholder";

interface MoonSightingData {
  success: boolean;
  generatedAt: string;
  currentDate: {
    hijri: string;
    hijriArabic: string;
    gregorian: string;
    hijriDay: number;
    hijriMonth: number;
    hijriYear: number;
    hijriMonthName: string;
    hijriMonthNameAr: string;
    weekdayArabic: string;
    aladhanVerified: string | null;
  };
  moonSighting: {
    currentHijriMonth: number;
    currentHijriMonthName: string;
    currentHijriDay: number;
    upcomingMonth: string;
    upcomingMonthArabic: string;
    upcomingYear: number;
    conjunctionTimeLocal: string;
    sunsetTimeLocal: string;
    moonsetTimeLocal: string;
    moonAgeAtSunset: number;
    moonAltitudeAtSunset: number;
    elongation: number;
    illumination: number;
    visibility: "certain" | "possible" | "unlikely" | "impossible";
    visibilityNote: string;
    yallopQ: number;
    willComplete30Days: boolean;
    daysUntilObservation: number;
    daysUntilNewMonth: number;
    dataSource: "local" | "api+local";
    suppressAlert: boolean;
    suppressReason: string | null;
  };
  announcement: {
    title: string;
    body: string;
  };
  monthTheme: {
    title: string;
    titleAr: string;
    hadith: string;
    source: string;
    encourage: string;
    specialDays: string | null;
  };
  hadithRotation: {
    current: { text: string; source: string; theme: string };
    transition: { text: string; source: string; theme: string } | null;
    usher: { text: string; source: string; theme: string } | null;
  };
  intelligentFilter: {
    mode: "normal" | "month-ending" | "month-beginning" | "early-month";
    reason: string;
    nearMonthEnd: boolean;
    inLastWeek: boolean;
  };
  nearMonthEnd: boolean;
  inLastWeek: boolean;
}

/**
 * MoonSightingAlert — elegant, intelligence-driven alert card.
 *
 * Display logic with RESTRICTED-DURATION astronomical data:
 *
 *  1. Pre-observation window — early alert (days 24-25 of current month,
 *     OR daysUntilObservation > 3):
 *     Clean alert with announcement title, Hijri date, transition hadith,
 *     and month encouragement. NO astronomical data shown yet.
 *
 *  2. CRITICAL SIGHTING WINDOW (days 26-29, OR daysUntilObservation <= 3):
 *     Full alert WITH astronomical data grid (Moon Age, Altitude, Elongation,
 *     Illumination) and Observation Window (Sunset, Moonset, Conjunction).
 *     This is the restricted duration when the data is genuinely useful —
 *     the 3-4 days immediately before the observation evening.
 *
 *  3. Month-beginning (days 1-3 of new month): Ushering hadith welcoming
 *     the new month. All astronomical data is hidden — the sighting is done.
 *
 *  4. Hidden (days 4-23): Returns null — no alert needed.
 */
export default function MoonSightingAlert() {
  const [data, setData] = useState<MoonSightingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/moon-sighting")
      .then(r => r.json())
      .then(d => { if (mounted) { setData(d); setLoading(false); } })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading || !data || !data.success) return null;

  const { intelligentFilter, moonSighting, hadithRotation } = data;

  // Month-beginning: ushering hadith
  if (intelligentFilter.mode === "month-beginning" && hadithRotation.usher) {
    return <MonthUsherCard data={data} />;
  }

  // Suppress alert if moon-sighting engine says so, OR if not in last week
  if (moonSighting.suppressAlert || !intelligentFilter.inLastWeek) return null;

  // CRITICAL SIGHTING WINDOW: Show full astronomical data when within 3 days
  // of the observation evening (days 26-29, or daysUntilObservation <= 3)
  const inCriticalWindow = moonSighting.daysUntilObservation <= 3 && moonSighting.daysUntilObservation >= -1;

  return <MonthEndingCard data={data} showAstronomicalData={inCriticalWindow} />;
}

/* ─── Month-Ending Alert — elegant alert card with optional astronomical data ─── */
function MonthEndingCard({ data, showAstronomicalData }: { data: MoonSightingData; showAstronomicalData: boolean }) {
  const { moonSighting: moon, monthTheme, hadithRotation, announcement, currentDate } = data;

  return (
    <div style={{
      marginBottom: 22,
      borderRadius: 8,
      overflow: "hidden",
      border: "1px solid rgba(176,141,76,.25)",
      boxShadow: "0 6px 24px rgba(27,42,56,.08), 0 1px 0 rgba(176,141,76,.08) inset",
      background: "#F5EFE0",
    }}>
      {/* ── Header bar — gradient with Arabic calligraphy accent ── */}
      {/* Moon-sighting visual placeholder — crescent moon icon, Islamic geometric pattern */}
      <ImagePlaceholder
        mode="pattern"
        slotId={`moon-sighting-${moon.currentHijriMonth}-${moon.currentHijriDay}`}
        ratio="21:9"
        icon={Moon}
      />
      <div style={{
        background: "linear-gradient(135deg, #1B2A38 0%, #2E6E6A 60%, #1B2A38 100%)",
        padding: "16px 20px 14px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative geometric pattern overlay */}
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: 120,
          background: "radial-gradient(circle at 80% 50%, rgba(176,141,76,.15), transparent 60%)",
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(201,168,94,.15)",
            border: "1px solid rgba(201,168,94,.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Moon size={18} style={{ color: "#C9A85E" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 3,
              fontFamily: "var(--font-sans-stack)", fontSize: ".56rem", letterSpacing: ".22em",
              textTransform: "uppercase", color: "#C9A85E", fontWeight: 700,
            }}>
              <Sparkles size={10} />
              Hilaal Alert · Central Moon-Sighting Committee
            </div>
            <div style={{
              fontFamily: "var(--font-display-stack)", fontSize: "1.08rem", fontWeight: 600,
              color: "#F1E9D8", lineHeight: 1.25,
            }}>
              {announcement.title}
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginTop: 4,
              fontFamily: "var(--font-sans-stack)", fontSize: ".65rem", color: "rgba(241,233,216,.65)",
            }}>
              <Calendar size={10} />
              <span>{currentDate.hijri}</span>
              <span style={{ opacity: .4 }}>·</span>
              <span style={{ fontFamily: "var(--font-arabic-display)", direction: "rtl" }}>{currentDate.hijriArabic}</span>
            </div>
          </div>
          <div style={{
            textAlign: "right", flexShrink: 0,
            fontFamily: "var(--font-arabic-display)", direction: "rtl",
            fontSize: "1.4rem", color: "rgba(201,168,94,.5)",
          }}>
            {moon.upcomingMonthArabic}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "16px 20px 18px" }}>

        {/* ── RESTRICTED-DURATION: Astronomical data (only in critical sighting window) ── */}
        {showAstronomicalData && (
          <>
            {/* Critical window badge */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "6px 12px", marginBottom: 14,
              background: "linear-gradient(90deg, rgba(46,110,106,.08), rgba(176,141,76,.08))",
              borderRadius: 4, border: "1px solid rgba(46,110,106,.15)",
            }}>
              <Telescope size={11} style={{ color: "#2E6E6A" }} />
              <span style={{
                fontFamily: "var(--font-sans-stack)", fontSize: ".54rem", letterSpacing: ".16em",
                textTransform: "uppercase", color: "#2E6E6A", fontWeight: 700,
              }}>
                Critical Sighting Window · {moon.daysUntilObservation <= 0 ? "Observation Day" : `${moon.daysUntilObservation} day${moon.daysUntilObservation === 1 ? "" : "s"} to sighting`}
              </span>
            </div>

            {/* Astronomical data grid — 4 metrics */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14,
            }}>
              <DataMetric
                icon={<Clock size={11} />} label="Moon Age" value={`${moon.moonAgeAtSunset.toFixed(1)}h`}
                sublabel="at sunset" color="#2E6E6A"
              />
              <DataMetric
                icon={<Sunrise size={11} />} label="Altitude" value={`${moon.moonAltitudeAtSunset.toFixed(1)}°`}
                sublabel="above horizon" color="#B08D4C"
              />
              <DataMetric
                icon={<Moon size={11} />} label="Elongation" value={`${moon.elongation.toFixed(1)}°`}
                sublabel="sun–moon gap" color="#7A2E2E"
              />
              <DataMetric
                icon={<Sparkles size={11} />} label="Illumination" value={`${moon.illumination.toFixed(1)}%`}
                sublabel="lit fraction" color="#5dd4a1"
              />
            </div>

            {/* Observation window card */}
            <div style={{
              padding: "12px 14px", borderRadius: 6,
              background: "linear-gradient(135deg, rgba(46,110,106,.05), rgba(176,141,76,.05))",
              border: "1px solid rgba(46,110,106,.12)",
              marginBottom: 14,
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                fontFamily: "var(--font-sans-stack)", fontSize: ".56rem", letterSpacing: ".16em",
                textTransform: "uppercase", color: "#2E6E6A", fontWeight: 700,
              }}>
                <Telescope size={11} />
                Observation Window — First Evening of {moon.upcomingMonth} Crescent
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".55rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#8A8578", fontWeight: 600 }}>Sunset (SAST)</div>
                  <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: ".78rem", color: "#1B2A38", marginTop: 2 }}>{moon.sunsetTimeLocal}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".55rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#8A8578", fontWeight: 600 }}>Moonset (SAST)</div>
                  <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: ".78rem", color: "#1B2A38", marginTop: 2 }}>{moon.moonsetTimeLocal}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".55rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#8A8578", fontWeight: 600 }}>Conjunction (Moon Birth)</div>
                  <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: ".78rem", color: "#1B2A38", marginTop: 2 }}>{moon.conjunctionTimeLocal}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Transition hadith — ushering the new month */}
        {hadithRotation.transition && (
          <div style={{
            padding: "16px 18px", borderRadius: 6,
            background: "linear-gradient(135deg, rgba(27,42,56,.04), rgba(176,141,76,.04))",
            border: "1px solid rgba(176,141,76,.15)",
            marginBottom: 14,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
            }}>
              <span style={{
                fontFamily: "var(--font-arabic-display)", fontSize: "1.1rem",
                color: "#B08D4C", opacity: .8,
              }}>ﷺ</span>
              <span style={{
                fontFamily: "var(--font-sans-stack)", fontSize: ".56rem", letterSpacing: ".16em",
                textTransform: "uppercase", color: "#B08D4C", fontWeight: 700,
              }}>Hadith Ushering {moon.upcomingMonth}</span>
            </div>
            <p style={{
              fontFamily: "var(--font-serif-stack)", fontStyle: "italic",
              fontSize: ".9rem", color: "#1B2A38", lineHeight: 1.7, margin: 0, marginBottom: 8,
            }}>&ldquo;{hadithRotation.transition.text}&rdquo;</p>
            <p style={{
              fontFamily: "var(--font-mono-stack)", fontSize: ".6rem", color: "#B08D4C", margin: 0,
              letterSpacing: ".04em",
            }}>— {hadithRotation.transition.source}</p>
          </div>
        )}

        {/* Month theme — encouragement */}
        {monthTheme.encourage && (
          <div style={{
            padding: "14px 16px", borderRadius: 6,
            background: "rgba(176,141,76,.05)",
            border: "1px solid rgba(176,141,76,.12)",
            marginBottom: 12,
          }}>
            <div style={{
              fontFamily: "var(--font-sans-stack)", fontSize: ".56rem", letterSpacing: ".16em",
              textTransform: "uppercase", color: "#B08D4C", fontWeight: 700, marginBottom: 8,
            }}>{monthTheme.title}</div>
            <p style={{
              fontFamily: "var(--font-serif-stack)", fontSize: ".82rem", color: "#2A2622",
              lineHeight: 1.65, margin: 0,
            }}>{monthTheme.encourage}</p>
            {monthTheme.specialDays && (
              <div style={{
                marginTop: 10, padding: "6px 10px", borderRadius: 4,
                background: "rgba(46,110,106,.06)",
                fontFamily: "var(--font-mono-stack)", fontSize: ".65rem", color: "#2E6E6A",
              }}>
                ✦ {monthTheme.specialDays}
              </div>
            )}
          </div>
        )}

        {/* Footer — location only */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          paddingTop: 10, borderTop: "1px solid rgba(176,141,76,.15)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "var(--font-sans-stack)", fontSize: ".58rem", color: "#8A8578",
          }}>
            <MapPin size={10} />
            <span>Johannesburg 26.20°S, 28.05°E · SAST (UTC+2)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Month-Usher Card — shown in the first 3 days of a new month ─── */
function MonthUsherCard({ data }: { data: MoonSightingData }) {
  const { hadithRotation, monthTheme, currentDate } = data;
  if (!hadithRotation.usher) return null;

  return (
    <div style={{
      marginBottom: 22, borderRadius: 8, overflow: "hidden",
      border: "1px solid rgba(46,110,106,.2)",
      background: "linear-gradient(135deg, #F5EFE0 0%, #EFE5D0 100%)",
      boxShadow: "0 4px 16px rgba(46,110,106,.06)",
    }}>
      <div style={{
        padding: "16px 20px",
        background: "linear-gradient(135deg, rgba(46,110,106,.08), rgba(176,141,76,.08))",
        borderBottom: "1px solid rgba(176,141,76,.15)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(46,110,106,.1)",
            border: "1px solid rgba(46,110,106,.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Sparkles size={16} style={{ color: "#2E6E6A" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "var(--font-sans-stack)", fontSize: ".56rem", letterSpacing: ".22em",
              textTransform: "uppercase", color: "#2E6E6A", fontWeight: 700,
            }}>A New Month Has Begun</div>
            <div style={{
              fontFamily: "var(--font-display-stack)", fontSize: "1.05rem", fontWeight: 600,
              color: "#1B2A38", marginTop: 2,
            }}>{monthTheme.title}</div>
          </div>
          <div style={{
            fontFamily: "var(--font-arabic-display)", direction: "rtl",
            fontSize: "1.4rem", color: "rgba(46,110,106,.5)",
          }}>{monthTheme.titleAr}</div>
        </div>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <p style={{
          fontFamily: "var(--font-serif-stack)", fontStyle: "italic",
          fontSize: ".92rem", color: "#1B2A38", lineHeight: 1.7, margin: 0, marginBottom: 8,
        }}>&ldquo;{hadithRotation.usher.text}&rdquo;</p>
        <p style={{
          fontFamily: "var(--font-mono-stack)", fontSize: ".62rem", color: "#B08D4C", margin: 0, marginBottom: 14,
        }}>— {hadithRotation.usher.source}</p>
        <p style={{
          fontFamily: "var(--font-serif-stack)", fontSize: ".82rem", color: "#2A2622",
          lineHeight: 1.65, margin: 0,
        }}>{monthTheme.encourage}</p>
        <div style={{
          marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(176,141,76,.12)",
          fontFamily: "var(--font-sans-stack)", fontSize: ".58rem", color: "#8A8578",
        }}>
          {currentDate.hijri} · {currentDate.gregorian}
        </div>
      </div>
    </div>
  );
}

/* ─── Data Metric — small stat card ─── */
function DataMetric({ icon, label, value, sublabel, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  color: string;
}) {
  return (
    <div style={{
      padding: "8px 10px", background: "rgba(255,255,255,.5)",
      borderRadius: 4, border: "1px solid rgba(176,141,76,.1)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{
          fontFamily: "var(--font-sans-stack)", fontSize: ".5rem", letterSpacing: ".1em",
          textTransform: "uppercase", color, fontWeight: 700,
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: "var(--font-mono-stack)", fontSize: ".92rem", color: "#1B2A38", fontWeight: 600,
      }}>{value}</div>
      <div style={{
        fontFamily: "var(--font-sans-stack)", fontSize: ".5rem", color: "#8A8578",
      }}>{sublabel}</div>
    </div>
  );
}

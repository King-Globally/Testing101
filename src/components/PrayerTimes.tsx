"use client";
import { useEffect, useState } from "react";
import { usePrayerSchedule, useNextPrayer, type PrayerSlot } from "@/lib/prayer";

/**
 * PrayerTimes — world-class sidebar prayer dashboard.
 * - Premium dark header with masjid name
 * - Live countdown card with next prayer highlighted
 * - 6 prayer slots in elegant grid with Azaan + Jama'ah times
 * - Active prayer highlighted, past prayers dimmed
 * - No admin UI in this component (admin editing is backend-only via /api/admin/prayer)
 */
export default function PrayerTimes() {
  const { schedule } = usePrayerSchedule();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time init of live clock (hydration-safe: starts null)
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { next, countdown } = useNextPrayer(schedule, now ?? new Date(0));
  const mounted = now !== null;
  const curMin = now ? now.getHours() * 60 + now.getMinutes() : 0;

  return (
    <div style={{ overflow: "hidden", borderRadius: 4, border: "1px solid rgba(176,141,76,.15)" }}>
      {/* ─── Premium header ─── */}
      <div style={{
        background: "linear-gradient(135deg, #1B2A38 0%, #243845 100%)",
        padding: "14px 16px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: .04,
          backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><g fill='none' stroke='%23B08D4C' stroke-width='0.6'><circle cx='30' cy='30' r='15'/><path d='M30 0 L37 22 L60 30 L37 38 L30 60 L23 38 L0 30 L23 22 Z'/></g></svg>\")",
          backgroundSize: "60px 60px",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            marginBottom: 4,
          }}>
            {/* Live pulsing dot */}
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#5dd4a1", flexShrink: 0,
              boxShadow: "0 0 8px #5dd4a1",
              animation: "livepulse 1.6s infinite",
            }} />
            <span style={{
              fontFamily: "var(--font-sans-stack)", fontSize: ".58rem", letterSpacing: ".18em",
              textTransform: "uppercase", color: "#B08D4C", fontWeight: 600,
            }}>Live · Prayer Times</span>
          </div>
          <div style={{
            fontFamily: "var(--font-display-stack)", fontSize: "1rem", fontWeight: 600,
            color: "#F1E9D8", letterSpacing: ".01em", lineHeight: 1.2,
          }}>Masjid Al-Farooq</div>
          <div style={{
            fontFamily: "var(--font-arabic-stack)", direction: "rtl",
            fontSize: ".82rem", color: "#2E6E6A", marginTop: 1,
          }}>أوقات الصلاة · Crosby, Johannesburg</div>
        </div>
      </div>

      {/* ─── Countdown card ─── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(46,110,106,.08), rgba(176,141,76,.06))",
        padding: "14px 16px",
        textAlign: "center",
        borderBottom: "1px solid rgba(176,141,76,.1)",
      }}>
        {mounted && next ? (
          <>
            <div style={{
              fontFamily: "var(--font-sans-stack)", fontSize: ".58rem", letterSpacing: ".2em",
              textTransform: "uppercase", color: "#5A5750", fontWeight: 600,
            }}>Next Salaah</div>
            <div style={{
              fontFamily: "var(--font-display-stack)", fontSize: "1.1rem", fontWeight: 600,
              color: "#2E6E6A", marginTop: 2,
            }}>{next.name} <span style={{ fontFamily: "var(--font-arabic-stack)", direction: "rtl", fontSize: ".9rem" }}>{next.arabic}</span></div>
            <div style={{
              fontFamily: "var(--font-mono-stack)", fontSize: "1.8rem", fontWeight: 600,
              color: "#1B2A38", lineHeight: 1.1, marginTop: 4,
              letterSpacing: ".05em",
            }}>{countdown}</div>
            <div style={{
              fontFamily: "var(--font-sans-stack)", fontSize: ".62rem",
              color: "#8A8578", marginTop: 2,
            }}>Azaan at {next.start} · {next.name !== "Sunrise" ? `Jama'ah ${next.end}` : "Sunrise"}</div>
          </>
        ) : (
          <div style={{
            fontFamily: "var(--font-sans-stack)", fontSize: ".78rem", color: "#8A8578",
            fontStyle: "italic",
          }}>Loading prayer times…</div>
        )}
      </div>

      {/* ─── Prayer slots grid ─── */}
      <div style={{
        padding: "10px 12px",
        background: "#F5EFE0",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
          {schedule.map(slot => {
            const slotMin = parseInt(slot.start.split(":")[0]) * 60 + parseInt(slot.start.split(":")[1]);
            const isNext = mounted && next?.name === slot.name;
            const isPast = mounted && curMin >= slotMin && !isNext;
            const isCurrent = mounted && next?.name !== slot.name && curMin >= slotMin && curMin < (parseInt(slot.end.split(":")[0]) * 60 + parseInt(slot.end.split(":")[1]));

            return (
              <div key={slot.name} style={{
                padding: "8px 6px",
                borderRadius: 3,
                textAlign: "center",
                background: isNext
                  ? "linear-gradient(135deg, rgba(46,110,106,.12), rgba(46,110,106,.04))"
                  : isCurrent
                  ? "rgba(176,141,76,.06)"
                  : "transparent",
                border: isNext
                  ? "1px solid rgba(46,110,106,.3)"
                  : isCurrent
                  ? "1px solid rgba(176,141,76,.15)"
                  : "1px solid transparent",
                transition: "all .3s ease",
                opacity: isPast ? .45 : 1,
              }}>
                {/* Prayer name + Arabic */}
                <div style={{
                  fontFamily: "var(--font-sans-stack)", fontSize: ".62rem",
                  fontWeight: 600, color: isNext ? "#2E6E6A" : "#1B2A38",
                  letterSpacing: ".04em", marginBottom: 1,
                }}>{slot.name}</div>
                <div style={{
                  fontFamily: "var(--font-arabic-stack)", direction: "rtl",
                  fontSize: ".75rem", color: "#2E6E6A", marginBottom: 3,
                }}>{slot.arabic}</div>
                {/* Azaan time */}
                <div style={{
                  fontFamily: "var(--font-mono-stack)", fontSize: ".82rem",
                  fontWeight: 600, color: isNext ? "#2E6E6A" : "#1B2A38",
                }}>{slot.start}</div>
                {/* Jama'ah time */}
                {slot.name !== "Sunrise" ? (
                  <div style={{
                    fontFamily: "var(--font-mono-stack)", fontSize: ".65rem",
                    color: "#8A8578", marginTop: 1,
                  }}>{slot.end}</div>
                ) : (
                  <div style={{
                    fontFamily: "var(--font-sans-stack)", fontSize: ".55rem",
                    color: "#B08D4C", marginTop: 1, letterSpacing: ".06em",
                  }}>SUNRISE</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Labels */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: 8, padding: "0 6px",
        }}>
          <span style={{
            fontFamily: "var(--font-sans-stack)", fontSize: ".52rem", letterSpacing: ".1em",
            textTransform: "uppercase", color: "#8A8578",
          }}>Azaan</span>
          <span style={{
            fontFamily: "var(--font-sans-stack)", fontSize: ".52rem", letterSpacing: ".1em",
            textTransform: "uppercase", color: "#8A8578",
          }}>Jama'ah</span>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import {
  gregorianToHijri, hijriToGregorian,
  gregorianToHijriSA, hijriToGregorianSA, getCurrentIslamicDate,
  toArabicDigits, HIJRI_MONTHS_LATIN, HIJRI_MONTHS_ARABIC,
  type HijriDate,
} from "@/lib/hijri";
import { ChevronLeft, ChevronRight, Search, Calendar as CalIcon, CalendarDays, RotateCcw } from "lucide-react";

// Metadata for each Hijri month
interface MonthMeta { number: number; latin: string; arabic: string; note: string; }
const HIJRI_META: MonthMeta[] = [
  { number:1,  latin:"Muḥarram",         arabic:"مُحَرَّم",        note:"Sacred month. Sunnah fast on 9th & 10th (Āshūrā), or 10th & 11th — expiates the sins of the past year." },
  { number:2,  latin:"Ṣafar",            arabic:"صَفَر",          note:"No special Sunnah fast. The name means 'empty' — referring to the pre-Islamic practice of raiding." },
  { number:3,  latin:"Rabī' al-Awwal",   arabic:"رَبِيع الأَوَّل", note:"Month of the Mawlid of the Prophet ﷺ (12th). Also the month of his ﷺ Hijrah to Madīnah." },
  { number:4,  latin:"Rabī' al-Ākhir",   arabic:"رَبِيع الآخِر",  note:"Also known as Rabī' ath-Thānī. No special Sunnah fast." },
  { number:5,  latin:"Jumādā al-Ūlā",    arabic:"جُمَادَى الأُولَى", note:"No special Sunnah fast. Named for the cold season when water freezes." },
  { number:6,  latin:"Jumādā al-Ākhirah",arabic:"جُمَادَى الآخِرَة", note:"Also known as Jumādā ath-Thāniyah. No special Sunnah fast." },
  { number:7,  latin:"Rajab",            arabic:"رَجَب",          note:"One of the four sacred months. The Prophet ﷺ used to fast in Rajab. Battle of Tabūk was prepared in Rajab 9 AH." },
  { number:8,  latin:"Sha'bān",          arabic:"شَعْبَان",       note:"The Prophet ﷺ used to fast most of Sha'bān. The 15th night (Laylat al-Barā'ah) is significant." },
  { number:9,  latin:"Ramaḍān",          arabic:"رَمَضَان",       note:"The month of Fardh fasting (29 or 30 days) for all Muslims, regardless of geography. Laylat al-Qadr is in the last ten nights, odd nights." },
  { number:10, latin:"Shawwāl",          arabic:"شَوَّال",        note:"Eid al-Fiṭr on 1st. Fasting six days in Shawwāl is Sunnah — combined with Ramaḍān, equals fasting a lifetime." },
  { number:11, latin:"Dhul-Qa'dah",      arabic:"ذُو الْقَعْدَة",  note:"One of the four sacred months. A month of truce historically; pilgrims would head to Makkah." },
  { number:12, latin:"Dhul-Ḥijjah",      arabic:"ذُو الْحِجَّة",   note:"The month of Ḥajj. The 10th is Eid al-Aḍḥā. Fasting the 9th (Day of 'Arafah) is Sunnah for non-pilgrims — expiates the past and coming year." },
];

const WEEKDAYS_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WEEKDAYS_AR = ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];

const NULL_HIJRI: HijriDate = {
  year: -1, month: 1, day: 1,
  monthLatin: "", monthArabic: "", weekdayArabic: "",
  formattedLatin: "—", formattedArabic: "—",
};

function cellClasses(year: number, month: number, day: number, todayHijri: HijriDate): string[] {
  const out: string[] = [];
  const greg = hijriToGregorianSA(year, month, day);
  const weekday = greg.getDay();
  if (todayHijri.year === year && todayHijri.month === month && todayHijri.day === day) out.push("today");
  if (weekday === 1 || weekday === 4) out.push("fast-mon-thu");
  if ([13, 14, 15].includes(day)) out.push("fast-bright");
  if ([17, 19, 21].includes(day)) out.push("hijaam");
  if (month === 1 && day === 1) out.push("day-new-year");
  if (month === 1 && (day === 9 || day === 10 || day === 11)) out.push("fast-ashura");
  if (month === 3 && day === 12) out.push("day-mawlid");
  if (month === 7 && day === 27) out.push("day-miraj");
  if (month === 8 && day === 15) out.push("day-barakah");
  if (month === 9) out.push("fast-ramadan");
  if (month === 9 && [21, 23, 25, 27, 29].includes(day)) out.push("day-qadr");
  if (month === 10 && day === 1) out.push("eid-day");
  if (month === 10 && day >= 2 && day <= 7) out.push("fast-mon-thu");
  if (month === 12 && day === 9) out.push("fast-arafah");
  if (month === 12 && day === 10) out.push("eid-day");
  return out;
}

function specialDaysForMonth(month: number): { day: number; label: string; color: string }[] {
  const days: { day: number; label: string; color: string }[] = [];
  switch (month) {
    case 1:
      days.push({ day: 1, label: "Islamic New Year — 1 Muḥarram", color: "#455A64" });
      days.push({ day: 10, label: "Āshūrā — fast on 9th & 10th, or 10th & 11th", color: "#00bcd4" });
      break;
    case 3:
      days.push({ day: 12, label: "Mawlid of the Prophet ﷺ — 12 Rabī' al-Awwal", color: "#B08D4C" });
      break;
    case 7:
      days.push({ day: 27, label: "Laylat al-Mi'rāj — 27 Rajab", color: "#6A1B9A" });
      break;
    case 8:
      days.push({ day: 15, label: "Laylat al-Barā'ah — 15 Sha'bān", color: "#AD1457" });
      break;
    case 9:
      days.push({ day: 0, label: "Entire month — Fardh fasting for all Muslims", color: "#4A148C" });
      days.push({ day: 27, label: "Most likely Laylat al-Qadr — 27 Ramaḍān", color: "#1A237E" });
      days.push({ day: 21, label: "Possible Laylat al-Qadr — 21 Ramaḍān", color: "#1A237E" });
      days.push({ day: 23, label: "Possible Laylat al-Qadr — 23 Ramaḍān", color: "#1A237E" });
      days.push({ day: 25, label: "Possible Laylat al-Qadr — 25 Ramaḍān", color: "#1A237E" });
      days.push({ day: 29, label: "Possible Laylat al-Qadr — 29 Ramaḍān", color: "#1A237E" });
      break;
    case 10:
      days.push({ day: 1, label: "Eid al-Fiṭr — 1 Shawwāl (no fasting)", color: "#7A2E2E" });
      days.push({ day: 2, label: "Begin six days of Shawwāl Sunnah fasts", color: "rgba(11,100,50,.5)" });
      break;
    case 12:
      days.push({ day: 9, label: "Day of 'Arafah — Sunnah fast for non-pilgrims", color: "#E65100" });
      days.push({ day: 10, label: "Eid al-Aḍḥā — 10 Dhul-Ḥijjah (no fasting)", color: "#7A2E2E" });
      days.push({ day: 11, label: "Ayyām al-Tashrīq — 11–13 Dhul-Ḥijjah", color: "#B08D4C" });
      break;
  }
  return days;
}

interface LegendEntry { color: string; label: string; }
function legendEntriesForMonth(month: number, compact: boolean): LegendEntry[] {
  const out: LegendEntry[] = [];
  out.push({ color: "rgba(46,110,106,.18)", label: compact ? "Fast: Mon & Thu" : "Sunnah fast: Mondays & Thursdays" });
  out.push({ color: "rgba(100,149,237,.25)", label: compact ? "Bright days (13,14,15)" : "Sunnah fast: Bright days (13, 14, 15)" });
  out.push({ color: "rgba(210,180,140,.4)", label: compact ? "Ḥijāmah (cupping) days" : "Sunnah Ḥijāmah: cupping days (17, 19, 21)" });
  if (month === 1) {
    out.push({ color: "#455A64", label: compact ? "Islamic New Year (1 Muḥarram)" : "Islamic New Year — 1 Muḥarram" });
    out.push({ color: "#00bcd4", label: compact ? "Āshūrā fast (9, 10, 11)" : "Āshūrā fast — 9, 10, 11 Muḥarram (Sunnah)" });
  }
  if (month === 3) { out.push({ color: "#B08D4C", label: compact ? "Mawlid (12 Rabī' al-Awwal)" : "Mawlid of the Prophet ﷺ — 12 Rabī' al-Awwal" }); }
  if (month === 7) { out.push({ color: "#6A1B9A", label: compact ? "Laylat al-Mi'rāj (27 Rajab)" : "Laylat al-Mi'rāj — 27 Rajab" }); }
  if (month === 8) { out.push({ color: "#AD1457", label: compact ? "Laylat al-Barā'ah (15 Sha'bān)" : "Laylat al-Barā'ah — 15 Sha'bān" }); }
  if (month === 9) {
    out.push({ color: "#4A148C", label: compact ? "Ramaḍān — Fardh fast (entire month)" : "Ramaḍān — Fardh fast, entire month (all Muslims)" });
    out.push({ color: "#1A237E", label: compact ? "Laylat al-Qadr (odd nights, last 10)" : "Laylat al-Qadr — odd nights of the last 10 of Ramaḍān" });
  }
  if (month === 10) { out.push({ color: "#7A2E2E", label: compact ? "Eid al-Fiṭr (1 Shawwāl) — no fasting" : "Eid al-Fiṭr — 1 Shawwāl (no fasting)" }); }
  if (month === 12) {
    out.push({ color: "#E65100", label: compact ? "'Arafah fast (9 Dhul-Ḥijjah)" : "'Arafah fast — 9 Dhul-Ḥijjah (Sunnah for non-pilgrims)" });
    out.push({ color: "#7A2E2E", label: compact ? "Eid al-Aḍḥā (10 Dhul-Ḥijjah) — no fasting" : "Eid al-Aḍḥā — 10 Dhul-Ḥijjah (no fasting)" });
  }
  return out;
}

function buildMonthGrid(year: number, month: number) {
  const startGreg = hijriToGregorianSA(year, month, 1);
  let days = 30;
  const testGreg = hijriToGregorianSA(year, month, 30);
  const back = gregorianToHijriSA(testGreg);
  if (back.month !== month) days = 29;
  const startWeekday = startGreg.getDay();
  const cells: ({ day: number; greg: Date } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push({ day: d, greg: hijriToGregorianSA(year, month, d) });
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);
  return { cells, days };
}

interface CalendarMonthViewProps { year: number; month: number; todayHijri: HijriDate; compact?: boolean; }

export function CalendarMonthView({ year, month, todayHijri, compact }: CalendarMonthViewProps) {
  const { cells } = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const meta = HIJRI_META[month - 1];
  const specialDays = specialDaysForMonth(month);

  return (
    <div>
      {/* Month header — bilingual, centered, elegant */}
      <div style={{
        textAlign: "center",
        padding: compact ? "4px 0 8px" : "12px 0 16px",
        borderBottom: compact ? "none" : "1px solid rgba(176,141,76,.15)",
        marginBottom: compact ? 0 : 8,
      }}>
        <div style={{
          fontFamily: "var(--font-display-stack)", fontSize: compact ? ".95rem" : "1.5rem",
          fontWeight: 600, color: "#1B2A38", letterSpacing: ".01em",
        }}>
          {meta.latin} {year} AH
        </div>
        <div style={{
          fontFamily: "var(--font-arabic-stack)", direction: "rtl",
          color: "#2E6E6A", fontSize: compact ? ".85rem" : "1.25rem", marginTop: 2,
        }}>
          {meta.arabic} {toArabicDigits(year)}
        </div>
      </div>

      {/* Weekday headers — bilingual */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center", marginBottom: 4 }}>
        {WEEKDAYS_EN.map((d, i) => (
          <div key={d} style={{
            padding: compact ? "3px 0" : "6px 0",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
          }}>
            <div style={{
              fontFamily: "var(--font-sans-stack)", fontSize: compact ? ".55rem" : ".62rem",
              letterSpacing: ".08em", color: "#B08D4C", textTransform: "uppercase", fontWeight: 600,
            }}>{d}</div>
            {!compact && (
              <div style={{
                fontFamily: "var(--font-arabic-stack)", fontSize: ".7rem", color: "rgba(176,141,76,.5)",
              }}>{WEEKDAYS_AR[i]}</div>
            )}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((cell, idx) => {
          if (!cell) return <div key={idx} className="cal-cell muted" />;
          const classes = cellClasses(year, month, cell.day, todayHijri);
          return (
            <div key={idx} className={`cal-cell ${classes.join(" ")}`} title={`${cell.day} ${meta.latin} ${year} AH · ${cell.greg.toDateString()}`}>
              <div>{toArabicDigits(cell.day)}</div>
              <div className="greg">{cell.greg.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Special days panel — full view only */}
      {!compact && specialDays.length > 0 && (
        <div style={{
          marginTop: 16, padding: 14,
          background: "linear-gradient(135deg, rgba(46,110,106,.04), rgba(176,141,76,.04))",
          border: "1px solid rgba(176,141,76,.15)", borderRadius: 4,
        }}>
          <div style={{
            fontFamily: "var(--font-sans-stack)", fontSize: ".62rem", letterSpacing: ".14em",
            textTransform: "uppercase", color: "#B08D4C", marginBottom: 10, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <CalendarDays size={12} /> Special Days This Month
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {specialDays.map((d, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                fontFamily: "var(--font-serif-stack)", fontSize: ".8rem",
                color: "#2A2622", lineHeight: 1.4,
              }}>
                {d.day > 0 ? (
                  <span style={{
                    fontFamily: "var(--font-mono-stack)", fontSize: ".72rem",
                    color: d.color, fontWeight: 600, minWidth: 28,
                    padding: "1px 4px", background: `${d.color}15`, borderRadius: 2, textAlign: "center",
                  }}>{toArabicDigits(d.day)}</span>
                ) : (
                  <span style={{ color: "#7A2E2E", fontSize: ".9rem", minWidth: 28, textAlign: "center" }}>★</span>
                )}
                <span>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IslamicCalendar({ variant = "full" }: { variant?: "full" | "compact" }) {
  const [todayHijri, setTodayHijri] = useState<HijriDate | null>(null);
  const [year, setYear] = useState(1448);
  const [month, setMonth] = useState(1);
  const [converterValue, setConverterValue] = useState<string>("");
  const [converterResult, setConverterResult] = useState<HijriDate | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    const now = new Date();
    // Use getCurrentIslamicDate which applies:
    //   1. South African sighting offset (SA calendar is 1 day behind Umm al-Qura)
    //   2. Night-precedes-day rule (Islamic day starts at Maghrib/sunset)
    const hijri = getCurrentIslamicDate(now);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time init (hydration-safe: starts null)
    setTodayHijri(hijri);
    setYear(hijri.year);
    setMonth(hijri.month);
  }, []);

  const goPrev = () => { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); };
  const goNext = () => { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); };
  const convert = (gregStr: string) => {
    setConverterValue(gregStr);
    if (!gregStr) { setConverterResult(null); return; }
    const [y, m, d] = gregStr.split("-").map(Number);
    if (!y || !m || !d) { setConverterResult(null); return; }
    // Use SA sighting calendar for the converter too
    setConverterResult(gregorianToHijriSA(new Date(y, m - 1, d)));
  };

  // ─── Compact sidebar variant ───
  if (variant === "compact") {
    return (
      <div className="scard">
        <div className="shead">
          <span>Islamic Calendar</span>
          <span className="ar">التقويم الهجري</span>
        </div>
        <div className="sbody">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <button onClick={goPrev} aria-label="Previous month" className="chip" style={{ padding: "4px 8px" }}>
              <ChevronLeft size={14} />
            </button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".9rem", fontWeight: 600, color: "#1B2A38" }}>
                {HIJRI_MONTHS_LATIN[month - 1]} {year}
              </div>
              <div style={{ fontFamily: "var(--font-arabic-stack)", direction: "rtl", color: "#2E6E6A", fontSize: ".82rem" }}>
                {HIJRI_MONTHS_ARABIC[month - 1]} {toArabicDigits(year)}
              </div>
            </div>
            <button onClick={goNext} aria-label="Next month" className="chip" style={{ padding: "4px 8px" }}>
              <ChevronRight size={14} />
            </button>
          </div>
          <CalendarMonthView year={year} month={month} todayHijri={todayHijri ?? NULL_HIJRI} compact />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
            {legendEntriesForMonth(month, true).map((e, i) => (
              <LegendDot key={i} color={e.color} label={e.label} />
            ))}
          </div>
          <div style={{
            marginTop: 10, padding: "8px 10px",
            background: "linear-gradient(135deg, rgba(46,110,106,.06), rgba(176,141,76,.04))",
            border: "1px solid rgba(176,141,76,.12)", borderRadius: 3, textAlign: "center",
          }}>
            <div style={{ fontFamily: "var(--font-arabic-stack)", direction: "rtl", color: "#1B2A38", fontSize: "1.05rem" }}>
              {todayHijri ? todayHijri.formattedArabic : "—"}
            </div>
            <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".62rem", color: "#5A5750", marginTop: 2 }}>
              {todayHijri ? todayHijri.formattedLatin : "Loading…"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Full-page variant — world-class layout ───
  const meta = HIJRI_META[month - 1];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, marginTop: 20 }} className="cal-full-grid-wrap">
      {/* ─── Left: Calendar ─── */}
      <div className="scard" style={{ padding: 0, overflow: "hidden" }}>
        {/* Premium header bar */}
        <div style={{
          background: "linear-gradient(135deg, #1B2A38 0%, #243845 100%)",
          padding: "18px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{
              fontFamily: "var(--font-display-stack)", fontSize: "1.3rem", fontWeight: 600,
              color: "#F1E9D8", letterSpacing: ".01em",
            }}>{meta.latin} {year} AH</div>
            <div style={{
              fontFamily: "var(--font-arabic-stack)", direction: "rtl",
              color: "#2E6E6A", fontSize: "1.15rem", marginTop: 2,
            }}>{meta.arabic} {toArabicDigits(year)}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={goPrev} style={{
              background: "rgba(176,141,76,.15)", border: "1px solid rgba(176,141,76,.3)",
              color: "#F1E9D8", borderRadius: 3, cursor: "pointer",
              padding: "8px 10px", display: "flex", alignItems: "center", gap: 4,
              fontFamily: "var(--font-sans-stack)", fontSize: ".72rem",
              transition: "background .2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(176,141,76,.3)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(176,141,76,.15)"}
            ><ChevronLeft size={14} /> Prev</button>
            <button onClick={() => { if (todayHijri) { setMonth(todayHijri.month); setYear(todayHijri.year); } }} style={{
              background: "rgba(46,110,106,.2)", border: "1px solid rgba(46,110,106,.4)",
              color: "#F1E9D8", borderRadius: 3, cursor: "pointer",
              padding: "8px 12px", display: "flex", alignItems: "center", gap: 4,
              fontFamily: "var(--font-sans-stack)", fontSize: ".72rem",
              transition: "background .2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(46,110,106,.35)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(46,110,106,.2)"}
            ><RotateCcw size={12} /> Today</button>
            <button onClick={goNext} style={{
              background: "rgba(176,141,76,.15)", border: "1px solid rgba(176,141,76,.3)",
              color: "#F1E9D8", borderRadius: 3, cursor: "pointer",
              padding: "8px 10px", display: "flex", alignItems: "center", gap: 4,
              fontFamily: "var(--font-sans-stack)", fontSize: ".72rem",
              transition: "background .2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(176,141,76,.3)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(176,141,76,.15)"}
            >Next <ChevronRight size={14} /></button>
          </div>
        </div>

        {/* Calendar body */}
        <div className="sbody" style={{ padding: "16px 18px" }}>
          <CalendarMonthView year={year} month={month} todayHijri={todayHijri ?? NULL_HIJRI} />

          {/* About this month — elegant info box */}
          <div style={{
            marginTop: 16, padding: "14px 16px",
            background: "linear-gradient(135deg, rgba(46,110,106,.04), rgba(176,141,76,.04))",
            border: "1px solid rgba(176,141,76,.12)", borderRadius: 4,
          }}>
            <div style={{
              fontFamily: "var(--font-sans-stack)", fontSize: ".62rem", letterSpacing: ".14em",
              textTransform: "uppercase", color: "#B08D4C", marginBottom: 6, fontWeight: 600,
            }}>About This Month</div>
            <p style={{
              fontFamily: "var(--font-serif-stack)", fontSize: ".88rem", color: "#2A2622",
              lineHeight: 1.7, margin: 0,
            }}>{meta.note}</p>
          </div>

          {/* Legend — context-aware */}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 5 }}>
            {legendEntriesForMonth(month, false).map((e, i) => (
              <LegendDot key={i} color={e.color} label={e.label} />
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right: Sidebar panels ─── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Today's Hijri Date — premium card */}
        <div className="scard" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            background: "linear-gradient(135deg, #1B2A38 0%, #2E6E6A 100%)",
            padding: "20px 18px", textAlign: "center",
          }}>
            <div style={{
              fontFamily: "var(--font-sans-stack)", fontSize: ".58rem", letterSpacing: ".2em",
              textTransform: "uppercase", color: "#B08D4C", marginBottom: 8, fontWeight: 600,
            }}>Today's Hijri Date</div>
            <div style={{
              fontFamily: "var(--font-arabic-stack)", direction: "rtl",
              fontSize: "1.8rem", color: "#F1E9D8", lineHeight: 1.4,
            }}>
              {todayHijri ? todayHijri.formattedArabic : "—"}
            </div>
            <div style={{
              fontFamily: "var(--font-serif-stack)", fontSize: ".85rem",
              color: "rgba(241,233,216,.6)", marginTop: 4,
            }}>
              {todayHijri ? todayHijri.formattedLatin : "Loading…"}
            </div>
            <div style={{
              fontFamily: "var(--font-sans-stack)", fontSize: ".68rem",
              color: "rgba(241,233,216,.35)", marginTop: 6,
            }}>
              {todayHijri ? `Gregorian: ${new Date().toDateString()}` : ""}
            </div>
          </div>
        </div>

        {/* Hijri–Gregorian Converter — elegant card */}
        <div className="scard">
          <div className="shead">
            <span>Date Converter</span>
            <span className="ar">تحويل التاريخ</span>
          </div>
          <div className="sbody">
            <label style={{
              fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", letterSpacing: ".08em",
              color: "#5A5750", display: "block", marginBottom: 6, textTransform: "uppercase",
            }}>Gregorian → Hijri</label>
            <input
              type="date"
              value={converterValue}
              onChange={e => convert(e.target.value)}
              className="input-parch"
              style={{ width: "100%" }}
            />
            <div style={{
              marginTop: 12, padding: "14px 16px",
              background: "linear-gradient(135deg, rgba(46,110,106,.06), rgba(176,141,76,.04))",
              border: "1px solid rgba(176,141,76,.12)", borderRadius: 4, textAlign: "center",
            }}>
              {converterResult ? (
                <>
                  <div style={{
                    fontFamily: "var(--font-arabic-stack)", direction: "rtl",
                    fontSize: "1.4rem", color: "#1B2A38",
                  }}>
                    {converterResult.formattedArabic}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-serif-stack)", fontSize: ".82rem",
                    color: "#2E6E6A", marginTop: 4,
                  }}>{converterResult.formattedLatin}</div>
                </>
              ) : (
                <div style={{
                  fontFamily: "var(--font-sans-stack)", fontSize: ".75rem",
                  color: "#8A8578", fontStyle: "italic",
                }}>Select a date to convert →</div>
              )}
            </div>
          </div>
        </div>

        {/* Browse All 12 Months — elegant grid */}
        <div className="scard">
          <div className="shead">
            <span>Browse All Months</span>
            <span className="ar">تصفح الأشهر</span>
          </div>
          <div className="sbody">
            <button onClick={() => setShowArchive(s => !s)} className="chip" style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>
              <Search size={12} /> {showArchive ? "Hide" : "Show"} All 12 Islamic Months
            </button>
            {showArchive && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                {HIJRI_META.map(m => (
                  <button
                    key={m.number}
                    onClick={() => { setMonth(m.number); setShowArchive(false); }}
                    style={{
                      padding: "8px 10px", cursor: "pointer",
                      background: m.number === month ? "rgba(46,110,106,.1)" : "transparent",
                      border: `1px solid ${m.number === month ? "rgba(46,110,106,.3)" : "rgba(176,141,76,.15)"}`,
                      borderRadius: 3, textAlign: "left",
                      display: "flex", flexDirection: "column", gap: 1,
                      transition: "background .15s, border-color .15s",
                    }}
                    onMouseEnter={e => { if (m.number !== month) { e.currentTarget.style.background = "rgba(176,141,76,.06)"; e.currentTarget.style.borderColor = "rgba(176,141,76,.3)"; } }}
                    onMouseLeave={e => { if (m.number !== month) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(176,141,76,.15)"; } }}
                  >
                    <span style={{ fontFamily: "var(--font-serif-stack)", fontSize: ".76rem", color: "#1B2A38", fontWeight: 500 }}>
                      {m.number}. {m.latin}
                    </span>
                    <span style={{ fontFamily: "var(--font-arabic-stack)", direction: "rtl", fontSize: ".82rem", color: "#2E6E6A" }}>
                      {m.arabic}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font-sans-stack)", fontSize: ".72rem", color: "#2A2622" }}>
      <div style={{ width: 12, height: 12, borderRadius: 2, background: color, flexShrink: 0, border: "1px solid rgba(0,0,0,.06)" }} />
      {label}
    </div>
  );
}

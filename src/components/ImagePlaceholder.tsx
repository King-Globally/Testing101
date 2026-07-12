"use client";
import { useState } from "react";
import type { ComponentType } from "react";
import { FileText, BookOpen, Clock, Bell, Download, Sparkles, Moon, Calendar, ShieldCheck, ScrollText, Mail, HelpCircle } from "lucide-react";

type Mode = "photo" | "icon" | "pattern";
type LucideIcon = ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;

interface ImagePlaceholderProps {
  mode?: Mode;
  src?: string;
  alt?: string;
  slotId: string;
  ratio?: "16:9" | "1:1" | "4:3" | "3:2" | "21:9";
  lazy?: boolean;
  rounded?: boolean;
  attribution?: string;
  icon?: LucideIcon;
  iconSize?: number;
  overlayIcon?: LucideIcon;
  overlayLabel?: string;
}

const RATIO_PADDING: Record<string, string> = {
  "16:9": "56.25%", "1:1": "100%", "4:3": "75%", "3:2": "66.67%", "21:9": "42.86%",
};

const PALETTES = [
  { bg: "#1B2A38", pattern: "#2E6E6A", accent: "#C9A85E" },
  { bg: "#0F1A23", pattern: "#1B2A38", accent: "#B08D4C" },
  { bg: "#2E6E6A", pattern: "#1B2A38", accent: "#E8D8A8" },
  { bg: "#5A4A2A", pattern: "#3A2A1A", accent: "#C9A85E" },
  { bg: "#1a3a3a", pattern: "#0F2A2A", accent: "#B08D4C" },
];

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Zakāh": Sparkles, "Ṣawm (Fasting)": Moon, "Iʿtikāf": BookOpen,
  "Bidʿah": ShieldCheck, "Ḥalāl & Ḥarām": ShieldCheck, "Ṣalāh": Clock,
  "fiqh": BookOpen, "salah": Clock, "zakah": Sparkles, "qurbani": ScrollText,
  "akhlaq": ShieldCheck, "bidah": ShieldCheck, "current": Bell, "ramadan": Moon,
};

export default function ImagePlaceholder({
  mode = "pattern", src, alt = "", slotId, ratio = "16:9",
  lazy = true, rounded = true, attribution, icon, iconSize = 32, overlayIcon, overlayLabel,
}: ImagePlaceholderProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const paletteIndex = slotId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTES.length;
  const palette = PALETTES[paletteIndex];

  if (mode === "icon" && icon) {
    const Icon = icon;
    return (
      <div data-slot={slotId} style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: iconSize + 16, height: iconSize + 16, borderRadius: "50%",
        background: `${palette.accent}15`, border: `1px solid ${palette.accent}33`, flexShrink: 0,
      }}>
        <Icon size={iconSize} style={{ color: palette.accent }} />
      </div>
    );
  }

  const showImage = mode === "photo" && src && !imgError && imgLoaded;
  const showPattern = !showImage;

  return (
    <div data-slot={slotId} style={{
      position: "relative", width: "100%", paddingTop: RATIO_PADDING[ratio],
      overflow: "hidden", borderRadius: rounded ? 4 : 0, background: palette.bg,
    }}>
      {/* Islamic geometric frame border — always visible, frames both image and pattern */}
      <div style={{
        position: "absolute", inset: 0,
        border: "2px solid rgba(201,168,94,.35)",
        borderRadius: rounded ? 4 : 0,
        pointerEvents: "none", zIndex: 3,
        boxShadow: "inset 0 0 0 1px rgba(201,168,94,.1)",
      }} />
      {/* Corner accents — visible when image is loaded, creates framed art effect */}
      {showImage && [
        { top: 0, left: 0, borderTop: "3px solid rgba(201,168,94,.7)", borderLeft: "3px solid rgba(201,168,94,.7)" },
        { top: 0, right: 0, borderTop: "3px solid rgba(201,168,94,.7)", borderRight: "3px solid rgba(201,168,94,.7)" },
        { bottom: 0, left: 0, borderBottom: "3px solid rgba(201,168,94,.7)", borderLeft: "3px solid rgba(201,168,94,.7)" },
        { bottom: 0, right: 0, borderBottom: "3px solid rgba(201,168,94,.7)", borderRight: "3px solid rgba(201,168,94,.7)" },
      ].map((c, i) => (
        <div key={i} style={{ position: "absolute", width: 14, height: 14, zIndex: 4, pointerEvents: "none", ...c }} />
      ))}
      {mode === "photo" && src && !imgError && (
        <img src={src} alt={alt} loading={lazy ? "lazy" : "eager"}
          onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
          style={{ position: "absolute", inset: showImage ? 5 : 0,
            width: showImage ? "calc(100% - 10px)" : "100%",
            height: showImage ? "calc(100% - 10px)" : "100%",
            objectFit: "cover", opacity: showImage ? 1 : 0,
            transition: "opacity .4s ease, inset .4s ease",
            borderRadius: rounded ? 2 : 0 }} />
      )}
      {showImage && overlayIcon && (() => { const OI = overlayIcon; return (
        <div style={{ position: "absolute", top: 8, left: 8,
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 8px", borderRadius: 3, background: "rgba(27, 42, 56, 0.85)",
          backdropFilter: "blur(4px)", color: "#E8D8A8",
          fontFamily: "var(--font-sans-stack)", fontSize: ".58rem", fontWeight: 600,
          letterSpacing: ".08em", textTransform: "uppercase", pointerEvents: "none" }}>
          <OI size={11} /> {overlayLabel}
        </div>); })()}
      {showImage && attribution && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 8px",
          background: "linear-gradient(transparent, rgba(0,0,0,.6))",
          fontFamily: "var(--font-sans-stack)", fontSize: ".55rem", color: "rgba(255,255,255,.7)",
          textAlign: "right", pointerEvents: "none" }}>{attribution}</div>
      )}
      {showPattern && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.pattern} 100%)` }}>
          <svg width="100%" height="100%" viewBox="0 0 200 200"
            style={{ position: "absolute", inset: 0, opacity: 0.15 }} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <pattern id={`pattern-${slotId}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <g fill="none" stroke={palette.accent} strokeWidth="0.5">
                  <path d="M20 5 L25 15 L35 20 L25 25 L20 35 L15 25 L5 20 L15 15 Z" />
                  <rect x="10" y="10" width="20" height="20" transform="rotate(45 20 20)" />
                  <circle cx="20" cy="20" r="8" />
                </g>
              </pattern>
            </defs>
            <rect width="200" height="200" fill={`url(#pattern-${slotId})`} />
          </svg>
          <div style={{ position: "relative", zIndex: 1, opacity: 0.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            {icon ? (() => { const Icon = icon; return <Icon size={28} style={{ color: palette.accent }} />; })() : (
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke={palette.accent} strokeWidth="1" aria-hidden="true">
                <circle cx="18" cy="18" r="14" />
                <path d="M18 4 L22 14 L32 18 L22 22 L18 32 L14 22 L4 18 L14 14 Z" />
                <circle cx="18" cy="18" r="6" />
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

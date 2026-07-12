"use client";
import { useState, useEffect } from "react";

/**
 * WhatsAppPopup — subtle, intelligent popup.
 *
 * Behavior:
 * - Floating button appears immediately (small, no pulse)
 * - Popup card appears after 2 MINUTES of visit (only once per visitor)
 * - Uses localStorage to track unique visitors — never shows twice
 * - Auto-dismisses after 10 seconds
 * - User can dismiss manually (also prevents re-show)
 * - Only shows on return visits if >24h have passed since last dismiss
 */

const WHATSAPP_NUMBER = "27786786713";
const WHATSAPP_MESSAGE = "As-salāmu ʿalaykum, I have a question for the Jamiatul Ulama Johannesburg.";
const STORAGE_KEY = "jamiat.wa-popup.seen";
const SHOW_DELAY = 120000; // 2 minutes
const AUTO_DISMISS = 10000; // 10 seconds
const RE_SHOW_INTERVAL = 86400000; // 24 hours

export default function WhatsAppPopup() {
  const [popupVisible, setPopupVisible] = useState(false);
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    // Check if this visitor has seen the popup before
    try {
      const lastSeen = localStorage.getItem(STORAGE_KEY);
      if (lastSeen) {
        const elapsed = Date.now() - parseInt(lastSeen, 10);
        if (elapsed < RE_SHOW_INTERVAL) {
          // Seen recently — don't show again
          setCanShow(false);
          return;
        }
      }
    } catch { /* localStorage unavailable */ }

    setCanShow(true);

    // Start 2-minute timer
    const timer = setTimeout(() => {
      setPopupVisible(true);
    }, SHOW_DELAY);

    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!popupVisible) return;
    const dismissTimer = setTimeout(() => {
      setPopupVisible(false);
      markSeen();
    }, AUTO_DISMISS);
    return () => clearTimeout(dismissTimer);
  }, [popupVisible]);

  const markSeen = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch { /* ignore */ }
  };

  const handleConnect = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`, "_blank");
    setPopupVisible(false);
    markSeen();
  };

  const handleDismiss = () => {
    setPopupVisible(false);
    markSeen();
  };

  return (
    <>
      {/* Small, subtle floating button — always visible */}
      <button onClick={() => setPopupVisible(v => !v)} aria-label="WhatsApp us" style={{
        position: "fixed", bottom: 20, right: 20, width: 44, height: 44,
        borderRadius: "50%", background: "#25D366", border: "none", cursor: "pointer",
        zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(37, 211, 102, 0.25)",
        opacity: 0.85,
        transition: "opacity .2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "0.85"; }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </button>

      {/* Popup — only after 2 min, auto-dismisses after 10s */}
      {popupVisible && canShow && (
        <div style={{
          position: "fixed", bottom: 76, right: 20, width: 280, zIndex: 9998,
          background: "white", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,.1)",
          overflow: "hidden",
          animation: "headlineSlide .4s ease both",
          fontFamily: "var(--font-sans-stack)",
        }}>
          <div style={{ background: "#25D366", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "white", fontSize: ".78rem", fontWeight: 600 }}>Jamiatul Ulama JHB</span>
            <button onClick={handleDismiss} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,.6)", fontSize: "1rem", padding: 0, lineHeight: 1 }} aria-label="Close">×</button>
          </div>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ background: "#DCF8C6", borderRadius: 6, padding: "8px 10px", marginBottom: 10, fontSize: ".78rem", color: "#1B2A38", lineHeight: 1.5 }}>
              As-salāmu ʿalaykum<br />For fatwa questions, please send a WhatsApp message.
            </div>
            <button onClick={handleConnect} style={{
              width: "100%", padding: "8px 14px", borderRadius: 5, background: "#25D366",
              border: "none", cursor: "pointer", color: "white",
              fontSize: ".78rem", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Connect on WhatsApp
            </button>
            <p style={{ fontSize: ".58rem", color: "#999", textAlign: "center", marginTop: 6, marginBottom: 0 }}>
              +27 786 786 713
            </p>
          </div>
        </div>
      )}
    </>
  );
}

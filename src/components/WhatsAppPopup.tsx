"use client";
import { useState, useEffect } from "react";

/**
 * WhatsAppPopup — floating WhatsApp button with auto-popup.
 *
 * Features:
 * - Fixed floating green WhatsApp button (bottom-right)
 * - Auto-pops up after 5 seconds with a greeting message
 * - Clicking connects immediately to WhatsApp (wa.me link)
 * - Dismissible — popup closes but floating button remains
 * - Re-opens if user hasn't interacted after 30 seconds
 * - Mobile responsive
 */

const WHATSAPP_NUMBER = "27786786713"; // +27 786 786 713
const WHATSAPP_MESSAGE = "As-salāmu ʿalaykum, I have a question for the Jamiatul Ulama Johannesburg.";

export default function WhatsAppPopup() {
  const [popupVisible, setPopupVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Auto-show popup after 5 seconds (only once)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!dismissed) setPopupVisible(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  const handleConnect = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    window.open(url, "_blank");
  };

  const handleDismiss = () => {
    setPopupVisible(false);
    setDismissed(true);
    // Re-show after 60 seconds if dismissed
    setTimeout(() => setPopupVisible(true), 60000);
  };

  return (
    <>
      {/* Floating WhatsApp button — always visible */}
      <button
        onClick={() => setPopupVisible(v => !v)}
        aria-label="WhatsApp us"
        style={{
          position: "fixed",
          bottom: 20, right: 20,
          width: 56, height: 56,
          borderRadius: "50%",
          background: "#25D366",
          border: "none",
          cursor: "pointer",
          zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(37, 211, 102, 0.4)",
          transition: "transform .2s ease, box-shadow .2s ease",
          animation: "livepulse 3s infinite",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(37, 211, 102, 0.5)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(37, 211, 102, 0.4)"; }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </button>

      {/* Popup card — auto-appears after 5s */}
      {popupVisible && (
        <div style={{
          position: "fixed",
          bottom: 88, right: 20,
          width: 300,
          zIndex: 9998,
          background: "white",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,.15)",
          overflow: "hidden",
          animation: "headlineSlide .4s cubic-bezier(0.65,0,0.35,1) both",
          fontFamily: "var(--font-sans-stack)",
        }}>
          {/* Header — green WhatsApp bar */}
          <div style={{
            background: "#25D366",
            padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span style={{ color: "white", fontSize: ".82rem", fontWeight: 600 }}>Jamiatul Ulama JHB</span>
            </div>
            <button
              onClick={handleDismiss}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,.7)", padding: 2, lineHeight: 1,
                fontSize: "1.1rem",
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Body — greeting + connect button */}
          <div style={{ padding: "14px 16px" }}>
            <div style={{
              background: "#DCF8C6",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 12,
              fontSize: ".8rem",
              color: "#1B2A38",
              lineHeight: 1.5,
            }}>
              As-salāmu ʿalaykum
              <br />
              For fatwa questions, please send a WhatsApp message.
            </div>

            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: ".68rem", color: "#999" }}>Fatwā Q&A · +27 786 786 713</span>
            </div>

            <button
              onClick={handleConnect}
              style={{
                width: "100%", padding: "10px 16px",
                borderRadius: 6,
                background: "#25D366",
                border: "none", cursor: "pointer",
                color: "white",
                fontFamily: "var(--font-sans-stack)",
                fontSize: ".82rem", fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "background .2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#1ebe5d"}
              onMouseLeave={e => e.currentTarget.style.background = "#25D366"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Connect on WhatsApp
            </button>

            <p style={{
              fontSize: ".62rem", color: "#999", textAlign: "center",
              marginTop: 8, marginBottom: 0,
            }}>
              +27 786 786 713 · Fatwā Q&A only
            </p>
          </div>
        </div>
      )}
    </>
  );
}

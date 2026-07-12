"use client";
import { useEffect, useRef } from "react";

export default function PeacockFeatherCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const cursor = cursorRef.current;
    const trailLayer = trailLayerRef.current;
    if (!cursor || !trailLayer) return;

    document.documentElement.classList.add("peacock-active");

    let lastTrail = 0;

    const onMove = (e: MouseEvent) => {
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      const now = performance.now();
      if (now - lastTrail > 30) {
        lastTrail = now;
        const dot = document.createElement("div");
        dot.className = "peacock-ink-trail";
        dot.style.left = `${e.clientX}px`;
        dot.style.top = `${e.clientY}px`;
        trailLayer.appendChild(dot);
        setTimeout(() => dot.remove(), 500);
      }
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t) return;
      if (t.closest("a, button, [role='button'], .clickable, input, textarea, select, .cal-cell, .chip")) {
        cursor.classList.add("over-link");
      }
    };
    const onOut = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t) return;
      if (t.closest("a, button, [role='button'], .clickable, input, textarea, select, .cal-cell, .chip")) {
        cursor.classList.remove("over-link");
      }
    };

    const onVisibility = () => {
      if (document.hidden) cursor.style.opacity = "0";
      else cursor.style.opacity = "1";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mouseout", onOut, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
      document.removeEventListener("visibilitychange", onVisibility);
      document.documentElement.classList.remove("peacock-active");
    };
  }, []);

  return (
    <>
      <div ref={trailLayerRef} aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 99997 }} />
      <div ref={cursorRef} className="peacock-cursor" aria-hidden="true">
        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="peye" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1a6b48" />
              <stop offset="55%" stopColor="#0e7a6e" />
              <stop offset="80%" stopColor="#0B3D2E" />
              <stop offset="100%" stopColor="#062920" />
            </radialGradient>
            <linearGradient id="pshaft" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E8D08A" />
              <stop offset="60%" stopColor="#B8921E" />
              <stop offset="100%" stopColor="#7A1F2B" />
            </linearGradient>
            <linearGradient id="pbarb" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e7a6e" />
              <stop offset="100%" stopColor="#1a6b48" />
            </linearGradient>
          </defs>
          <ellipse cx="16" cy="8" rx="8" ry="7" fill="url(#peye)" />
          <ellipse cx="16" cy="8" rx="4" ry="3.5" fill="#0B3D2E" />
          <ellipse cx="16" cy="8" rx="1.6" ry="1.4" fill="#D4A830" />
          <path d="M16 13 L8 18 M16 13 L24 18 M16 13 L6 23 M16 13 L26 23" stroke="url(#pbarb)" strokeWidth="0.8" fill="none" opacity="0.65" />
          <line x1="16" y1="13" x2="16" y2="26" stroke="url(#pshaft)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 26 L13 30 L16 28 L19 30 Z" fill="#1A1C18" />
          <circle cx="16" cy="27.5" r="0.8" fill="#D4A830" />
        </svg>
      </div>
    </>
  );
}

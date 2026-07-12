"use client";
import { useEffect, useRef, useState } from "react";

/**
 * PeacockFeatherCursor — custom cursor that NEVER disappears during normal use.
 *
 * The cursor stays visible at all times when a mouse/trackpad is active.
 * It only hides when:
 *   - The page tab is hidden (user switched tabs)
 *   - The mouse leaves the browser window entirely
 *
 * It does NOT have an idle timeout — the cursor stays visible even when
 * the user stops moving. This prevents the "disappearing cursor" bug.
 */

export default function PeacockFeatherCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailLayerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const finePointerMQ = window.matchMedia("(pointer: fine)");
    const hoverMQ = window.matchMedia("(hover: hover)");
    const reducedMotionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

    const hasFinePointer = finePointerMQ.matches;
    const supportsHover = hoverMQ.matches;
    const isCapable = hasFinePointer && supportsHover;

    if (!isCapable) {
      setShouldRender(false);
      return;
    }

    setShouldRender(true);

    const initTimer = setTimeout(() => {
      const cursor = cursorRef.current;
      const trailLayer = trailLayerRef.current;
      if (!cursor || !trailLayer) return;

      document.documentElement.classList.add("peacock-active");

      let lastTrail = 0;
      let rafId: number | null = null;
      let pendingX = 0;
      let pendingY = 0;
      let trailDotCount = 0;
      const reducedMotion = reducedMotionMQ.matches;

      const updatePosition = () => {
        rafId = null;
        cursor.style.transform = `translate(${pendingX}px, ${pendingY}px) translate(-50%, -50%)`;
      };

      const createTrailDot = (x: number, y: number) => {
        if (reducedMotion) return;
        if (trailDotCount >= 15) return;
        const now = performance.now();
        if (now - lastTrail < 30) return;
        lastTrail = now;
        const dot = document.createElement("div");
        dot.className = "peacock-ink-trail";
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;
        trailLayer.appendChild(dot);
        trailDotCount++;
        setTimeout(() => {
          dot.remove();
          trailDotCount = Math.max(0, trailDotCount - 1);
        }, 500);
      };

      const onMouseMove = (e: MouseEvent) => {
        pendingX = e.clientX;
        pendingY = e.clientY;
        if (rafId === null) {
          rafId = requestAnimationFrame(updatePosition);
        }
        createTrailDot(e.clientX, e.clientY);
        // Always keep cursor visible on mouse move
        cursor.style.opacity = "1";
      };

      const onMouseOver = (e: MouseEvent) => {
        const t = e.target as HTMLElement;
        if (!t || !t.closest) return;
        if (t.closest("a, button, [role='button'], .clickable, input, textarea, select, .cal-cell, .chip, [data-slot]")) {
          cursor.classList.add("over-link");
        }
      };

      const onMouseOut = (e: MouseEvent) => {
        const t = e.target as HTMLElement;
        if (!t || !t.closest) return;
        if (t.closest("a, button, [role='button'], .clickable, input, textarea, select, .cal-cell, .chip, [data-slot]")) {
          cursor.classList.remove("over-link");
        }
      };

      // Only hide when mouse leaves the window entirely
      const onMouseLeave = () => {
        cursor.style.opacity = "0";
        cursor.classList.remove("over-link");
      };

      const onMouseEnter = () => {
        cursor.style.opacity = "1";
      };

      // Only hide when tab is switched
      const onVisibilityChange = () => {
        if (document.hidden) {
          cursor.style.opacity = "0";
          cursor.classList.remove("over-link");
        } else {
          cursor.style.opacity = "1";
        }
      };

      window.addEventListener("mousemove", onMouseMove, { passive: true });
      window.addEventListener("mouseover", onMouseOver, { passive: true });
      window.addEventListener("mouseout", onMouseOut, { passive: true });
      document.documentElement.addEventListener("mouseleave", onMouseLeave);
      document.documentElement.addEventListener("mouseenter", onMouseEnter);
      document.addEventListener("visibilitychange", onVisibilityChange);

      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseover", onMouseOver);
        window.removeEventListener("mouseout", onMouseOut);
        document.documentElement.removeEventListener("mouseleave", onMouseLeave);
        document.documentElement.removeEventListener("mouseenter", onMouseEnter);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        if (rafId !== null) cancelAnimationFrame(rafId);
        trailLayer.innerHTML = "";
        trailDotCount = 0;
        document.documentElement.classList.remove("peacock-active");
      };
    }, 50);

    return () => {
      clearTimeout(initTimer);
      document.documentElement.classList.remove("peacock-active");
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <>
      <div ref={trailLayerRef} aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 99997 }} />
      <div ref={cursorRef} className="peacock-cursor" aria-hidden="true" style={{ opacity: 0 }}>
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

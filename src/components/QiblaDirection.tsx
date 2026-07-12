"use client";
import { useState, useMemo } from "react";
import { Compass, RotateCcw } from "lucide-react";

/**
 * QiblaDirection — visual compass showing the direction from Johannesburg
 * to the Ka'bah in Makkah.
 *
 * Math:
 *   Johannesburg: lat -26.2041, lon 28.0473
 *   Makkah:       lat  21.4225, lon  39.8262
 *
 * Bearing formula (initial bearing on great circle):
 *   θ = atan2( sin Δλ · cos φ₂ ,
 *              cos φ₁ · sin φ₂ − sin φ₁ · cos φ₂ · cos Δλ )
 *
 * Result: ~118.6° from true north (i.e. east-north-east) for Johannesburg.
 */
const JOHANNESBURG = { lat: -26.2041, lon: 28.0473 };
const MAKKAH       = { lat:  21.4225, lon: 39.8262 };

function toRad(d: number) { return d * Math.PI / 180; }
function toDeg(r: number) { return r * 180 / Math.PI; }

function computeQiblaBearing(from: { lat: number; lon: number }, to: { lat: number; lon: number }): number {
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lon - from.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

const QIBLA_BEARING = computeQiblaBearing(JOHANNESBURG, MAKKAH);

export default function QiblaDirection() {
  const [deviceBearing, setDeviceBearing] = useState<number | null>(null);
  const [supported, setSupported] = useState(true);

  // Determine device orientation if possible (mobile / permission-gated)
  const enableCompass = async () => {
    try {
      // iOS 13+ requires explicit permission
      const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
      if (D && typeof D.requestPermission === "function") {
        const perm = await D.requestPermission();
        if (perm !== "granted") { setSupported(false); return; }
      }
      const handler = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
        if (typeof e.webkitCompassHeading === "number") {
          setDeviceBearing(e.webkitCompassHeading);
        } else if (e.alpha !== null) {
          setDeviceBearing(360 - e.alpha);
        }
      };
      window.addEventListener("deviceorientationabsolute", handler as EventListener);
      window.addEventListener("deviceorientation", handler as EventListener);
    } catch {
      setSupported(false);
    }
  };

  // The angle the qibla arrow should rotate, accounting for the device heading.
  const arrowRotation = useMemo(() => {
    if (deviceBearing === null) return QIBLA_BEARING;
    return QIBLA_BEARING - deviceBearing;
  }, [deviceBearing]);

  return (
    <div className="scard">
      <div className="shead">
        <span>Qibla Direction</span>
        <span className="ar">اتجاه القبلة</span>
      </div>
      <div className="sbody" style={{ textAlign: "center" }}>
        {/* Compass rose */}
        <div style={{
          position: "relative",
          width: 180, height: 180, margin: "0 auto 12px",
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--parch-warm), var(--parch-dark))",
          border: "2px solid var(--gold)",
          boxShadow: "inset 0 0 12px rgba(11,61,46,.12), 0 2px 8px rgba(11,61,46,.1)",
        }}>
          {/* Cardinal directions */}
          {["N","E","S","W"].map((d, i) => (
            <span key={d} style={{
              position: "absolute",
              top: i === 0 ? 4 : "auto",
              bottom: i === 2 ? 4 : "auto",
              left: i === 3 ? 4 : "auto",
              right: i === 1 ? 4 : "auto",
              fontFamily: "var(--font-sans-stack)",
              fontSize: ".7rem",
              fontWeight: 600,
              color: i === 0 ? "var(--maroon)" : "var(--forest)",
              transform: i === 1 || i === 3 ? "translateY(-50%)" : "translateX(-50%)",
              ...(i === 1 ? { top: "50%", right: 6 } : {}),
              ...(i === 3 ? { top: "50%", left: 6 } : {}),
            }}>{d}</span>
          ))}
          {/* Inner ring marks */}
          {Array.from({length: 24}, (_, i) => (
            <div key={i} style={{
              position: "absolute",
              top: "50%", left: "50%",
              width: 1, height: i % 6 === 0 ? 10 : 5,
              background: i % 6 === 0 ? "var(--gold)" : "var(--parch-dark)",
              transformOrigin: "50% 80px",
              transform: `rotate(${i * 15}deg) translate(-50%, -80px)`,
            }} />
          ))}
          {/* Qibla arrow */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            width: 4, height: 80,
            transformOrigin: "50% 0",
            transform: `translate(-50%, 0) rotate(${arrowRotation}deg)`,
            transition: "transform .3s ease-out",
          }}>
            {/* Arrow tip (Ka'bah direction) */}
            <div style={{
              position: "absolute",
              top: -2, left: "50%",
              transform: "translateX(-50%)",
              width: 0, height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom: "14px solid var(--forest)",
            }} />
            {/* Shaft */}
            <div style={{
              position: "absolute",
              top: 12, left: "50%",
              transform: "translateX(-50%)",
              width: 3, height: 68,
              background: "linear-gradient(180deg, var(--forest), var(--gold))",
            }} />
            {/* Ka'bah symbol at the tip */}
            <div style={{
              position: "absolute",
              top: -10, left: "50%",
              transform: "translateX(-50%)",
              width: 12, height: 12,
              background: "var(--ink)",
              border: "1.5px solid var(--gold)",
              borderRadius: 1,
            }} />
          </div>
          {/* Center hub */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 14, height: 14,
            borderRadius: "50%",
            background: "var(--gold)",
            border: "2px solid var(--forest-deep)",
            boxShadow: "0 1px 3px rgba(0,0,0,.3)",
          }} />
        </div>

        <div style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".82rem", color: "var(--ink-mid)", marginBottom: 4 }}>
          <strong style={{ color: "var(--forest)" }}>{Math.round(QIBLA_BEARING)}°</strong> from North
        </div>
        <div style={{ fontFamily: "var(--font-arabic-stack)", direction: "rtl", color: "var(--gold)", fontSize: ".95rem", marginBottom: 8 }}>
          من مكة المكرمة
        </div>
        <p style={{ fontFamily: "var(--font-sans-stack)", fontSize: ".68rem", color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: 8 }}>
          Calculated for Johannesburg. Face East-North-East (≈ 119° from true North).
        </p>

        {deviceBearing === null ? (
          <button onClick={enableCompass} className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Compass size={12} /> Enable Live Compass
          </button>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: ".75rem", color: "var(--forest)" }}>
              Heading: {Math.round(deviceBearing)}°
            </span>
            <button onClick={() => setDeviceBearing(null)} className="chip" style={{ padding: "3px 8px" }}>
              <RotateCcw size={11} />
            </button>
          </div>
        )}
        {!supported && (
          <p style={{ marginTop: 6, fontFamily: "var(--font-sans-stack)", fontSize: ".65rem", color: "var(--maroon)" }}>
            Live compass not supported on this device. Use the static bearing above.
          </p>
        )}
      </div>
    </div>
  );
}

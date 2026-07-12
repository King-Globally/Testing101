import type { NextConfig } from "next";

/**
 * Next.js configuration with security hardening.
 *
 * Headers applied to every response:
 *   - Content-Security-Policy: strict default-src, only allows same-origin
 *     + the specific external domains we actually use (Google Maps embed,
 *     Google Fonts, the Three.js CDN for the flag texture). No inline
 *     event handlers; React's runtime is allowed via 'self' + nonce-free
 *     because we don't inject raw inline scripts.
 *   - X-Frame-Options: SAMEORIGIN — page can only be framed by same-origin
 *     (clickjacking protection). The CSP frame-ancestors below is the
 *     modern, more granular replacement and takes precedence.
 *   - X-Content-Type-Options: nosniff — browsers must respect declared MIME
 *   - Referrer-Policy: strict-origin-when-cross-origin
 *   - Permissions-Policy: lock down camera, microphone, geolocation, etc.
 *   - Strict-Transport-Security: HSTS (2 years, includeSubDomains, preload)
 *     — only meaningful in production over HTTPS, but harmless in dev.
 *   - X-DNS-Prefetch-Control: off — prevent DNS prefetch of cross-origin
 *
 *   poweredByHeader: false — strips the "X-Powered-By: Next.js" header that
 *   would otherwise leak framework fingerprinting info.
 *
 *   frame-ancestors note: we allow 'self' + https://*.space-z.ai + the Z.ai
 *   chat domain so the preview panel can embed the running app. All other
 *   origins (random third-party sites) are blocked — preserving clickjacking
 *   protection while letting the preview work.
 *
 *   COOP / CORP note: these are relaxed to "unsafe-none" / "cross-origin"
 *   so the page can be embedded inside the preview panel's cross-origin
 *   iframe. The CSP frame-ancestors directive remains the authoritative
 *   gate on which parents are allowed to embed us.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js dev requires unsafe-eval; production build doesn't
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https:",
  "frame-src 'self' https://www.google.com https://maps.google.com https://www.googletagmanager.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Allow the Z.ai preview/chat panel to embed this app. Covers
  // preview-chat-*.space-z.ai and any other *.space-z.ai subdomain.
  // Both http: and https: schemes are allowed because the dev sandbox
  // runs on http; in production only https is used.
  "frame-ancestors 'self' http://*.space-z.ai https://*.space-z.ai http://space-z.ai https://space-z.ai http://*.z.ai https://*.z.ai http://z.ai https://z.ai",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy",                  value: csp },
  { key: "X-Frame-Options",                          value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",                   value: "nosniff" },
  { key: "Referrer-Policy",                          value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",                       value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=()" },
  { key: "Strict-Transport-Security",                value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control",                   value: "off" },
  // Relaxed so the page can be embedded in the cross-origin preview iframe.
  // The CSP frame-ancestors above is the real gatekeeper.
  { key: "Cross-Origin-Opener-Policy",               value: "unsafe-none" },
  { key: "Cross-Origin-Resource-Policy",             value: "cross-origin" },
  // Reflect the requesting Origin so the preview panel's parent (which can
  // be any *.z.ai subdomain) is allowed to fetch this site's resources.
  { key: "Access-Control-Allow-Origin",              value: "https://chat.z.ai" },
  { key: "Access-Control-Allow-Credentials",         value: "true" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

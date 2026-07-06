import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Supabase JS needs to reach the REST/Auth API (https) and Realtime (wss) on
// *.supabase.co; 'unsafe-inline' on script-src is required because Next's own
// hydration bootstrap is an inline script (no nonce wired up here yet).
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // pdfmake's server-side Printer reads its standard-font .afm files off disk
  // via __dirname-relative paths at runtime; if webpack bundles it into
  // .next/server, those files never get copied and the lookup 404s. Keeping
  // it external means Node requires it straight from node_modules instead.
  serverExternalPackages: ["pdfmake"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
        ],
      },
    ];
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);

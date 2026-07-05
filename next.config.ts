import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // pdfmake's server-side Printer reads its standard-font .afm files off disk
  // via __dirname-relative paths at runtime; if webpack bundles it into
  // .next/server, those files never get copied and the lookup 404s. Keeping
  // it external means Node requires it straight from node_modules instead.
  serverExternalPackages: ["pdfmake"],
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);

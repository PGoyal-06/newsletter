import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
// Validates env when Next loads this config (build, dev, and start), so a missing or bad
// secret fails the build and the Vercel deploy instead of shipping a server that 500s.
import "./src/env";

// A new revision per deploy so the precached app shell ("/") refreshes on every release.
const shellRevision = process.env.VERCEL_GIT_COMMIT_SHA ?? crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Serwist only runs in production builds; dev stays cache free.
  disable: process.env.NODE_ENV === "development",
  // App Router pages are not in the build manifest, so precache the shell explicitly.
  // "/" must stay statically rendered (no cookies() or headers() reads) for this to work.
  additionalPrecacheEntries: [{ url: "/", revision: shellRevision }],
});

const nextConfig: NextConfig = {
  // The contract package ships TypeScript source; Next transpiles it.
  transpilePackages: ["@newsletter/contract"],
};

export default withSerwist(nextConfig);

// Development only guards in components (bad props throw in dev, degrade in production).
// NODE_ENV is a build constant the bundler inlines, not runtime config, so it is the one
// process.env read allowed outside src/env.ts (which is server only and can't reach here).
// eslint-disable-next-line no-restricted-properties
export const isDevelopment = process.env.NODE_ENV !== "production";

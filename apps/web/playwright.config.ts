import { defineConfig, devices } from "@playwright/test";

const PORT = 4791;

// End to end tests run against a production build (`next start`), on WebKit with an
// iPhone profile, because the service worker is disabled in development.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [{ name: "iphone-webkit", use: { ...devices["iPhone 15"] } }],
  webServer: {
    command: `pnpm build && pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});

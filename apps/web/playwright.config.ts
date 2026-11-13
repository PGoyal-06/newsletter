import { defineConfig, devices } from "@playwright/test";
import { GALLERY_OFF_PORT, PORT } from "./e2e/ports";

// End to end tests run against a production build (`next start`), on WebKit with an
// iPhone profile, because the service worker is disabled in development.
//
// One build, two servers: Playwright starts web servers in order and waits for each, so
// the second `next start` reuses the build the first one made. The gallery flag is read
// per request, so the same build serves /dev/ui on one port and a 404 on the other.
// Dummy secrets: env.ts requires them at start. Tests intercept /api/today with
// page.route fixtures and never reach Apps Script (spec 0004).
const SECRETS = {
  APP_TOKEN: "e2e-app-token",
  SCRIPT_URL: "https://script.invalid/exec",
  SCRIPT_KEY: "e2e-script-key",
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [{ name: "iphone-webkit", use: { ...devices["iPhone 15"] } }],
  webServer: [
    {
      command: `pnpm build && pnpm exec next start -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      env: { ...SECRETS, ENABLE_UI_GALLERY: "1" },
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: `pnpm exec next start -p ${GALLERY_OFF_PORT}`,
      url: `http://localhost:${GALLERY_OFF_PORT}`,
      env: { ...SECRETS, ENABLE_UI_GALLERY: "0" },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});

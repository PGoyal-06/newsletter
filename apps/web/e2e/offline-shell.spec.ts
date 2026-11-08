// covers: D-4 (the shell opens offline from the Serwist precache; /api/* is never cached)
import { expect, test } from "@playwright/test";

test.describe("offline app shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // The service worker takes control on first visit (clientsClaim).
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 });
  });

  test("opens from the precache with the network off", async ({ page, context }) => {
    await context.setOffline(true);

    await page.reload();

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("never answers /api requests from a cache while offline", async ({ page, context }) => {
    await context.setOffline(true);

    const result = await page.evaluate(async () => {
      try {
        const r = await fetch("/api/today");
        return `status ${r.status}`;
      } catch {
        return "network error";
      }
    });

    expect(result).toBe("network error");
  });
});

test("links the manifest and the apple touch icon for Add to Home Screen", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  const icon = page.locator('link[rel="apple-touch-icon"]');
  await expect(icon).toHaveAttribute("sizes", "180x180");
  const res = await page.request.get((await icon.getAttribute("href"))!);
  expect(res.headers()["content-type"]).toContain("image/png");
});

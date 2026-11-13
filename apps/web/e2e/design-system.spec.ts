// covers: spec 0003 AC-1 to AC-10 (design system tokens, fonts, components, gallery)
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { GALLERY_OFF_PORT } from "./ports";

const GALLERY = "/dev/ui";
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
// 2026-11-12 7:15 AM in America/New_York (EST): the gallery's sample rows are 6:02 AM
// today and 9:40 PM yesterday (Wednesday) in that zone.
const PINNED_NOW = new Date("2026-11-12T12:15:00Z");
const PRIMARY = "rgb(11, 110, 79)";

test.use({ locale: "en-US", timezoneId: "America/New_York" });

async function openGallery(page: Page) {
  await page.clock.setFixedTime(PINNED_NOW);
  await page.goto(GALLERY);
  await expect(page.getByRole("heading", { level: 1, name: "UI gallery" })).toBeVisible();
  // Times appear after mount; wait for them so layout checks see the final page.
  await expect(page.locator("time").first()).not.toBeEmpty();
}

/** Text elements whose content overflows their box, except the clamped subject. */
async function clippedText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const clipped: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      // The subject is clamped by design; sr-only text is visually hidden on purpose.
      if (el.closest('[data-slot="subject"], .sr-only')) continue;
      const style = getComputedStyle(el);
      if (style.display === "inline" || style.display === "none") continue;
      const hasText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== "",
      );
      if (!hasText) continue;
      if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
        clipped.push(`${el.tagName.toLowerCase()}: ${el.textContent!.trim().slice(0, 40)}`);
      }
    }
    return clipped;
  });
}

async function hasPageScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
}

test.describe("design system gallery", () => {
  test("has zero axe violations at WCAG 2.2 AA", async ({ page }) => {
    await openGallery(page);
    // Also with the live banner shown, so its state is scanned too.
    await page.getByRole("button", { name: "Show banner" }).click();

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(results.violations).toEqual([]);
  });

  test("shows every component state", async ({ page }) => {
    await openGallery(page);

    await expect(page.getByRole("link")).toHaveCount(6);
    await expect(page.getByRole("radio")).toHaveCount(6);
    await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(1);
    await expect(page.getByText("Nothing new today.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Show all" })).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Disabled primary" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Disabled secondary" })).toBeDisabled();
  });

  test("uses the DESIGN.md tokens on the page and the shell", async ({ page }) => {
    await openGallery(page);

    const styles = await page.evaluate(() => {
      const html = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      return {
        colorScheme: html.colorScheme,
        background: body.backgroundColor,
        color: body.color,
        defaultPalette: html.getPropertyValue("--color-red-500").trim(),
        primary: html.getPropertyValue("--color-primary").trim(),
      };
    });
    expect(styles).toEqual({
      colorScheme: "light",
      background: "rgb(245, 247, 248)",
      color: "rgb(20, 24, 28)",
      defaultPalette: "",
      primary: "#0b6e4f",
    });

    await page.goto("/");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#F5F7F8");
    const manifest = await (await page.request.get("/manifest.webmanifest")).json();
    expect(manifest.theme_color).toBe("#F5F7F8");
    expect(manifest.background_color).toBe("#F5F7F8");
  });

  test("shows a keyboard focus ring of 2px solid primary, offset 2px, on every control", async ({
    page,
  }) => {
    await openGallery(page);
    const interactive = await page.locator("a, button:not([disabled])").count();
    // Chips are one tab stop (roving tabindex), so expect fewer stops than controls.
    const seen = new Set<string>();

    for (let i = 0; i < interactive; i++) {
      // WebKit's plain Tab skips links and buttons (Safari's default); Option+Tab
      // visits every control, the way a keyboard user with that setting moves.
      await page.keyboard.press("Alt+Tab");
      const focus = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        return {
          key: `${el.tagName}:${el.textContent?.slice(0, 30)}`,
          ring: `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor} ${s.outlineOffset}`,
        };
      });
      if (!focus || seen.has(focus.key)) break;
      seen.add(focus.key);
      expect(focus.ring, focus.key).toBe(`2px solid ${PRIMARY} 2px`);
    }

    expect(seen.size).toBeGreaterThan(10);
  });
});

test.describe("issue row", () => {
  test("formats times in the phone's zone and locale, with a weekday before today", async ({
    page,
  }) => {
    await openGallery(page);
    const today = page.getByRole("link", { name: /^Morning Brew/ }).locator("time");
    const yesterday = page.getByRole("link", { name: /^Stratechery/ }).locator("time");

    await expect(today).toHaveText("6:02 AM");
    await expect(today).toHaveAttribute("datetime", "2026-11-12T11:02:00.000Z");
    await expect(yesterday).toHaveText("Wed 9:40 PM");
    await expect(yesterday).toHaveAttribute("datetime", "2026-11-12T02:40:00.000Z");
  });

  test("reads sender, subject, then time, and is at least 64px tall", async ({ page }) => {
    await openGallery(page);
    const row = page.getByRole("link", { name: /^Morning Brew/ });

    await expect(row).toHaveAccessibleName(
      /^Morning Brew\s*The market shrugged off rate fears, plus three charts worth your coffee\s*6:02 AM$/,
    );
    const box = await row.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(64);
    await expect(row).not.toHaveAttribute("target");
  });

  test("keeps the full clamped subject in the accessible name", async ({ page }) => {
    await openGallery(page);
    const row = page.getByRole("link", { name: /^Platformer/ });

    await expect(row).toHaveAccessibleName(/accessible name for VoiceOver\s*6:02 AM$/);
    await expect(row.locator('[data-slot="subject"]')).toHaveCSS("-webkit-line-clamp", "3");
  });

  test("marks the Gmail destination visibly and in the name, and opens in a new tab", async ({
    page,
  }) => {
    await openGallery(page);
    const row = page.getByRole("link", { name: /^Unknown Sender Weekly/ });

    await expect(row).toContainText("Unsorted · opens in Gmail");
    await expect(row).toHaveAccessibleName(/6:02 AM\s*, opens in Gmail$/);
    await expect(row).toHaveAttribute("target", "_blank");
    await expect(row).toHaveAttribute("rel", "noopener noreferrer");
  });
});

test.describe("dynamic type and reflow", () => {
  test("doubles the root size without page scroll or clipped text", async ({ page }) => {
    await openGallery(page);
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });

    expect(await hasPageScroll(page)).toBe(false);
    expect(await clippedText(page)).toEqual([]);
  });

  test("fits a 320px wide screen without page scroll or clipped text", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await openGallery(page);

    expect(await hasPageScroll(page)).toBe(false);
    expect(await clippedText(page)).toEqual([]);
  });

  test("sizes text in rem, so it scales with the root size", async ({ page }) => {
    await openGallery(page);
    const time = page.getByRole("link", { name: /^Morning Brew/ }).locator("time");
    const ratio = () =>
      time.evaluate(
        (el) =>
          parseFloat(getComputedStyle(el).fontSize) /
          parseFloat(getComputedStyle(document.documentElement).fontSize),
      );

    const before = await ratio();
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });

    expect(before).toBeCloseTo(0.8125, 3);
    expect(await ratio()).toBeCloseTo(0.8125, 3);
  });
});

test.describe("category chips", () => {
  test("are a labelled radio group with one selected chip in the tab order", async ({ page }) => {
    await openGallery(page);
    const group = page.getByRole("radiogroup", { name: "Category" });
    const radios = group.getByRole("radio");

    await expect(radios.and(page.locator('[aria-checked="true"]'))).toHaveCount(1);
    await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
    await expect(group.getByRole("radio", { name: "All" })).toHaveCSS("background-color", PRIMARY);
    for (const box of await radios.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height),
    )) {
      expect(box).toBeGreaterThanOrEqual(44);
    }
  });

  test("move and select with arrows, wrap, and jump with Home and End", async ({ page }) => {
    await openGallery(page);
    const group = page.getByRole("radiogroup", { name: "Category" });
    const checked = group.locator('[aria-checked="true"]');
    await group.getByRole("radio", { name: "All" }).focus();

    await page.keyboard.press("ArrowRight");
    await expect(checked).toHaveText("AI");
    await expect(group.getByRole("radio", { name: "AI" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(checked).toHaveText("Tech");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowLeft");
    await expect(checked).toHaveText("All");
    await page.keyboard.press("ArrowLeft");
    await expect(checked).toHaveText("Culture");
    await page.keyboard.press("ArrowRight");
    await expect(checked).toHaveText("All");
    await page.keyboard.press("End");
    await expect(checked).toHaveText("Culture");
    await page.keyboard.press("Home");
    await expect(checked).toHaveText("All");
    await expect(group.locator('[tabindex="0"]')).toHaveText("All");
  });

  test("wrap onto new lines instead of scrolling sideways", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await openGallery(page);
    const group = page.getByRole("radiogroup", { name: "Category" });

    const tops = await group
      .getByRole("radio")
      .evaluateAll((els) => new Set(els.map((el) => el.getBoundingClientRect().top)).size);
    expect(tops).toBeGreaterThan(1);
    expect(await group.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
});

test.describe("banners, empty states, and buttons", () => {
  test("a banner shown later appears inside the mounted status region", async ({ page }) => {
    await openGallery(page);
    const demo = page.getByTestId("live-banner-demo");
    const region = demo.getByRole("status");
    await expect(region).toBeAttached();
    await expect(region).toBeEmpty();

    await demo.getByRole("button", { name: "Show banner" }).click();

    await expect(region).toContainText("You're offline");
  });

  test("the offline banner has no action; the stale one can", async ({ page }) => {
    await openGallery(page);
    const offline = page.getByRole("status").filter({ hasText: "You're offline" }).first();
    const stale = page
      .getByRole("status")
      .filter({ has: page.getByRole("button") })
      .first();

    await expect(offline.getByRole("button")).toHaveCount(0);
    const retry = stale.getByRole("button", { name: "Retry" });
    const box = await retry.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("the filter empty state offers a secondary Show all button", async ({ page }) => {
    await openGallery(page);
    await page.getByRole("button", { name: "Show all" }).first().click();

    await expect(page.getByTestId("last-action")).toHaveText("Last action: Show all");
  });

  test("buttons are 48px tall, and disabled ones use the attribute and cannot act", async ({
    page,
  }) => {
    await openGallery(page);
    const disabled = page.getByRole("button", { name: "Disabled primary" });

    await expect(disabled).toHaveAttribute("disabled", "");
    await expect(disabled).toHaveCSS("opacity", "0.4");
    await disabled.click({ force: true });
    await expect(page.getByTestId("last-action")).toHaveText("Last action: none yet");
    const box = await page.getByRole("button", { name: "Open today's feed" }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
  });
});

test.describe("fonts", () => {
  test("load from the service worker with the network off", async ({ page, context }) => {
    await page.goto("/");
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 30_000,
    });
    await context.setOffline(true);
    const fontResponses: boolean[] = [];
    page.on("response", (r) => {
      if (r.url().endsWith(".woff2")) fontResponses.push(r.fromServiceWorker());
    });

    await page.reload();

    // Force every face of the three families to load (each family has one face per
    // unicode range), so every font file must come from the precache.
    const statuses = await page.evaluate(async () => {
      const families = [
        "Bricolage Grotesque",
        "Atkinson Hyperlegible Next",
        "Atkinson Hyperlegible Mono",
      ];
      const faces = Array.from(document.fonts).filter((f) => families.includes(f.family));
      await Promise.allSettled(faces.map((f) => f.load()));
      const summary = new Map<string, Set<string>>();
      for (const f of faces) {
        const key = `${f.family} ${f.weight}`;
        summary.set(key, (summary.get(key) ?? new Set()).add(f.status));
      }
      return Object.fromEntries([...summary].map(([k, v]) => [k, [...v].join(",")]));
    });

    expect(statuses).toEqual({
      "Bricolage Grotesque 700": "loaded",
      "Atkinson Hyperlegible Next 400": "loaded",
      "Atkinson Hyperlegible Next 600": "loaded",
      "Atkinson Hyperlegible Mono 400": "loaded",
    });
    expect(fontResponses.length).toBeGreaterThan(0);
    expect(fontResponses.every(Boolean)).toBe(true);
  });
});

test.describe("build output", () => {
  test("keeps the iOS text size keyword in the built CSS", () => {
    const cssDir = path.join(__dirname, "../.next/static/css");
    const css = readdirSync(cssDir)
      .filter((f) => f.endsWith(".css"))
      .map((f) => readFileSync(path.join(cssDir, f), "utf8"))
      .join("\n");

    expect(css).toContain("font:-apple-system-body");
  });

  test("keeps / static and /dev/ui per request", () => {
    const manifest = JSON.parse(
      readFileSync(path.join(__dirname, "../.next/prerender-manifest.json"), "utf8"),
    );

    expect(Object.keys(manifest.routes)).toContain("/");
    expect(Object.keys(manifest.routes)).not.toContain("/dev/ui");
  });

  test("answers 404 at /dev/ui when the flag is off", async ({ request }) => {
    const res = await request.get(`http://localhost:${GALLERY_OFF_PORT}${GALLERY}`);

    expect(res.status()).toBe(404);
  });
});

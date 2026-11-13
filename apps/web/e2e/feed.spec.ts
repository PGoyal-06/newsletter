// covers: spec 0004 AC-9 (setup), AC-10 (feed), AC-11 (401 versus other failures)
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const NOW = new Date("2026-11-12T12:15:00Z").getTime(); // Thursday 7:15 AM in New York
const HOUR = 3_600_000;
const TOKEN = "phone-key";

// The service worker fetches /api/* itself (NetworkOnly), which page.route cannot see, so
// it is blocked here; offline-shell.spec.ts covers the worker.
test.use({ locale: "en-US", timezoneId: "America/New_York", serviceWorkers: "block" });

function issue(id: string, receivedAt: number, sender: string, subject: string) {
  return {
    id,
    threadId: `${id}0`,
    sender,
    senderEmail: "notes@example.com",
    listId: null,
    subject,
    receivedAt,
    category: "Unsorted",
    content: { kind: "none" },
    gmailUrl: `https://mail.google.com/mail/u/0/#all/${id}0`,
  };
}

// Generated 2 hours ago, so its oldest item is 25.5 hours old by the phone clock.
const SNAPSHOT = {
  ok: true,
  contractVersion: 1,
  generatedAt: NOW - 2 * HOUR,
  items: [
    issue("a1", NOW - 3 * HOUR, "Morning Notes", "A quieter morning"),
    issue("a2", NOW - 25.5 * HOUR, "Old News", "Yesterday's issue"),
  ],
};

type Reply = { status: number; body?: unknown };

/** Answer /api/today in order; the last reply repeats. Records each Authorization header. */
async function routeToday(page: Page, ...replies: Reply[]) {
  const seen: Array<string | null> = [];
  await page.route("**/api/today*", async (route: Route) => {
    seen.push(route.request().headers()["authorization"] ?? null);
    const reply = replies.length > 1 ? replies.shift()! : replies[0]!;
    await route.fulfill({
      status: reply.status,
      contentType: "application/json",
      body: reply.body === undefined ? "" : JSON.stringify(reply.body),
    });
  });
  return seen;
}

async function submitKey(page: Page, key: string) {
  await page.getByLabel("Secret key").fill(key);
  await page.getByRole("button", { name: "Open today's feed" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW);
});

test("shows setup with no stored key, and it passes axe", async ({ page }) => {
  await page.goto("/");

  const input = page.getByLabel("Secret key");
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute("autocapitalize", "off");
  await expect(input).toHaveAttribute("autocorrect", "off");
  await expect(input).toHaveAttribute("spellcheck", "false");
  await expect(page.getByRole("button", { name: "Open today's feed" })).toBeEnabled();
  const axe = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(axe.violations).toEqual([]);
});

test("a wrong key shows an error and saves nothing", async ({ page }) => {
  await routeToday(page, { status: 401 });
  await page.goto("/");

  await submitKey(page, "wrong");

  await expect(page.getByText("That key doesn't open the feed.")).toBeVisible();
  await expect(page.getByLabel("Secret key")).toHaveAttribute("aria-invalid", "true");
  await page.reload();
  await expect(page.getByLabel("Secret key")).toHaveValue("");
});

test("a good key opens the feed from the test call, then stays saved", async ({ page }) => {
  const seen = await routeToday(page, { status: 200, body: SNAPSHOT });
  await page.goto("/");

  await submitKey(page, `  ${TOKEN}\n`);

  await expect(page.getByRole("heading", { level: 1, name: "Thursday 12" })).toBeVisible();
  await expect(page.getByText("November · Updated 5:15 AM")).toBeVisible();
  const row = page.getByRole("link", { name: /Morning Notes/ });
  await expect(row).toHaveAttribute("href", SNAPSHOT.items[0]!.gmailUrl);
  await expect(page.getByText("Old News")).toHaveCount(0);
  await expect(page.getByText("That's today.")).toBeVisible();
  expect(seen).toEqual([`Bearer ${TOKEN}`]); // the setup test filled the feed, no second fetch

  await page.reload();
  await expect(page.getByRole("link", { name: /Morning Notes/ })).toBeVisible();
  expect(seen).toEqual([`Bearer ${TOKEN}`, `Bearer ${TOKEN}`]);
  const axe = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(axe.violations).toEqual([]);
});

test("a server error during setup saves the key and shows the retry banner", async ({ page }) => {
  await routeToday(page, { status: 502, body: { ok: false, error: "internal" } });
  await page.goto("/");

  await submitKey(page, TOKEN);

  await expect(page.getByText("Couldn't load today's newsletters.")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(page.getByLabel("Secret key")).toHaveCount(0);
});

test("an empty day shows the empty copy", async ({ page }) => {
  await routeToday(page, { status: 200, body: { ...SNAPSHOT, items: [] } });
  await page.goto("/");

  await submitKey(page, TOKEN);

  await expect(page.getByText("Nothing new today.")).toBeVisible();
  await expect(page.getByText("Everything older is in Gmail under Newsletters.")).toBeVisible();
});

test("a 401 while reading the feed opens setup with the stopped working message", async ({
  page,
}) => {
  await routeToday(page, { status: 200, body: SNAPSHOT }, { status: 401 });
  await page.goto("/");
  await submitKey(page, TOKEN);
  await expect(page.getByRole("link", { name: /Morning Notes/ })).toBeVisible();

  await page.reload();

  await expect(page.getByText("That key stopped working. Paste the current one.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
});

test("Change secret key opens setup with Cancel, and Cancel keeps the key", async ({ page }) => {
  await routeToday(page, { status: 200, body: SNAPSHOT });
  await page.goto("/");
  await submitKey(page, TOKEN);

  await page.getByRole("button", { name: "Change secret key" }).click();
  await expect(page.getByLabel("Secret key")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(page.getByRole("link", { name: /Morning Notes/ })).toBeVisible();
});

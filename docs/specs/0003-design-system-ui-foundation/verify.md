# Verify: design system & UI foundation · spec 0003 · updated 2026-11-12
_Steps derived from spec 0003 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones._

Start the gallery with `ENABLE_UI_GALLERY=1 pnpm --filter web build && ENABLE_UI_GALLERY=1 pnpm --filter web start`, then open `/dev/ui`.

## UI / manual
- [x] Open `/dev/ui` → every section renders: 6 issue rows, 6 chips, 3 banners plus the show/hide demo, 2 empty states, 4 buttons (2 disabled) → AC-10
- [x] Inspect `<html>` computed styles → `color-scheme: light`, body background `#F5F7F8`, text `#14181C`; `--color-red-500` is empty (default palette off) → AC-1
- [x] Open `/` → heading in Bricolage, line in muted Atkinson; `<meta name="theme-color">` is `#F5F7F8`; `/manifest.webmanifest` has `theme_color` and `background_color` `#F5F7F8` → AC-1
- [x] Network panel on `/` → the `.woff2` files come from this origin (`/_next/static/media/`), never `fonts.gstatic.com` → AC-2
- [x] Load `/` once, wait for the service worker, go offline, reload → page renders in Bricolage and Atkinson, not a fallback face → AC-2
- [x] On the iPhone, Settings › Display › Text Size to the largest, then Accessibility › Larger Text on → gallery text grows, nothing clips sideways, rows grow in height → AC-3
- [x] Inject `html { font-size: 200% }` and separately resize to 320px wide → no horizontal page scroll; only the long subject is clamped (3 lines with an ellipsis) → AC-3
- [x] Issue row: tap target at least 64px tall; sender on the left, time at the top right; the unbroken sender wraps and is never truncated → AC-4
- [x] Change the browser timezone (DevTools › Sensors › Location, or Playwright `timezoneId`) to `Asia/Tokyo` → row times change to that zone, and the weekday prefix appears or disappears to match the local midnight → AC-4 (Value sourcing: displayed time, weekday prefix)
- [x] Change the locale to `de-DE` → times use the 24 hour German format, and the weekday prefix and join follow the locale (e.g. "Mi., 21:40") → AC-4 (Value sourcing: join decided by locale)
- [x] View the server HTML (`curl` the gallery) → each `<time>` has its ISO `datetime` attribute but no text (nothing formatted on the server) → AC-4 (Value sourcing: `dateTime`, after mount formatting)
- [x] VoiceOver on the iPhone, swipe to a row → reads sender, subject, time; the Gmail row adds "opens in Gmail" and opens a new tab → AC-4 (Value sourcing: destination)
- [x] Gmail row `href` is the Gmail URL; reader rows navigate in place → AC-4 (Value sourcing: `href` from caller)
- [x] Chips: Tab lands only on the selected chip; Left/Up and Right/Down move and select with wrap; Home and End jump; selected chip is green with white text; chips wrap at 320px → AC-5 (Value sourcing: group label, chip labels, selected chip)
- [x] Press "Show banner" with VoiceOver on → the offline banner is announced → AC-6
- [x] The offline banner has no action; the stale banner's Retry is at least 44 by 44px → AC-6, AC-8 (Value sourcing: banner message and action are props)
- [x] Filter empty state shows "Show all" as a secondary button; day empty shows message plus detail → AC-7 (Value sourcing: empty state copy from DESIGN.md)
- [x] Buttons are at least 48px tall; pressing dims to 0.7; disabled buttons are at 0.4 with the `disabled` attribute and do nothing when tapped → AC-8
- [x] Option+Tab through the gallery → every control shows a 2px solid green ring, offset 2px → AC-9
- [x] Without the flag (`ENABLE_UI_GALLERY` unset or `0`), `/dev/ui` answers 404 → AC-10 (Value sourcing: `/dev/ui` on or off)

## Commands
- [x] `pnpm --filter web test:e2e` → 25 passed, including the axe scan with zero violations at `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` → AC-1 to AC-10
- [x] `pnpm --filter web test` → the import boundary test passes (alias, relative, and sibling deep imports error; index imports pass) → AC-11
- [x] `pnpm --filter web build` → the route list shows `○ /` (static) and `ƒ /dev/ui` (dynamic) → AC-10
- [x] `grep -o 'font:-apple-system-body' apps/web/.next/static/css/*.css` → one match → AC-3
- [x] `grep -c 'woff2' apps/web/public/sw.js` → the font files are in the precache manifest → AC-2
- [x] `ENABLE_UI_GALLERY=yes pnpm --filter web start` → "Failed to prepare server" with `ENABLE_UI_GALLERY must be "1" or "0"`, and no pages are served → AC-10 (Value sourcing: env validation)
- [x] `pnpm lint` with an added `import { IssueRow } from "@/features/design-system/ui/IssueRow"` in any feed file → an error naming the index import → AC-11

## Acceptance-criteria coverage
- AC-1 covered by the tokens, shell, and manifest steps · AC-2 by the font origin, offline, and precache steps · AC-3 by the Dynamic Type, reflow, and CSS keyword steps · AC-4 by the row, timezone, locale, server HTML, VoiceOver, and href steps · AC-5 by the chip step · AC-6 by the banner steps · AC-7 by the empty state step · AC-8 by the button and Retry steps · AC-9 by the focus ring step and the axe scan · AC-10 by the gallery, flag off, and build route steps · AC-11 by the boundary test and lint steps

# 0003. Design system tokens and base components for the web app

**Date**: 2026-11-12
**Status**: In Progress

The why (context, options considered, rationale) is in [rationale.md](rationale.md).

## Summary

This spec turns `DESIGN.md` (the approved look: cool paper, black ink, one transit green, Atkinson type, no cards) into code that every later screen reuses. It puts the colors, type, and spacing into Tailwind as tokens, self hosts the three fonts so the app still opens offline, and builds the four base pieces the scope names (the issue row, the category chips, the banner, the empty state) plus the small button two of them need. A hidden gallery page shows every piece in every state, and automated accessibility checks run against it, so the WCAG 2.2 AA promise is tested rather than hoped for.

## Requirements

**User stories**:
- As the reader, I want the feed's pieces to look and behave the same everywhere so that the app feels like one calm object, not a set of screens.
- As the reader, I want every piece to grow with my iPhone text size and work with VoiceOver so that I can use it half awake, in any light.
- As the builder of later slices, I want ready made, tested components and tokens so that I never restyle or rebuild a row, chip, banner, button, or empty state.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: Every token in `DESIGN.md`'s front matter exists in `apps/web/src/app/globals.css` under the Tailwind v4 name and value given in the token mapping table (Feature design). Tailwind's default color palette is switched off (`--color-*: initial`), so only `DESIGN.md` colors exist. The placeholder tokens and the `prefers-color-scheme: dark` block are gone; `html` declares `color-scheme: light`; `body` uses the ground and text colors. The shell page uses only the new tokens. The manifest `theme_color` and `background_color`, and the viewport `themeColor`, are `#F5F7F8`.
- **AC-2**: Bricolage Grotesque 700, Atkinson Hyperlegible Next 400 and 600, and Atkinson Hyperlegible Mono 400 (Latin subset only) load through `next/font/google` and are served from the app's own origin. After the service worker is active, reloading `/` with the network off shows each face's `FontFace.status` as `"loaded"`, and the font files are answered by the service worker.
- **AC-3**: The root font size comes from iOS (`font: -apple-system-body`; other browsers keep a 16px root). Every font size and every text bearing spacing value is in `rem` or `em`; only borders, radius, and minimum target heights are in `px`. With `html { font-size: 200% }` injected, and separately at a 320px wide viewport, the gallery has no horizontal page scroll (`document.documentElement.scrollWidth <= innerWidth`) and no clipped text (no text element whose `scrollWidth` or `scrollHeight` exceeds its box), except the issue row subject, which is clamped to 3 lines by design (AC-4).
- **AC-4**: The issue row is one link at least 64px tall. Its DOM order is sender, subject, time (so VoiceOver reads them in that order); CSS grid places the time at the top right. The sender wraps (`overflow-wrap: anywhere`) and is never truncated. The subject is clamped to 3 lines with an ellipsis, and the full subject is in the accessible name. The time is formatted from `receivedAt` in the phone's own timezone and locale only after the row mounts in the browser (its space is reserved before that, so nothing shifts), prefixed with the short weekday when the issue arrived before today's local midnight, and wrapped in `<time dateTime>` with the ISO value. The `gmail` destination shows "Unsorted · opens in Gmail" under the subject, adds ", opens in Gmail" to the accessible name, and opens with `target="_blank" rel="noopener noreferrer"`; the `reader` destination opens in place.
- **AC-5**: The category chips are a radio group labelled by the `label` prop, with exactly one chip selected. Arrow keys move and select (Left and Up previous, Right and Down next, wrapping; Home first; End last); only the selected chip is in the tab order; each chip is at least 44px tall; chips wrap onto new lines instead of scrolling sideways; the selected chip uses the primary fill with white text.
- **AC-6**: The banner has a `stale` variant (warning tint) that takes an optional action, and an `offline` variant (outline, muted text) that cannot take one (enforced by its props type). Meaning never depends on color alone. Banners render inside an exported `StatusRegion`, an always mounted `role="status"` element that the caller keeps on screen, so a banner appearing is announced by VoiceOver.
- **AC-7**: The empty state shows a message, optional secondary text, and an optional action rendered as a secondary `Button`.
- **AC-8**: `Button` has `primary` and `secondary` variants, is at least 48px tall, and shows pressed (opacity 0.7) and disabled (opacity 0.4 plus the native `disabled` attribute, never opacity alone) states. The banner action uses a text style button at least 44 by 44px.
- **AC-9**: An axe scan of the gallery with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` reports zero violations. Every interactive element, when focused by keyboard, has a computed `outline` of 2px solid in the primary color with a 2px offset.
- **AC-10**: `/dev/ui` is rendered per request (`dynamic = "force-dynamic"`). When the running server has `ENABLE_UI_GALLERY=1`, it shows every component in every variant and state (long sender, unbroken long sender, long subject, `gmail` row, yesterday's row, each banner variant with and without action, both empty states, both buttons including disabled, chips with 6 categories). When the flag is unset or `0`, it returns 404. `/` still builds as a static route.
- **AC-11**: Code outside `src/features/design-system/ui/` imports these components only through `src/features/design-system/ui/index.ts`; ESLint reports an error for any deep import into that folder, through the `@/` alias or a relative path.

## Decision

**Chosen option**: Option 1: Tailwind tokens plus own cva components in a design-system feature, checked through a flagged gallery

Build `DESIGN.md` into Tailwind v4 theme tokens and self hosted fonts, write `IssueRow`, `CategoryChips`, `Banner`, `StatusRegion`, `EmptyState`, and `Button` as cva variant components exported from `src/features/design-system/ui/index.ts`, and prove them with Playwright plus axe against a runtime flagged `/dev/ui` gallery.

**Implementation skills**: `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `tailwind-design-system` (`wshobson/agents`, `.agents/skills/tailwind-design-system/`) · `cva-best-practices` (`joe-bell/cva`, `.agents/skills/cva-best-practices/`) · `web-styling-cva` (`agents-inc/skills`, `.agents/skills/web-styling-cva/`) · `axe-core` (`claude-dev-suite/claude-dev-suite`, `.agents/skills/axe-core/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.agents/skills/playwright-best-practices/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`)

## Feature design

**Data model sketch**:
None. This feature stores nothing. Component inputs are plain props; the issue row's fields come from the contract's `NewsletterIssue` (spec 0002) and are passed in by the caller.

**State transitions**:
None persistent. `CategoryChips` is controlled (the caller owns the selected value). `IssueRow` has one internal render state: before mount (time slot reserved, empty) and after mount (time formatted).

**Token mapping** (`DESIGN.md` front matter → `globals.css`; the CSS follows `DESIGN.md`, never the reverse):
| `DESIGN.md` | Tailwind v4 variable | Value and unit | Utility example |
|---|---|---|---|
| `colors.<name>` (all 11) | `--color-<name>` (e.g. `--color-ground`, `--color-text-muted`, `--color-on-primary`, `--color-warning-bg`) | hex as given | `bg-ground`, `text-text-muted`, `border-control` |
| `typography.display` | `--text-display` with `--text-display--line-height`, `--text-display--letter-spacing`, `--text-display--font-weight`; `--font-display` | 2.6rem, 0.95, -0.025em, 700 | `text-display font-display` |
| `typography.body` | `--text-body` (+ line height 1.35, weight 400); `--font-text` | 1.0625rem | `text-body font-text` |
| `typography.label` | `--text-label` (+ line height 1.3, weight 600); `--font-text` | 0.875rem | `text-label` |
| `typography.meta` | `--text-meta` (+ line height 1.4, weight 400); `--font-text` | 0.8125rem | `text-meta` |
| `typography.mono` | `--text-mono` (+ weight 400); `--font-mono`; `tnum` via the `tabular-nums` utility | 0.8125rem | `text-mono font-mono tabular-nums` |
| `rounded.sm` | `--radius-sm` | 6px | `rounded-sm` |
| `spacing.xs` to `2xl`, `gutter` | `--spacing-xs` … `--spacing-2xl`, `--spacing-gutter` | `DESIGN.md` px divided by 16, in rem (4px → 0.25rem, 20px → 1.25rem) | `px-gutter`, `gap-sm` |
| component `minHeight` (44, 48, 52, 64) | arbitrary values in the component, not tokens | px (target sizes stay fixed) | `min-h-[64px]` |

The font family variables come from `next/font` CSS variables on `<html>` and are mapped with `@theme inline` so they resolve at runtime. `html { font: -apple-system-body; }` is written outside any Tailwind layer, after the import of Tailwind, immediately followed by `font-family: var(--font-text)` (the shorthand resets the family and line height, so order matters). The build check greps the built CSS to confirm the `-apple-system-body` keyword survived minification.

**API surface** (component props, exported from `src/features/design-system/ui/index.ts`; named exports only):
| Component | Kind | Key inputs | Key outputs | Client? | Key errors |
|---|---|---|---|---|---|
| `IssueRow` | link | `sender: string` (req), `subject: string` (req), `receivedAt: number` epoch ms (req), `href: string` (req), `destination: "reader" \| "gmail"` (req) | one `<a>` containing sender, subject, `<time dateTime>` | `"use client"` (formats after mount) | non finite `receivedAt` throws in development, renders no time in production |
| `CategoryChips` | radiogroup | `label: string` (req, becomes the group's `aria-label`), `options: { value: string; label: string }[]` (req, at least 1), `value: string` (req), `onChange(value: string)` (req) | `role="radiogroup"` with `role="radio"` buttons, roving `tabIndex` | `"use client"` (keyboard) | `value` not in `options` throws in development; in production the first option renders as selected |
| `StatusRegion` | live region | `children` (zero or one `Banner`) | always mounted `<div role="status">` | server safe | none |
| `Banner` | message | `variant: "stale"` with optional `action?: { label: string; onClick(): void }`, or `variant: "offline"` with no `action` (a discriminated union type); `children` message (req) | tinted or outlined block | `"use client"` only when it has an action | none |
| `EmptyState` | static | `message: string` (req), `detail?: string`, `action?: { label: string; onClick(): void }` | message block, optional secondary `Button` | `"use client"` only when it has an action | none |
| `Button` | button | `variant: "primary" \| "secondary"` (req), `children` (req), plus native button props (`onClick`, `disabled`, `type`, default `type="button"`) | `<button>` | server safe (handlers come from client callers) | none |
| `/dev/ui` | page | `ENABLE_UI_GALLERY` read at request time | gallery of every state, or 404 | server page (`force-dynamic`) rendering one `"use client"` gallery component | 404 when the flag is unset or `0` |
| `env` (`src/env.ts`) | module | `process.env.ENABLE_UI_GALLERY` | `env.enableUiGallery: boolean` | server only | throws at startup if set to anything other than `1` or `0` |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| IssueRow | sender, subject | props, from the contract's `NewsletterIssue.sender` and `.subject` (spec 0002) |
| IssueRow | displayed time (e.g. "6:02 AM") | derived after mount from `receivedAt` with `Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })`; timezone and locale are the phone's own |
| IssueRow | weekday prefix and join (e.g. "Wed 9:40 PM") | derived after mount: shown when `receivedAt` is before the phone's local midnight today ("today" from `Date.now()` at mount); one `Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })` call, so the locale decides the join |
| IssueRow | `dateTime` attribute | derived: `new Date(receivedAt).toISOString()`, rendered on every pass (time zone free, so safe before mount) |
| IssueRow | destination text, accessible name, link target | derived from `destination`: `"gmail"` shows "Unsorted · opens in Gmail", appends ", opens in Gmail" to the name, sets `target="_blank" rel="noopener noreferrer"`; `"reader"` adds nothing |
| IssueRow | `href` | prop: the reader route for `"reader"`, the contract's `gmailUrl` for `"gmail"` (the caller decides) |
| CategoryChips | group label, chip labels, selected chip | props `label`, `options`, `value` (feature 9 owns remembering and the fallback to All) |
| Banner | message, action label and handler | props (feature 7 supplies "Couldn't refresh since 6:00am" and Retry) |
| EmptyState | message, detail, action | props (copy for each state comes from `DESIGN.md` Components) |
| All | colors, sizes, radius, spacing, fonts | the token mapping table above, from `DESIGN.md` front matter |
| `/dev/ui` | on or off | `env.enableUiGallery`, read per request from `ENABLE_UI_GALLERY` |
| Gallery sample rows | sender, subject, `receivedAt` | hard coded in the gallery: today 6:02 AM and yesterday 9:40 PM in `America/New_York`, as fixed epoch values; the e2e test pins `locale: "en-US"`, `timezoneId: "America/New_York"`, and `page.clock` to today 7:15 AM in that zone |

**Key invariants**:
- Token names and values in `globals.css` match the mapping table and `DESIGN.md` exactly; `DESIGN.md` is the source.
- No component uses a raw hex color, a `px` font size, a shadow, a Tailwind default palette color, or a color for category meaning.
- Every interactive target is at least 44 by 44 CSS px; buttons 48px tall; issue rows at least 64px tall.
- Exactly one chip is selected at all times; only the selected chip is tabbable.
- The issue row never changes its look after being opened (no read state).
- Times are formatted only in the browser after mount; nothing formats a time at build or on the server.
- The `offline` banner can never carry an action (type level).
- `StatusRegion` stays mounted while the feed is on screen; banners appear inside it.
- Only `index.ts` is imported from outside `src/features/design-system/ui/`.

**Security model**:
No data, no auth, no regulated data. The only exposure question is the gallery: it renders hard coded sample content, and when the flag is unset it returns 404, so nothing extra is reachable on the deployed app. `ENABLE_UI_GALLERY` must never be set on Vercel. Gmail links use `rel="noopener noreferrer"`.

**Configuration required**:
- `ENABLE_UI_GALLERY`: `1` turns on `/dev/ui` at runtime; unset or `0` in every deployed environment. Read only through `apps/web/src/env.ts` (created by this feature; feature 5 extends it with the secrets from spec 0001). Listed in `apps/web/.env.example`.
- Playwright: `webServer` becomes a list. The first entry runs `pnpm build` and `next start` on the existing port with `env: { ENABLE_UI_GALLERY: "1" }`; the second runs only `next start` on a second port with `env: { ENABLE_UI_GALLERY: "0" }`, after the first has built. Both use `webServer.env`, not a shell prefix.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: the gallery renders every component state and axe (the five tags) finds zero violations, verifies **AC-9**, **AC-10**, **AC-1**
- Focus: tabbing through the gallery, each focused element's computed outline is 2px solid primary with 2px offset, verifies **AC-9**
- Keyboard: Tab reaches the selected chip only, arrows move and select with wrap, Home and End jump, verifies **AC-5**
- Dynamic Type and reflow: with `html { font-size: 200% }` injected, and at 320px wide, no page scroll and no clipped text outside the subject clamp, verifies **AC-3**
- Time: with locale, timezone, and clock pinned, today's row shows "6:02 AM", yesterday's shows "Wed 9:40 PM" (weekday per the pinned date), both with matching `dateTime`, verifies **AC-4**
- Row semantics: the row's accessible name reads sender, subject, time; the gmail row adds ", opens in Gmail" and has `target="_blank"`, verifies **AC-4**
- Status: a banner inserted into the mounted `StatusRegion` is inside `role="status"`; the offline banner shows no action, verifies **AC-6**
- Buttons: disabled button has the `disabled` attribute and cannot be activated, verifies **AC-8**, **AC-7**
- Offline fonts: after the service worker is active, `/` reloaded offline reports each `FontFace.status` as `"loaded"` and the font responses come from the service worker, verifies **AC-2**
- Flag off: the second server answers 404 at `/dev/ui`; the build output marks `/` as static, verifies **AC-10**
- Import boundary: a Vitest test runs ESLint's API (`ESLint.lintText`) on a deep import via `@/` and via a relative path and expects an error, and on the `index.ts` import and expects none, verifies **AC-11**

## Build plan

Tracer Bullet for a foundation: first one thin thread from `DESIGN.md` to a real rendered, tested component (tokens, fonts, one row, gallery, axe), then thicken one component at a time, each landing with its gallery states and tests.

1. Turn `DESIGN.md` front matter into Tailwind v4 tokens per the mapping table in `globals.css`, add `--color-*: initial`, remove the placeholder tokens and dark block, add the unlayered `html { font: -apple-system-body; font-family: … }` rule and `color-scheme: light`, set body colors, update the shell page to the new tokens, and set manifest and viewport colors to `#F5F7F8`, satisfies **AC-1**, **AC-3**
2. Load the three fonts with `next/font/google` (only the listed weights, Latin subset, `display: "swap"`), expose them as CSS variables on `<html>`, and map them with `@theme inline`, satisfies **AC-2**
3. Create `apps/web/src/env.ts` with `enableUiGallery` and `.env.example`; turn the Playwright `webServer` into the two server list with `webServer.env`, satisfies **AC-10**
4. Add `class-variance-authority` and `@axe-core/playwright` (exact versions), and the ESLint `no-restricted-imports` rule (applied to files outside `src/features/design-system/ui/`, blocking both `@/features/design-system/ui/*` and relative paths into it), with its Vitest test using ESLint's API, satisfies **AC-11**
5. Build `IssueRow` (DOM order and grid, both destinations, after mount time and weekday formatting with reserved space, 3 line clamp, wrapping sender, accessible name) and create `index.ts`, satisfies **AC-4**
6. Build the `/dev/ui` page (`force-dynamic`, 404 unless flagged) with a client gallery showing the row's states and fixed sample epochs, plus the e2e spec: axe scan, focus ring check, pinned locale, timezone, and clock time check, row semantics, doubled root size and 320px checks, offline font check, and flag off 404; this completes the thin thread, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-9**, **AC-10**
7. Build `CategoryChips` as a radio group with roving tabindex and arrow, Home, and End keys; add its gallery states and keyboard e2e, satisfies **AC-5**, **AC-9**
8. Build `Button` (primary, secondary, pressed, disabled), then `StatusRegion`, `Banner` (stale with optional action, offline without), and `EmptyState`; add their gallery states and e2e checks, satisfies **AC-6**, **AC-7**, **AC-8**, **AC-9**
9. Confirm `pnpm --filter web build` lists `/` as static, the built CSS still contains `-apple-system-body`, and the existing offline shell e2e still passes, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-10**

## Consequences

**Positive**:
- Every later slice gets tokens and five tested components, so the core loop (feature 5) composes the feed instead of styling it.
- The AA promise is checked automatically on every e2e run, in the engine the reader actually uses.
- The fonts work offline from day one, with no layout shift while they load.
- Times can never cause a hydration mismatch, because nothing formats them before mount.

**Negative / tradeoffs**:
- Two new dependencies (`class-variance-authority` at runtime, `@axe-core/playwright` for tests) and one new env flag to keep unset in production.
- The e2e run starts two servers from one build; slightly slower and one more config shape to understand.
- The radio group's keyboard behavior and the live region are hand written; a regression there is only caught by the e2e tests and a manual VoiceOver pass.
- Other features importing from `features/design-system` is a sanctioned exception to the feature folder rule; it needs the ESLint guard to stay an exception.
- Time formatting lives in UI code, so it is tested in Playwright (slower) rather than in a Vitest unit test, and the time appears one frame after the row.
- axe catches only part of real accessibility issues; VoiceOver on the actual iPhone is still a manual check per slice.
- Builds need network access to fetch the fonts from Google.

**Neutral**:
- `DESIGN.md` is now the source of truth for tokens; changing a color means editing it and `globals.css` together.
- Masthead, ending, and loading rows are deliberately left to feature 5, which builds them from these tokens.

## Follow-up

- [ ] Feature 5 builds the masthead, the "That's today." ending, and the loading rows from these tokens; it should cap the masthead's growth at large text sizes so "Thursday 12" stays on one line (the display token is 2.6rem of a root that can reach roughly 3 times its default). It also mounts `StatusRegion` on the feed.
- [ ] Update `DESIGN.md` when this feature is built: the chips are a radio group (not `aria-pressed` toggles), the issue row subject clamps to 3 lines (the one exception to "never clip"), the offline banner has no action, and `Button` is the shared action control.
- [ ] `cva-best-practices`, `web-styling-cva`, and `axe-core` skills, the `DESIGN.md` pointer, and the `src/features/design-system/ui/` import exception are not yet recorded in `apps/web/AGENTS.md`; that area doc should carry them before implementation begins.
- [ ] Manual check on the iPhone each slice: VoiceOver reads each row as sender, subject, time, destination; a banner appearing is announced; the largest accessibility text size still works.

# Review, feat/design-system-ui-foundation, 2026-11-12

**Reviewed by**: Claude Sonnet 5.5 (author on a different model)
**Scope**: 31 files, branch vs main
**Verdict**: Approve with nits

## Summary

This change turns DESIGN.md into Tailwind v4 tokens, self hosts three fonts, and adds six small components (IssueRow, CategoryChips, Banner, StatusRegion, EmptyState, Button) behind one index file, plus a flag gated `/dev/ui` gallery, an ESLint import boundary, a validated `env.ts`, and a thorough WebKit and axe e2e suite. I checked every acceptance criterion from AC-1 to AC-11 against the code and found each one implemented. Token names and values match DESIGN.md and the spec mapping table exactly. There are no blockers or majors. The findings are small edge cases and hardening ideas.

## Minor

### 🟡 "Today" is fixed when the row mounts, `apps/web/src/features/design-system/ui/IssueRow.tsx:40`
**Problem**: `useReceivedTime` calls `Date.now()` inside the snapshot, but nothing ever asks React to re-read it. A row rendered at 11pm keeps showing "6:02 AM" after midnight, when it should read "Thu 6:02 AM". An installed PWA is often resumed from the background without a reload.
**Why it matters**: Wrong day labels in a morning feed that is meant to be opened daily. The weekday rule is in AC-4.
**Suggested fix**: Decide the policy. Either let the feed (feature 5) remount or refresh rows on `visibilitychange`, or subscribe to that event inside the hook so the snapshot is re-read. At minimum record the limitation in the spec follow-ups.

### 🟡 Gmail row visible text is not fully in the accessible name, `apps/web/src/features/design-system/ui/IssueRow.tsx:77`
**Problem**: The visible line "Unsorted · opens in Gmail" is `aria-hidden`, and the accessible name only adds ", opens in Gmail". The word "Unsorted" is visible but not in the name.
**Why it matters**: WCAG 2.5.3 (Label in Name, level A, part of WCAG 2.1 AA) expects visible label text to be contained in the accessible name, for voice control users. The spec's wording asks for exactly this behavior, so the spec may need the tweak too.
**Suggested fix**: Drop the `aria-hidden` split and let the whole visible string be read ("Unsorted, opens in Gmail"), then update the AC-4 wording and the matching e2e regex.

### 🟡 CategoryChips has unguarded input edges, `apps/web/src/features/design-system/ui/CategoryChips.tsx:39`
**Problem**: With an empty `options` array in production, `selectedIndex` falls back to 0, no chip renders, and the group has no tab stop (development throws only when `value` is missing, which an empty list also triggers, but production silently renders nothing). Duplicate option values give duplicate React keys and two chips that can both read as selected only by index. `select()` also moves focus before the parent confirms the change, so a parent that ignores `onChange` leaves focus and selection apart.
**Why it matters**: Feature 9 will feed this from real category data, where an empty or duplicated list is plausible.
**Suggested fix**: Throw in development for an empty list and for duplicate values, render nothing in production for an empty list, and key by value only after the duplicate check.

### 🟡 Gallery flag has no production guard, `apps/web/src/env.ts:12`
**Problem**: The only protection against shipping the gallery is a written rule ("never set on Vercel"). A copied env file or a dashboard slip would expose it.
**Why it matters**: Impact is low (hard coded sample content only), but the guard is cheap and the spec calls the flag the only exposure.
**Suggested fix**: In `env.ts`, refuse a value of 1 when the deployment is production (for example `VERCEL_ENV === "production"`), with the same clear error as for bad values, and add a unit case.

### 🟡 Dev throws and production fallbacks are untested, `apps/web/src/features/design-system/ui/CategoryChips.tsx:41`, `IssueRow.tsx:54`
**Problem**: Spec 0003 defines branching behavior for a bad `value` (throw in development, first option in production) and a non finite `receivedAt` (throw in development, no time in production). `props-contract.test.ts` covers types only and the e2e suite never hits these branches.
**Why it matters**: These are the only error handling paths in the components and they are exactly the behavior that differs between environments.
**Suggested fix**: Add Playwright or Vitest coverage for the production fallbacks, or record explicitly that they are accepted as untested. `isDevelopment` is a build constant, so a Vitest test would need `vi.stubEnv` plus a module reset, as `env.test.ts` already does.

## Nits

- ⚪ `apps/web/src/features/design-system/ui/Button.tsx:4`, `buttonClasses` is exported but nothing imports it and it is not in `index.ts`; make it module private until a second caller exists.
- ⚪ `apps/web/src/app/globals.css:70`, the unlayered `body` color and background rules beat any Tailwind utility put on `body` later (unlayered CSS wins over layers); worth a one line comment or moving them into `@layer base`, while keeping the `html` font rule unlayered as the spec requires.
- ⚪ `eslint.config.mjs:16`, `no-restricted-imports` does not catch dynamic `import()` or `vi.mock` paths into `design-system/ui`; fine today, note it if lazy loading is ever added.
- ⚪ `apps/web/src/features/design-system/ui/isDevelopment.ts:4`, a documented, disabled lint exception to the "only `env.ts` reads `process.env`" rule; reasonable (build constant), but mention it in `apps/web/AGENTS.md` so the exception is visible.
- ⚪ `docs/specs/0003-design-system-ui-foundation/index.md:157`, the Follow-up checkboxes for the DESIGN.md update (done in this diff) and the `apps/web/AGENTS.md` entries (not done) are still unchecked; `/sync` should tick one and carry out the other.

## Strengths

- Token values, units, and names match DESIGN.md and the mapping table line for line, with the default palette switched off so stray Tailwind colors cannot appear.
- Hydration safety is done properly: `useSyncExternalStore` with a null server snapshot means no formatting on the server, space is reserved, and an e2e test checks the raw server HTML for the ISO `dateTime` and empty text.
- Type level guards are real and tested: the offline banner cannot take an action, and `Button` rejects `variant={null}` with a regression test.
- The ESLint boundary is tested through ESLint's own API, including the sibling folder case and the interaction with the domain rules block (a later block replaces an earlier one's options, and the config handles it).
- Good e2e depth for WebKit: axe with the five tags, focus ring computed styles, 200% root and 320px reflow, locale and timezone variants (Tokyo, German), offline fonts via the service worker, static `/` check, and the flag off 404 on a second server.
- `env.ts` validates strictly and fails at boot through `instrumentation.ts`, with unit tests for each path.

## Test coverage

Configured (Vitest plus Playwright WebKit). Covered: env parsing and boot failure, prop type contracts, the import boundary, and every AC through e2e (axe, focus, keyboard, reflow, time formatting, fonts offline, flag on and off, build output). Gaps: the development throw and production fallback branches in `CategoryChips` and `IssueRow`, empty or duplicate chip options, and the after midnight "today" behavior. Per the spec, component behavior is tested in WebKit rather than jsdom; no request for jsdom tests is made.

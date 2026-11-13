# 0003. Design system tokens and base components: rationale

Decision record for [index.md](index.md). `/develop` reads `index.md`; this file holds the why.

## Context

Scope feature 4 asks for a calm visual language plus base components that meet WCAG 2.2 AA, follow iOS Dynamic Type (the iPhone text size setting), carry VoiceOver labels, and have big tap targets. The look itself was settled in a separate design consultation and recorded in `DESIGN.md` at the repo root: tokens in its front matter, rules and component states in its prose. What is not settled is how that document becomes code that the next eight slices build on without each one restyling things its own way.

The web app today has only placeholder tokens in `apps/web/src/app/globals.css` (white, gray, an automatic dark palette), the system font, and a static shell page that uses one of those placeholder tokens (`text-muted`). It is a Next.js 16 App Router PWA built with webpack for Serwist; `/` must stay statically rendered so the service worker can precache it, and the whole product promise is that the app opens instantly with no signal. Anything this feature adds to the shell (fonts in particular) must work offline on the very first commute after install.

Tests today are Vitest in Node (no DOM) for pure logic, and Playwright on WebKit with an iPhone 15 profile against one production build. There is no visual catalog, and no automated accessibility check. Accessibility in this product is not decoration: the reader opens it half awake on a moving train, possibly at a large text size.

The build approach is Tracer Bullet: prove one thin real thread end to end, then thicken. This feature sits in the Foundation phase before the first thread (scope feature 5, the core loop), so it must give that thread exactly the parts it needs and no speculative extras. Not deciding this now means feature 5 invents its own tokens and components inline, and every later slice inherits that drift.

## Options considered

### Option 1: Tailwind tokens plus own cva components in a design-system feature, checked through a flagged gallery

`DESIGN.md` tokens become Tailwind v4 theme variables; fonts come from `next/font/google`; the components are written in plain React with `class-variance-authority` (cva: a small helper that maps variant props to class lists) and live in `src/features/design-system/ui/`. A `/dev/ui` gallery, enabled by a runtime env flag, renders every state, and Playwright with axe tests it in real WebKit.

**Pros**:
- No component framework to fight; every class traces back to a `DESIGN.md` token.
- Tests run in the same engine and screen size the reader uses, so contrast, wrapping, and focus are checked for real.
- The gallery is a living, testable picture of the system at zero extra tooling.

**Cons**:
- Accessibility behavior (the radio group's roving focus, the live region) is hand written and must be tested carefully.
- The gallery, its flag, and a second test server are a small amount of machinery that exists only for development and tests.

### Option 2: shadcn/ui components restyled to the design

Copy shadcn's Radix based components (toggle group, alert, button, and so on) into the repo and restyle them to `DESIGN.md`.

**Pros**:
- Radix brings proven keyboard and ARIA behavior for free.
- A large community and many examples.

**Cons**:
- Its defaults are card and shadow heavy, the exact look `DESIGN.md` forbids, so most of the copied styling is removed again.
- Adds Radix packages and a generator workflow for five small components.

### Option 3: Storybook as the catalog, Vitest with jsdom for component tests

Build the same components, but show them in Storybook and test them with Vitest, jsdom, and Testing Library.

**Pros**:
- The industry standard catalog, with controls for every prop.
- Fast unit tests in watch mode.

**Cons**:
- A heavy dependency tree with its own build config, and known friction with this repo's webpack plus Serwist setup.
- jsdom has no layout, fonts, or real contrast, so the checks that matter most here (wrapping at large text, AA contrast) cannot run there.

## Rationale

The forces that decide this are the offline promise, the anti card look, and the fact that accessibility must be proven in a real browser. Fonts must be self hosted so the first offline open never waits on Google. Both `next/font/google` and `next/font/local` self host; `google` was chosen because it needs no font files committed to the repo and still lands the files in `_next/static` with a size matched fallback (no layout shift while loading). Its one cost is that builds fetch the fonts from Google, which Vercel and CI always can. All three families are in the pinned Next version's font list. Writing the components ourselves keeps every class traceable to a `DESIGN.md` token; shadcn would hand us exactly the card and shadow defaults the design rejects, and Radix's keyboard help is not worth a dependency tree for one radio group.

Testing through Playwright on the iPhone WebKit profile is what makes the AA claim real: axe needs real layout and fonts for contrast, and Dynamic Type and reflow can only be checked where text actually wraps. jsdom cannot do any of that. The gallery reads its flag at runtime (rendered per request), so one production build serves both a flag on and a flag off server in the same test run, instead of two builds overwriting each other's output. Storybook would duplicate the build pipeline and fight webpack plus Serwist.

The engineer chose four points that differ from my first lean, and they hold with these conditions. Components live in `src/features/design-system/ui/` (I leaned to a shared `src/ui/`): that is fine as long as this folder is treated as the one feature others may import from, through one entry file, with ESLint blocking deep imports (AC-11), so the feature folder rule bends in one documented place instead of eroding everywhere. The row formats its own time (I leaned to a pure domain formatter): this works because the row formats only after mount, which makes "times are never rendered at build time" a guarantee rather than an assumption, and the formatting is tested in Playwright with the locale, timezone, and clock pinned. Only the scope components are built now, plus `Button` because the banner and empty state cannot exist without one; masthead, ending, and loading rows belong to feature 5. cva is slightly more than five components need, but it sets one variant pattern for every component that follows. The subject clamp (engineer's pick) is kept and recorded as the one sanctioned exception to "never clip", with `DESIGN.md` updated to match.

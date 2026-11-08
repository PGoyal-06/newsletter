# Scope: Morning Newsletter Feed

A personal iPhone home screen app that pulls newsletters out of a Gmail inbox you avoid and shows only today's issues, ready to read on the morning commute. One user (you), $0 a month. Design: `docs/designs/morning-newsletter-feed.md`.

**Build approach:** Tracer Bullet (prove one real thread from Gmail to the phone first, then thicken one strand per slice).
**Workflow:** Beta (after `/develop`: `/check verify`, then `/test`). Features that can move your mail or render untrusted HTML carry `· GA`. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & architecture | Foundation | done |
| 2 | Coding standards & tooling | Foundation | planned |
| 3 | Data contract | Foundation | planned |
| 4 | Design system & UI foundation | Foundation | planned |
| 5 | Core loop: today's feed | Slice 1 | planned |
| 6 | In app reader | Slice 2 | planned |
| 7 | Offline & freshness | Slice 3 | planned |
| 8 | Auto archive | Slice 4 | planned |
| 9 | Category filter | Slice 5 | planned |
| 10 | Open log & stats | Slice 6 | planned |
| 11 | Set category in app | Slice 7 | planned |
| 12 | Morning push nudge | Slice 8 | planned |

## Foundations

### 1. Stack & architecture · done
Record the stack the design doc chose (a Gmail script backend plus a home screen web app) and the tools inside it, then scaffold both halves so they run.
**Done when:** the stack is recorded in a spec, the script project and the web app both deploy, and the empty web app installs to the iPhone home screen.
- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop stack & architecture`
- [x] Verify it: `/check verify stack & architecture`
- [x] Test it: `/test stack & architecture`
Spec [0001](../specs/0001-stack-architecture/index.md) · code in `apps/script`, `apps/web`, `packages/contract`

### 2. Coding standards & tooling
Capture conventions from the real scaffold, then install lint, format, and pre commit checks for both the script and the web app.
**Done when:** root `AGENTS.md` reflects the real stack, and lint and format run clean on both halves.
- [ ] Capture conventions + tooling choices: `/audit`

### 3. Data contract · needs a decision
The shape everything shares: the `today.json` snapshot and its error envelope, the category map (keyed by List-Id, then sender), and the stored script settings (last processed time, secret key, archiving switch).
**Done when:** the snapshot, error, and category map shapes are fixed in a spec, including what Unsorted items carry, so later slices never need a breaking change.
- [ ] Design it (spec): `/architect data contract`

### 4. Design system & UI foundation · needs a decision
A calm visual language for a reader with no counts and no backlog, plus base components (card, chip, banner, empty state) that meet WCAG 2.2 AA.
**Done when:** `design.md` covers type, color, spacing, and components; components pass AA contrast, support iOS Dynamic Type, have VoiceOver labels, and have big tap targets.
- [ ] Design it (spec): `/architect design system & UI foundation`

## Slice 1: Core loop

### 5. Core loop: today's feed · needs a decision
The thinnest real thread and the walking skeleton: the script finds new newsletters (bounded search, List-Unsubscribe header), labels them, builds today's snapshot, and serves it behind the secret key; the app's setup screen saves the key and the feed shows today's cards. No archiving, reader, or offline yet.
**Done when:** a newsletter that arrives in Gmail shows up as a card (sender, subject, time) on the phone within 15 minutes; a wrong key sends you to setup, and a server error does not.
- [ ] Design it (spec): `/architect core loop`

## Slice 2: Reading

### 6. In app reader · needs a decision · GA
Tap a card to read the full issue inside the app, cleaned for a phone: sanitized, scripts blocked, tracking pixels dropped, sandboxed, with links opening outside.
**Done when:** a mapped issue opens readable at phone width with no horizontal scroll, no script runs, and links open in Safari's sheet; plain text issues render too.
- [ ] Design it (spec): `/architect in app reader`

## Slice 3: Offline & freshness

### 7. Offline & freshness · needs a decision
Open instantly from the last cached snapshot, refresh in the background, and keep the feed today only even after skipped days.
**Done when:** the app opens to content in under a second with no signal; items older than 24 hours never show; a stale banner appears when the snapshot is over 3 hours old; pull to refresh works and cannot collide with the timed run.
- [ ] Design it (spec): `/architect offline & freshness`

## Slice 4: Inbox cleanup

### 8. Auto archive · needs a decision · GA
Archive newsletters from mapped senders so they skip the inbox; unmapped senders stay in the inbox. Never deletes. Includes an on/off switch so archiving can be paused without a code change.
**Done when:** mapped newsletters leave the inbox within 15 minutes; unmapped and transactional mail is never archived; with the switch off, nothing is archived; no message is ever deleted.
- [ ] Design it (spec): `/architect auto archive`

## Slice 5: Filtering

### 9. Category filter
Category chips on the feed that remember your last pick, with Unsorted cards shown as metadata that open in Gmail.
**Done when:** picking a chip filters the feed and survives a relaunch; a remembered category with nothing today falls back to All; Unsorted cards open the thread in Gmail.
- [ ] Build it: `/develop category filter`

## Slice 6: Measuring the habit

### 10. Open log & stats
Record each app open on the phone only and show the last 14 days on a hidden stats screen, so you can check the 8 of 10 mornings goal.
**Done when:** each open is logged locally, and the hidden screen shows which of the last 14 mornings you opened the app.
- [ ] Build it: `/develop open log & stats`

## Slice 7: Mapping from the phone

### 11. Set category in app · needs a decision · GA
Assign an Unsorted sender to a category from the phone instead of editing the script. This adds the first endpoint that writes, so the key and write rules need care.
**Done when:** mapping a sender from the app updates the category map, the sender's issues move to that category from the next run, and a request without the key changes nothing.
- [ ] Design it (spec): `/architect set category in app`

## Slice 8: Habit nudge

### 12. Morning push nudge · needs a decision
A morning notification that says "Today's newsletters are ready" (no count) on the home screen app. Sending Web Push likely needs more than the Gmail script can do, so where it is sent from is the decision.
**Done when:** after you allow notifications, a nudge arrives each morning there are issues, with no number in it, and nothing arrives on empty days.
- [ ] Design it (spec): `/architect morning push nudge`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Unsubscribe nudge**: "you haven't opened this sender in 30 days, unsubscribe?" · needs a decision
- **Dark mode reader**: dark theme for the feed and the email HTML · needs a decision
- **Backlog import**: a one off, chunked job for old newsletters in the 17k backlog · needs a decision
- **Image privacy**: proxy or block remote images so senders cannot see opens · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack & architecture), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA); any surfaced follow up enrolled |
| `in-progress` (building) | `/develop` | milestone sub boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier's last stage (`Prototype` → after `/develop`; `Alpha` → after `/check verify`; `Beta`/`GA` → after `/test`) is the suggested point to call it done; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre workflow) and `dropped` (de scoped, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag = inherits it.
- **Workflow tier tag** beside a heading (e.g. `· GA`, `· Prototype`) sets that one feature's rigor above or below the project default; no tag inherits the default. It decides the feature's check boxes and each skill's next suggestion.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Prototype** = nothing (trust develop's own build time self check); **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`. A feature built on an unratified decision (an `Assumed` spec) stays flagged, but that never blocks `done`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.

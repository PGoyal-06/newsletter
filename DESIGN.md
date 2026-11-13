---
# gstack: design-md-format=spec
name: Morning Feed
description: Departure board minimalism; cool paper, black ink, one transit green; a short finite list you read in one glance.
colors:
  ground: "#F5F7F8"
  surface: "#FFFFFF"
  text: "#14181C"
  text-muted: "#5A636B"
  rule: "#DDE2E5"
  control: "#7D868E"
  primary: "#0B6E4F"
  on-primary: "#FFFFFF"
  warning-bg: "#FFF4D6"
  warning: "#7A4B00"
  error: "#B42318"
typography:
  display:
    fontFamily: Bricolage Grotesque
    fontWeight: 700
    fontSize: 2.6rem
    lineHeight: 0.95
    letterSpacing: -0.025em
  body:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 400
    fontSize: 1.0625rem
    lineHeight: 1.35
  label:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 600
    fontSize: 0.875rem
    lineHeight: 1.3
  meta:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 400
    fontSize: 0.8125rem
    lineHeight: 1.4
  mono:
    fontFamily: Atkinson Hyperlegible Mono
    fontWeight: 400
    fontSize: 0.8125rem
    fontFeature: tnum
rounded:
  sm: 6px
  phone: 0px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  gutter: 20px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  issue-row:
    minHeight: 64px
    paddingY: 14px
    borderBottom: "1px solid {colors.rule}"
  chip:
    minHeight: 44px
    paddingX: 14px
    rounded: "{rounded.sm}"
    borderColor: "{colors.control}"
    textColor: "{colors.text}"
  chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
  button-primary:
    minHeight: 48px
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
  button-secondary:
    minHeight: 48px
    borderColor: "{colors.control}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
  banner-stale:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning}"
    rounded: "{rounded.sm}"
  banner-offline:
    borderColor: "{colors.rule}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
  input:
    minHeight: 48px
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
  input-error:
    borderColor: "{colors.error}"
    borderWidth: 2px
  reader-bar:
    minHeight: 52px
    borderBottom: "1px solid {colors.rule}"
    actionColor: "{colors.primary}"
  focus-ring:
    outline: "2px solid {colors.primary}"
    outlineOffset: 2px
---

# Morning Feed

## Overview

**Creative North Star:** a modern departure board for today's newsletters. You read it in one glance, you see where it ends, and you're done. That is the opposite of an inbox.
**Product context:** a personal iPhone home screen PWA for one reader, showing only the last 24 hours of newsletters from a Gmail inbox they avoid. Read on the morning commute. Peers: Meco, Matter, Current, Wisp, SereneReader (all built around queues, rivers, or a calm serif look).
**Mode per surface:** Feed: Operate (scan and choose). Reader: Read (the newsletter brings its own design). Setup: Operate. Stats (later): Operate.
**Reference sites:** getmatter.com, meco.app, currentreader.app, wisp.news, serenereader.com (computed styles observed 2026-11-12).
**Key characteristics:**
- The date is the headline; the list is short; the ending is visible ("That's today.").
- No counts, dots, badges, progress, or read state anywhere.
- Type and whitespace do all the work: no cards, shadows, gradients, or icons.
- Times sit in a monospaced column like a departures board.
- Built for dim train light and large text sizes first.

## Colors

**Strategy:** Restrained. One accent, transit green, appears only where you can act or where focus is: the selected chip, primary buttons, reader actions, and the focus ring. Everything else is ink on cool paper.
**Light or dark:** light only in v1. The use scene is a phone in mixed morning light, and the reader shows newsletter HTML that almost always assumes a white page; a dark feed around a white email would flash every time you open an issue. Dark mode for the feed and email is a deferred scope item; the preview contains an unratified v1.1 draft only.

Categories never get colors. Colored labels behave like badges and start to sort the day into piles, which is the inbox feeling this product rejects. `warning` (amber) is reserved for the stale banner because it asks you to do something (retry); offline is informational, so it gets an outline in muted ink, not a color. `error` is used only with text plus a thicker border, never color alone.

`rule` (1.2:1) is a decorative hairline between rows; rows stay identifiable by their text. Any outline that identifies a control (unselected chip, secondary button) uses `control`, which meets the 3:1 non text contrast rule.

Measured contrast on `ground`: text 16.6:1, text-muted 5.7:1, primary (as focus ring) 5.8:1, control 3.45:1. White on primary 6.3:1. Warning on warning-bg 6.8:1. Error on surface 6.6:1.

## Typography

Three faces, three jobs, all free on Google Fonts (OFL) and self hosted with the app shell so the offline open never waits on a font request.

- **Bricolage Grotesque 700, display, masthead only.** The weekday and date ("Thursday 12"). It gives the app its own face in the one place it can afford character. Never used for content.
- **Atkinson Hyperlegible Next, everything you read.** Senders (600), subjects (400), chips, banners, buttons, setup. It was designed by the Braille Institute so similar letters (I l 1, O 0, rn m) never blur, which matters in a moving train and at large Dynamic Type sizes. This deliberately skips the calm serif the category uses.
- **Atkinson Hyperlegible Mono 400, times only.** Received times right aligned so they line up in a column.

**Dynamic Type:** the root font comes from iOS: `html { font: -apple-system-body; }` then the family is overridden. Every size in the tokens is rem, so the whole app follows the iPhone text size setting. Layouts grow in height, never clip; subjects wrap freely. Minimum rendered size at the default setting is 13.8px (meta and times).

Scale: display 2.6rem, body 1.0625rem, label 0.875rem, meta and mono 0.8125rem. The jump from display to body is deliberately large; the levels below differ by size and weight together.

## Layout

- Single column at every width. Side gutter 20px plus the iPhone safe area insets (`env(safe-area-inset-*)`).
- Order on the feed: masthead (date, then "Month · Updated 7:15") → banners if any → category chips → issue rows → the ending.
- Chips wrap onto a second line instead of scrolling sideways, so every category is visible.
- A 1px ink rule closes the chip area; 1px hairline rules separate rows.
- The ending ("That's today." plus the short date in mono) is set at row size, not small print.
- Rhythm: 16px between masthead parts, 14px row padding, 24px+ around state messages. Density is comfortable but tuned so the masthead, chips, and about five rows fit one screen at the default text size.

## Elevation & Depth

None. The app is flat paper. No shadows, no translucent layers, no glows. Hierarchy comes from type size, weight, and the two rule weights.

## Shapes

One radius: 6px (`rounded.sm`) on chips, buttons, banners, and inputs. Rows have no radius because they aren't containers. Never pill shaped controls.

## Components

- **Issue row.** The whole row is one link, at least 64px tall. Line one: sender (label) left, time (mono, muted) right. Line two: subject (body), wrapping, clamped to 3 lines with an ellipsis (the one sanctioned exception to never clip; the full subject stays in the VoiceOver label). Unsorted rows add a third line, "Unsorted · opens in Gmail" (meta, muted), so the destination is known before the tap. VoiceOver label reads sender, subject, time, and destination. Opening an issue never changes how its row looks.
- **Category chip.** A radio group of chips (`role="radiogroup"`, one `role="radio"` per chip): exactly one selected, arrow keys move and select, only the selected chip is a tab stop. 44px tall. Unselected: control outline, ink text. Selected: primary fill, white text. Focus: the focus ring. The last pick is remembered.
- **Banner.** Stale: warning tint with a 44px "Retry" text action. Offline: outlined, muted text, never an action (its props type forbids one). Both render inside an always mounted `StatusRegion` (`role="status"`), so VoiceOver announces them when they appear.
- **Button.** The shared action control: primary (green fill, white text) and secondary (control outline, ink text), 48px tall. Banner and empty state actions use it or its text style.
- **Empty states.** Day empty: "Nothing new today." plus "Everything older is in Gmail under Newsletters." Filter empty: "Nothing in AI today." plus a secondary "Show all" button.
- **Loading (first run only).** Placeholder rows shaped like real rows, so nothing shifts when data arrives. Masthead meta reads "Getting today's newsletters". After the first run the app always opens from the saved copy.
- **Reader bar.** 52px. "‹ Today" back action left, sender centered (ellipsized), "Open in Gmail" right; actions in primary. The email below keeps its own white page and styles.
- **Setup.** Visible "Secret key" label (no placeholder as label), mono input, primary button "Open today's feed". Wrong key: error text below the field plus a 2px error border.
- **States for every component:** default, focus visible (2px primary ring, 2px offset), pressed (opacity 0.7), disabled (opacity 0.4, never the only signal).

## Do's and Don'ts

- Do keep every tap target at least 44 by 44 CSS px; rows at least 64px tall.
- Do size all text in rem from the iOS body size; test at the largest accessibility text size.
- Do end every list with the visible "That's today." ending (filtered: "That's today in AI.").
- Do keep green for things you can act on; check any new color pair for AA before use.
- Do self host the three font files and precache them with the shell.
- Don't show counts, unread dots, badges, progress bars, or read state, anywhere, ever.
- Don't put rows in cards, add shadows, or color code categories.
- Don't use Bricolage for anything except the masthead.
- Don't use a colored left border on rows or banners.
- Don't scroll chips sideways or hide categories behind a menu.

## Motion

- **Approach:** minimal functional.
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)
- **The one authored moment:** when a fresh snapshot replaces the saved one, rows crossfade in place over 200ms with no layout jump. With Reduce Motion on, it swaps instantly.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-12 | Initial design system created | Created by /design-consultation from the office hours product doc, live research of five reading apps, and independent proposals from Codex and a Claude subagent; tokens from the approved HTML preview |
| 2026-11-12 | Bricolage Grotesque for the masthead | Chosen independently by both outside voices; adopted for the date only |
| 2026-11-12 | Rejected warm paper with vermilion, and per category ink colors | The first is the category's default calm look; the second turns categories into badges |
| 2026-11-12 | Light only for v1 | Newsletter HTML assumes a white page; dark mode is a deferred scope item |
| 2026-11-12 | Chips are a radio group; subject clamps to 3 lines; offline banner has no action; `Button` is the shared action | Built in spec 0003; code in `apps/web/src/features/design-system/ui/` |

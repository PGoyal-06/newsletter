# Review, feat/core-loop-todays-feed, 2026-11-13

**Reviewed by**: Claude Sonnet 5.5 (author on a different model per the /check flow)
**Scope**: 46 code files (plus 9 doc files, lighter), branch vs main
**Verdict**: Approve with nits

## Summary
The branch builds spec 0004 task 1 (thin worker thread: Gmail search, all Unsorted snapshot, Drive publish with read back, key checked `doGet`) and most of the web side of task 4 (bearer checked proxy, setup, feed, stale banner). The layering matches AGENTS.md (pure domain, Apps Script and `fetch` only in adapters or wiring), the secrets handling is careful, and typecheck plus all unit tests pass (script 82, web 79). No blockers or majors. The findings are spec drift and small robustness gaps that are cheap to fix now and would be awkward after task 2.

## Minor
### 🟡 Env validation does not stop the server, `apps/web/src/env.ts:28`, `apps/web/src/instrumentation.ts`
**Problem**: `env.ts`, `.env.example` ("the server refuses to start") and AGENTS.md ("validate env at startup") all promise a boot failure. Runtime evidence (observation a) shows `next start` logs the error and keeps running, and every `/api/today` call then fails with 500 because the module throws on import. `next build` never runs `register()`, so a Vercel deploy with a missing or http `SCRIPT_URL` builds and ships.
**Why it matters**: Fails closed, so no leak, but the phone sees a generic "couldn't load" banner (a 500 is not a 502 envelope, so it is also off the one error pattern) and the cause is only in server logs.
**Suggested fix**: Either make `register()` catch and exit the process (or validate in a build step), or correct the three comments to say requests fail until fixed. Also consider mapping the failure to the 502 envelope.

### 🟡 Secrets are not trimmed, `apps/web/src/env.ts:11-14`
**Problem**: `readSecret` rejects blank values but returns `raw` untrimmed. The phone trims what the user pastes (`SetupForm.tsx:35`).
**Why it matters**: An `APP_TOKEN` saved with a trailing newline or space (common when pasting into Vercel) can never match, and setup reports "That key doesn't open the feed" forever.
**Suggested fix**: Trim the value (or reject values with surrounding whitespace) for all three secrets.

### 🟡 Every row says "Unsorted" once the map lands, `apps/web/src/features/feed/ui/Feed.tsx:83` (`design-system/ui/IssueRow.tsx:78`)
**Problem**: Observation d confirmed. `destination="gmail"` hardcodes the text "Unsorted · opens in Gmail". Spec 0004 AC-10 says every row, "mapped or Unsorted", uses the Gmail destination in this slice, so mapped items added by task 2 will be labeled Unsorted.
**Why it matters**: Correct today (the worker sends all Unsorted), wrong the moment the category map ships inside this same spec.
**Suggested fix**: Before task 2 closes, decide the label source (a category prop on `IssueRow`, or a neutral "Opens in Gmail" with category shown separately) and update spec 0003 AC-4 and its gallery test with it.

### 🟡 Gmail rows open in a new tab, contradicting spec 0004, `apps/web/src/features/design-system/ui/IssueRow.tsx:87`
**Problem**: Observation e confirmed. Spec 0004 (web notes, line 163) says row links open in the same tab with `rel="noopener"`. IssueRow uses `target="_blank" rel="noopener noreferrer"`, which is exactly what spec 0003 AC-4 and `design-system.spec.ts:174` require.
**Why it matters**: Two accepted specs disagree. In a standalone iOS PWA the behaviors differ (in app browser sheet versus navigating the app away), so this should be a deliberate choice.
**Suggested fix**: Pick one on the phone check, amend the other spec, and add a `feed.spec.ts` assertion for the link target.

### 🟡 Manual Retry can send two requests, `apps/web/src/features/feed/ui/FeedApp.tsx:34,49`
**Problem**: Observation c confirmed. `query.refetch()` runs the same `retry` policy, so a failing Retry click makes one request, waits 2s, and sends another. AC-11 says "retries automatically at most once", which reads as once per load, not once per click. Nothing shows the user a refetch is under way (the banner stays), so a second tap is likely.
**Why it matters**: Doubled load on a failing worker and a confusing silent wait; low severity.
**Suggested fix**: Call `refetch({ cancelRefetch: false })` with retries disabled for manual refetches, and show the fetching state on the Retry button via `isFetching`.

### 🟡 Foreground refetch continues after a 401, `apps/web/src/features/feed/ui/FeedApp.tsx:26-40`
**Problem**: On a 401, `FeedScreen` stays mounted (it just renders `SetupForm`), so `refetchOnWindowFocus` keeps firing the dead token on every return to the foreground. AC-11 says a 401 is "never retried automatically".
**Suggested fix**: Set `enabled: false` (or `refetchOnWindowFocus: false`) once `query.error` is an `UnauthorizedError`, or lift the 401 state into `Shell`.

### 🟡 Transient Drive error orphans the snapshot folder, `apps/script/src/snapshot/adapters/drive.ts:48-55`
**Problem**: `folderUsable` returns false on any exception, including a quota or network blip. `ensureFolder` then creates a second folder and overwrites `snapshotFolderId`, leaving the old folder and its files unreachable by task 3's cleanup.
**Suggested fix**: Return false only for a 404 or a trashed or non folder result; rethrow other errors so the run fails and retries in 15 minutes.

### 🟡 Thin run grows Drive without bound and reads one page only, `apps/script/src/snapshot/domain/publish.ts:32`, `apps/script/src/run/run.ts:49`
**Problem**: One new file per run (96 per day) is never deleted, and `search` reads a single page of 100 threads with no cap signal.
**Why it matters**: Acceptable for a tracer bullet, but anything deployed on the 15 minute trigger before task 3 accumulates files, and a busy day silently truncates.
**Suggested fix**: Land task 3's cleanup before enabling the trigger long term, or log a `capped` flag now. Both are already in the plan; flagging only so the order is deliberate.

### 🟡 Untested behavior, tests
**Problem**: No test covers the retry policy (never on 401, once with 2000 ms delay), foreground refetch, or that a good setup call causes no second fetch (the e2e at `feed.spec.ts:91` may cover the last). `onTimer` throwing on a non success outcome (AC-6) has no test. The 25 hour hidden item and the href equals `gmailUrl` checks are present.
**Suggested fix**: Add a TanStack query config test or e2e with a counted route, and a `triggers` unit test with a failing store.

## Nits
- ⚪ `apps/script/src/check.ts:4-11`, the file header comment sits directly above `canonicalJson`, so it documents the wrong function; move it above `checkDriveAccess`.
- ⚪ `apps/script/src/snapshot/adapters/drive.ts:9`, `if (!Drive)` throws a ReferenceError (not the intended `drive_service_disabled`) when the service is not enabled; use `typeof Drive === "undefined"`.
- ⚪ `apps/script/src/run/run.ts:21`, `outcome: "success" | string` collapses to `string`; use a union of stage names.
- ⚪ `apps/script/src/mail/adapters/gmail.ts:3-14`, `getDate()` and `getSubject()` are read eagerly for every message of every thread, including old ones that the window filter drops; make them lazy or filter first. Fine now, matters in task 2's catch up.
- ⚪ Observation b (promotional mail such as LinkedIn and Uber Eats in the feed) is the spec's chosen rule (`List-Unsubscribe`), not a code defect. All rows are Unsorted with no body read, so nothing is exposed; the category map and any exclusions belong to task 2.

## Strengths
- Clean layering: domain code takes facades, Drive and Gmail are adapters, `main.ts` is the only global assignment, and the `asText` Drive quirk is handled and unit tested with a documented reason.
- Auth handling is careful: constant time digest compare on both sides, bearer checked before any upstream call, upstream URL and key never logged, upstream `bad_key` mapped to 502 so the phone is never sent to setup by a server fault.
- The publish order (write, read back, validate, then move the pointer) and the "Unsorted body is never read" invariant are enforced in code and tested, including the size cap and log hygiene.

## Test coverage
Strong at the domain and proxy layers (serve, assemble, publish through `runThin`, `todayRoute` including timeout and log content, `proxy` classification, env, feed filter) and Playwright WebKit covers setup, wrong key, 502 save, 401 mid session, Change and Cancel, the empty day, and axe. Gaps are listed under Minor: retry and foreground behavior, `onTimer` failure throw, and the Gmail adapter (thin, runtime verified instead).

# 0004 rationale: Core loop

## Context

This is scope feature 5 (Slice 1, Beta tier, Tracer Bullet), and it spans both halves of the monorepo: `apps/script` (the Apps Script worker) and `apps/web` (the Next.js PWA). Specs 0001 (stack), 0002 (data contract), and 0003 (design system) are accepted and fix most of the surface: the proxy route, the two secrets, the snapshot shape, the publish protocol, and the components. The code today is scaffold: `doGet` and `onTimer` are placeholders, and the web shell shows a static heading.

Spec 0002 handed this slice binding obligations: map lookup and reclassification on every rebuild, settings decoding and defaults, the publish and uncertain commit protocol, tracking files for cleanup, processing bounds, lock timing, and testing the endpoint failure matrix. The design doc's review left open questions this slice must close: how the rebuild finds archived mail (R2-4), what happens after an outage longer than the search window (R2-12), the Gmail read volume of rebuilding every 15 minutes (R2-2), and whether the Gmail deep link works from a home screen app (R2-13).

The forces are a single user with $0 to spend, Apps Script limits (6 minutes per run, 90 minutes of trigger time per day, daily Gmail quotas), a proxy that gives up after 25 seconds, and a product rule that the app must never become another inbox. The worst outcome is a silent failure: a feed that looks fine but is stale, or newsletters left in the inbox forever.

## Options considered

### Option 1: Label driven pipeline, oldest first catch up, rebuild every run (chosen)

Processing labels each newsletter thread with a parent `Newsletters` marker plus a category sublabel. Each run then finds the last 24 hours by searching that marker label, merges in its own fresh labels to cover search index lag, and publishes a new snapshot every time. Missed runs catch up from `lastProcessedAt`, oldest message first, inside a time budget.

**Pros**:
- Survives slice 4 archiving mail out of the inbox, because the snapshot never depends on `in:inbox`.
- No extra state beyond labels that Gmail already keeps.
- `generatedAt` is a free heartbeat for the stale banner.
- Self heals after outages up to 7 days.

**Cons**:
- Rereads every in window body on every run; the Gmail read volume is estimated, not measured.
- Depends on you not removing the parent label by hand.
- Thread level labels can tag personal mail that shares a thread with a newsletter.

### Option 2: Message ID index

The worker keeps a list of (message ID, received time) for the last 24 hours in a Script Property and fetches each message by ID to rebuild.

**Pros**:
- No search index lag, and independent of labels.
- Fetching by ID is cheap and exact.

**Cons**:
- A second piece of state that must stay consistent with the publish protocol and survive a crash between writes.
- Script Properties cap a value at 9KB, so the index needs pruning logic and a plan for a busy day.

### Option 3: Inbox search only, no marker label

Each run searches `in:inbox newer_than:2d`, rechecks `List-Unsubscribe`, and rebuilds from that.

**Pros**:
- Fewest moving parts; the thinnest possible slice.

**Cons**:
- Breaks the moment slice 4 archives mail, so that slice must redesign the rebuild.
- An outage longer than 2 days, or more than 100 threads, leaves newsletters unlabeled forever.

## Rationale

A cross check by a second model found about 30 gaps in the first draft, and all of the recommended fixes were applied. The biggest were Drive access under `drive.file`, trash filling storage, the daily runtime quota, refresh timeouts, and the snapshot size. The two that touched the engineer's picks (rebuild every run, refresh now) were kept, each with a preset mitigation (AC-16, and refresh skipping the rebuild when nothing new arrived).

Option 1 is the only one that keeps working after slice 4 without adding new state to keep consistent. The engineer chose the marker label search, catch up since the last run, rebuilding every run, and in window relabeling. Together those form one coherent pipeline: labels are the record of what is a newsletter, the map is the record of what category it is, and every run reconciles the two for the last 24 hours. Rebuilding every run costs Gmail reads, but it removes a whole class of bugs ("did the map change? did an item expire?") and keeps `generatedAt` meaningful as proof the worker is alive, which the design doc's success criteria depend on.

Two engineer picks differ from what the architect would have chosen; both are workable and are recorded honestly. **`refresh=1` now:** the architect would have deferred it to slice 3, because no UI calls it yet and the refresh vs timer collision is easier to design next to the pull gesture. The engineer's pick exercises the lock from two entry points early, so the cost is code that only tests and `curl` exercise for one slice. **In window relabeling:** the architect would have left old labels in place to keep the slice thin. The engineer's pick keeps Gmail consistent with the app and builds the "what category is this thread now" logic slice 4 needs, at the cost of more Gmail writes and tests now.

On the phone side, setup as a state of `/` (rather than a `/setup` route) keeps one static, precached page. That matters because slice 3 must open offline without a redirect flash. Testing the token before saving catches typos on a one time screen. Opening every card in Gmail for now gives every row a real destination, and it tests the riskiest unknown (the deep link from a home screen app) a slice early.

### Calls made by the architect (recommended, not asked)

| Call | Pick | Why | Runner up |
|---|---|---|---|
| Setup location | State inside `/` | One static precached page; no redirect flash | `/setup` route |
| Processing order | Oldest message first | A budget cutoff then leaves a clean marker; newest first could loop forever | Newest first with a "done" set |
| Overlap and cap | 15 minutes overlap; 7 day catch up cap; 2000 thread listing cap | Overlap absorbs search lag; caps bound a single run | No cap, page until done |
| Lock waits | Timer 10 s, then skip; refresh 2 s, then serve current | Timer runs again in 15 minutes; refresh must answer fast | Timer waits 60 s |
| Budgets | Timer processing 3 min; refresh processing 12 s | Leaves rebuild time under 6 minutes and under the 25 s proxy abort | One shared budget |
| Failed refresh | Serve the current published snapshot | The phone can do nothing better with `internal`; `generatedAt` shows the age | Return `internal` |
| Pointer write | One `setProperties` call for current plus previous | Fewer partial states to reconcile | Two separate writes |
| Cleanup | Script created folder, files over 1 hour old permanently deleted, sparing current and previous | Cleanup lists only its own files; age protects anything a reader might hold; trash would hold about 30 days of snapshots against your storage | Trash, and a property list of file IDs |
| Drive API | Drive advanced service (v3), no `DriveApp` | `DriveApp` may demand the full Drive scope; the advanced service honors `drive.file` | Widen the scope (rejected by spec 0001's rule) |
| Slow run fallback | Preset: over 30 s average, rebuild only on change, map hash change, or a 60 minute heartbeat | Keeps the engineer's every run choice while naming the exit in advance | Measure first, decide later |
| Refresh with nothing new | Skip the rebuild, serve current | Keeps most refreshes far under the 25 s proxy abort | Always rebuild |
| Size guard | Fail over 4MB, never truncate | Vercel caps responses near 4.5MB; a silent partial feed breaks trust | Split list and bodies (a new decision) |
| Relabel timing | After publish, failures only logged | A label hiccup never blocks the feed | Before publish, failure aborts |
| Unparseable `From` | Skip the message, log the stage | The contract requires a valid address; one odd sender should not stall the feed | Abort the run |
| Load error UI | `stale` banner with Retry, keep loaded items | Reuses the one design system banner that may carry an action | Error empty state |
| Query retry | None on 401, once after 2 s otherwise; `staleTime` 0 | 25 s timeouts make default triple retries far too slow; every open must refetch | TanStack defaults |
| Phone window | Hide only items older than 24 h by the phone clock | A phone clock running behind never hides new mail | Both bounds |
| Masthead | Date plus "Updated <time>" from `generatedAt` | Matches `DESIGN.md` feed order; makes freshness visible before slice 3 | Defer to slice 3 |

## Findings from the build

### Task 1: Gmail parent label search (2026-11-13)

A thread carrying only the sublabel `Newsletters/Test`, and not the parent `Newsletters`, was checked three ways:

- `checkDriveAccess` (GmailApp search) logged `label:Newsletters threads=0`.
- Gmail web search `label:newsletters-test` found the thread, so the sublabel was applied and searchable (the positive control).
- Gmail web search `label:newsletters` did not find it.

**Finding:** parent label search does not match threads that carry only a sublabel. The design already accounts for this: the worker puts the parent `Newsletters` label on every newsletter thread itself, and the candidate search relies on that, so no change is needed.

**Related:** Gmail's search box spells a nested label in lowercase with hyphens (`Newsletters/Test` becomes `label:newsletters-test`). The label's real name keeps the slash. The worker never searches by sublabel; it searches the one word parent and handles sublabels as label objects by their real names.

### Task 1: Drive read back (2026-11-13)

Under the pinned `drive.file` scope, the Drive advanced service (v3) creates, reads, lists, and permanently deletes the worker's own files. `Files.get` with `alt: "media"` returns a JSON file already parsed into an object, with its own key order. Every value survives unchanged (13 digit epoch numbers, unicode, empty strings, `null`, array order). The adapter serializes that object back to text, and callers validate by meaning (`isTodaySnapshot`), which ignores key order.

### Task 1: Phone test (2026-11-13)

On the installed iPhone app, a real feed showed, and a tap on a row opened a Safari sheet on the Gmail web **inbox**, with its unread count, not the newsletter's thread. Done returned to the feed with its state intact. The landing comes from the link address (`#all/<threadId>` is apparently not honoured by Gmail's mobile web), not from how the link opens. The fallback belongs to the reader spec (slice 2), per design concern R2-13.

## Decisions after the build (2026-11-13)

### How a row opens Gmail

- **Chosen: new tab** (`target="_blank" rel="noopener noreferrer"`, as `IssueRow` already does under spec 0003 AC-4). It is what the phone test ran on, and Done came back intact, which AC-14 requires. `noreferrer` also keeps the app's address from Gmail.
- **Same tab** (what this spec first said): rejected. Untested on the phone, risks the installed app navigating away and reloading on return (losing the feed state), changes a shipped component and its tests, and does not fix the inbox landing.
- **Gmail app deep link** (`googlegmail://`): rejected here. Undocumented, fails without the app installed, and it is the reader slice's question.

The engineer first picked same tab, then switched to new tab after the evidence above.

### What the third line says on rows that open Gmail

- **Chosen: say what's true.** Unsorted rows keep "Unsorted · opens in Gmail"; mapped rows say "Opens in Gmail". Keeps `DESIGN.md`'s rule that the destination is known before the tap, and keeps VoiceOver accurate. Costs a small `IssueRow` props change and one extra line on mapped rows until slice 2 sends them to the reader.
- **No line on mapped rows:** rejected; for one slice a mapped row would open Gmail without saying so.
- **Leave it until slice 2:** rejected; from task 2 on, every mapped row would wrongly say "Unsorted". The engineer leaned this way for simplicity, then went with the recommendation.

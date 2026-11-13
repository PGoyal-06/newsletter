# 0002. Shared newsletter data contract

**Date**: 2026-11-11
**Status**: Accepted
**Revised**: 2026-11-13, amended by spec 0004 (refresh failure, snapshot file cleanup, category name label rules) and follow-ups handed over

## Summary

Your worker and phone app share one versioned JSON contract. It defines today's issues, safe error responses, category mappings, and private worker settings. Shared validation checks incoming data without adding dependencies. Later slices implement the publication and recovery rules recorded here.

## Context

This repository wide foundation serves one person using Gmail through an Apps Script worker and a Next.js proxy. Both deployables consume the source package at `packages/contract`. The package currently exports only `CONTRACT_VERSION = 0`.

The scope is feature 3, Data contract, with the Beta workflow and Tracer Bullet delivery. Existing scope and specs use `docs/specs/` directly, so this spec follows that established location. This contract supports the planned reader, filters, offline freshness, and mapping from the phone without designing their implementations. No future shape can be guaranteed never to change; explicit version handling makes later breaking changes safe.

## Requirements

As the reader, you can see today's issues and identify unfamiliar senders without copying their bodies. As the builder, you can use the same validated shapes in the worker, proxy, and browser.

1. **AC-1**: A versioned snapshot represents unique Gmail messages, newest first, within a rolling 24 hour window, including an empty successful feed.
2. **AC-2**: Mapped issues carry explicit HTML or plain text content. Unsorted issues carry sender, subject, time, identity, and Gmail link, but no body.
3. **AC-3**: Category map validation accepts separate dictionaries with canonical list and sender keys and configurable category names. It rejects noncanonical keys, malformed values, the reserved names `All` and `Unsorted`, and names that break the Gmail label rules in invariant 7.
4. **AC-4**: Settings validation accepts decoded private settings containing the secret, nullable processing timestamp, archiving switch, and nullable snapshot file ID. It rejects missing fields and malformed values. Stored string decoding and defaults are documented adapter obligations, not implemented in this slice.
5. **AC-5**: Shared validation functions accept `unknown`, reject malformed or incompatible snapshots as a whole, and run without Node, browser, or Apps Script APIs or runtime dependencies.
6. **AC-6**: Error envelope validation accepts exactly `bad_key` or `internal` with `ok: false`, and rejects extra fields or unknown codes. HTTP status handling and setup navigation are documented obligations for later slices.
7. **AC-7**: JSON serialization and parsing preserve each valid snapshot content variant, empty feeds, category maps, decoded settings, and error envelopes. Invalid round trip fixtures fail the corresponding shared validator without modifying their input.
8. **AC-8**: The contract package exports the agreed types, version, normalization, and validation functions. Fixture tests demonstrate worker serialization and web consumption. Live Gmail and endpoint integration remain in the core loop slice.

## Options considered

### Option 1: Shared types only

This is the smallest compile time surface. It requires separate runtime checks in each adapter and can allow downloaded data to disagree with the types.

### Option 2: Shared types and pure validation functions

One package defines and checks the contract everywhere. It preserves the existing dependency rule, at the cost of maintaining validation beside the types.

### Option 3: A runtime schema library

A schema could generate types and reduce duplicated declarations. It would change the package's dependency rule and add bundled code for this small fixed contract.

## Decision

Choose option 2. Export named types and small pure validation functions from the existing source package. No new provider, dependency, environment variable, or deployment is required for the contract implementation.

## Rationale

Downloaded and cached JSON needs runtime checks even when both apps compile successfully. Sharing those checks prevents drift while keeping the package usable in all three runtimes. Explicit content variants preserve plain text without making `null` mean both an unmapped sender and a missing HTML part.

Configurable category names avoid a code release for every new interest. Separate dictionaries distinguish list identities from addresses. Complete snapshot publication favors trustworthy content over a silently incomplete feed.

## Feature design

### Data model

The following declarations specify the public exports. They are design examples, not implementation added by this change.

```ts
export const CONTRACT_VERSION = 1;

export type IssueContent =
  | { kind: "html"; html: string }
  | { kind: "text"; text: string }
  | { kind: "none" };

export interface NewsletterIssue {
  id: string;
  threadId: string;
  sender: string;
  senderEmail: string;
  listId: string | null;
  subject: string;
  receivedAt: number;
  category: string;
  content: IssueContent;
  gmailUrl: string;
}

export interface TodaySnapshot {
  ok: true;
  contractVersion: typeof CONTRACT_VERSION;
  generatedAt: number;
  items: NewsletterIssue[];
}

export type ErrorCode = "bad_key" | "internal";
export interface ErrorEnvelope {
  ok: false;
  error: ErrorCode;
}
export type TodayResponse = TodaySnapshot | ErrorEnvelope;

export interface CategoryMap {
  listIds: Record<string, string>;
  senders: Record<string, string>;
}

export interface ScriptSettings {
  secretKey: string;
  lastProcessedAt: number | null;
  archivingEnabled: boolean;
  snapshotFileId: string | null;
}
```

A snapshot contains zero or more issues. The message ID is its unique key; multiple issues can share a thread ID. There are no database foreign keys. Map entries relate many list IDs or senders to one category name. Each issue contains the resolved category, not a reference requiring another fetch. The map and settings never appear inside a snapshot.

### Canonical values and invariants

1. Timestamps are nonnegative safe integers in epoch milliseconds. No calendar date key is emitted. Rolling durations require no timezone conversion. The existing script timezone, `America/New_York`, stays unchanged; presentation uses the phone's timezone.
2. Capture `generatedAt` after reading the candidate messages and immediately before assembling the final snapshot. Include only `generatedAt - 86_400_000 < receivedAt <= generatedAt`. Sort by descending `receivedAt`, then ascending message ID using code unit comparison. No duplicate IDs are allowed. Never truncate a snapshot silently.
3. The browser independently applies the same rolling window against its current clock, including on cache restore. Structural validation uses `generatedAt`, not the device clock. Cache expiration and UI scheduling belong to the offline slice.
4. `id` and `threadId` are nonempty Gmail hexadecimal identifiers. `gmailUrl` must equal `https://mail.google.com/mail/u/0/#all/` followed by `threadId`. Opening this link on the actual phone remains a core loop verification task.
5. Sender normalization trims surrounding whitespace and lowercases the extracted address. It does not remove plus tags or dots. Require a nonempty local part and domain with exactly one `@`, and no whitespace or angle brackets. This is the supported address subset, not a complete email standard parser.
6. List normalization extracts the identifier inside one angle bracket pair, or accepts a bare identifier, trims it, and lowercases it. Require a nonempty identifier without whitespace, control characters, or angle brackets; unlike an email address, it does not need an `@`. Missing or unusable List-Id becomes `null`, allowing sender fallback. Stored map keys must already be canonical. Reject conflicting raw entries that normalize to one key during import rather than silently overwriting them.
7. Category names are trimmed nonempty strings without control characters. They are case sensitive. Because each becomes a Gmail label `Newsletters/<Category>`, `isCategoryMap` also rejects a name containing `/`, a name longer than 100 characters, and two distinct names that differ only in letter case (amended 2026-11-13 by spec 0004; the map never travels in a snapshot, so `CONTRACT_VERSION` is unchanged). Both `All` and `Unsorted` are reserved and forbidden as map values. In an issue, `Unsorted` is allowed only with no content, while `All` is always invalid. The browser derives current filter choices solely from categories present in snapshot items, plus its `All` filter. The map remains private. Discovering configured categories absent from the current snapshot belongs to the later category editing interface; this snapshot has no category catalog.
8. Look up an own property in `listIds` first, then in `senders`, otherwise use `Unsorted`. Do not use inherited object properties as map entries. Reclassify every candidate in the window on rebuild, including previously processed Unsorted issues.
9. `Unsorted` requires exactly `{ kind: "none" }`. Every other category requires HTML or text content. Reject extra content fields, including a body hidden inside a `none` object. HTML is preferred when nonempty; otherwise use the plain body, which may be empty. Missing sender display name falls back to `senderEmail`; an empty subject is allowed.
10. Worker HTML is raw, untrusted input. No image or style stripping happens in this contract or worker. The reader must sanitize and sandbox HTML before rendering; plain text must render as text. Validation is not sanitization. Remote image policy remains the reader spec's concern.
11. Unknown fields are rejected at every defined object boundary, including errors and content variants. Map dictionaries accept arbitrary canonical keys. Arrays, `null`, and primitives are not objects for these checks. Validators never mutate their inputs.
12. Increment `CONTRACT_VERSION` for a breaking wire shape or meaning change. Both producer and consumer must deploy compatible versions. Reject other versions and discard incompatible persisted caches using the version as the persister buster. Retain any separately available compatible cache when a new response fails validation.

### Settings storage and publication

The rules in this section are binding integration obligations for the core loop slice. This contract slice implements the decoded types and validation only. It does not implement Properties decoding, Gmail processing, publication orchestration, or Drive cleanup.

| Script Property | Decoded field | Missing value | Stored representation |
|---|---|---|---|
| `SCRIPT_KEY` | `secretKey` | Configuration failure | Nonempty secret generated from at least 32 random bytes, as established in spec 0001 |
| `lastProcessedAt` | `lastProcessedAt` | `null` | Decimal epoch milliseconds |
| `archivingEnabled` | `archivingEnabled` | `false` | Exact string `true` or `false` |
| `snapshotFileId` | `snapshotFileId` | `null` | Nonempty opaque Drive file ID |

The worker also keeps internal properties outside this type (`previousSnapshotFileId`, `snapshotFolderId`, and optionally `categoryMapHash`); they are defined in spec 0004 and never cross the contract.

The Properties adapter decodes strings before validating `ScriptSettings`. An explicitly malformed value never becomes a default. A null processing timestamp gives an effective starting timestamp of run start minus 24 hours. The category map initially lives as a private worker configuration object satisfying `CategoryMap`, with empty dictionaries allowed. Storage changes for phone editing belong to that later spec.

Publication uses a new private Drive file for each successful generation, created under the existing `drive.file` scope. Under the core loop's script lock: read settings and map, build and validate the entire JSON in memory, create a candidate file, read it back and validate it, then attempt to replace `snapshotFileId`. Never overwrite the published file in place. Publication is defined by the persisted pointer referencing the validated candidate, not by whether the write call returns successfully. Update `lastProcessedAt` to run start only after publication is confirmed. A crash between pointer replacement and timestamp update may repeat processing; label and archive operations must be safe to repeat.

Before attempting pointer replacement, a failure leaves the old pointer and marker unchanged. A pointer write can commit before reporting an error. Reconcile a write error by rereading the persisted pointer while holding the lock. If it references the candidate, publication succeeded. If it still references the previous file, publication did not occur. If the state cannot be read or is unexpected, the outcome is unknown: retain both files, do not attempt a marker update, and fail the run. (Amended by spec 0004: a failed refresh run makes `doGet` serve the current published snapshot when its pointer is readable, and `internal` only when it is not.) A later run rereads persisted state rather than assuming rollback.

A marker write can also commit before reporting an error. After confirmed publication, either the old marker or the new run start is safe because the snapshot is complete and mail actions are safe to repeat. Do not infer an unchanged marker from an exception or roll back the complete snapshot. A read captures the pointer once and opens that file by ID, with no name search. A missing or corrupt pointed file returns `internal`; the phone retains its compatible cache. Routine reads cannot observe a partially written file through this protocol.

On confirmed publication, retain the immediately previous file until the next confirmed publication. Under the same lock, the adapter permanently deletes older files it created for this purpose; it must never target unrelated Drive files. (Amended by spec 0004: files live in a folder the worker created, and cleanup removes only folder files older than 1 hour, so a candidate from a run whose outcome was unknown is never removed before a later run has reread the pointer.) Never classify a candidate as unpublished solely because its pointer write threw. Cleanup must exclude the current persisted pointer and the retained previous file. If the pointer cannot be read, skip cleanup. File cleanup failure does not roll back a published snapshot or advance the marker incorrectly. This is Drive file housekeeping, never mail deletion.

### Interfaces

Export `isTodaySnapshot(value: unknown): value is TodaySnapshot`, `isErrorEnvelope(value: unknown): value is ErrorEnvelope`, `isTodayResponse(value: unknown): value is TodayResponse`, `isCategoryMap(value: unknown): value is CategoryMap`, and `isScriptSettings(value: unknown): value is ScriptSettings`. Return `false` for invalid data without throwing. Also export `normalizeSenderEmail(value: string): string | null` and `normalizeListId(value: string): string | null`, using the rules above. Private validation helpers need not be exported.

Validation failures are local booleans, not a new network error shape. Adapters parse JSON inside their own error handling. Settings validation checks secret presence, not proof of entropy; secret generation remains an operator setup responsibility.

| Surface | Inputs | Output | Authentication and failure |
|---|---|---|---|
| Worker `doGet`, GET | Required `key`, optional `refresh=1` | `TodayResponse`, JSON | Missing or wrong key: `bad_key`; operational failure: `internal`. Apps Script response body carries the error. |
| Proxy `/api/today`, GET | `Authorization: Bearer APP_TOKEN`, optional `refresh=1` | Valid snapshot with HTTP 200 | Phone token mismatch: bare HTTP 401. Upstream error, bad JSON, wrong version, timeout, or invalid snapshot: HTTP 502 and `{ ok: false, error: "internal" }`. |
| Browser snapshot consumer | Proxy response or restored cache | Valid snapshot or local failure state | Only HTTP 401 opens setup. Other failures preserve compatible cached data. |

The proxy checks phone authentication before calling the worker, uses `no-store`, and never forwards an upstream `bad_key` to the phone. `SCRIPT_KEY` stays on the server. A refresh that finds the rebuild lock held reads the current complete snapshot with its original `generatedAt`; absence of one returns `internal`. Trigger lock acquisition and timeout details belong to the core loop spec.

This surface table is a binding obligation for the core loop endpoints. Browser cache retention and setup navigation are enforced in the offline slice. Likewise, current map resolution and reclassification on every rebuild belong to the core loop implementation. Their production behavior is not claimed verified by contract fixtures.

### Value sourcing

| Produced value | Source |
|---|---|
| `contractVersion` | Shared `CONTRACT_VERSION` constant |
| `generatedAt` and rolling cutoff | Worker clock at snapshot assembly and fixed duration above |
| Issue `id`, `threadId`, `receivedAt` | Gmail message ID, containing thread ID, and message date |
| `senderEmail`, `sender` | Parsed From address and display name, with address fallback |
| `listId` | Normalized List-Id header or `null` |
| `subject` | Gmail message subject, including empty string |
| `category` | Current private category map, list first, then sender |
| Browser category filter choices | Distinct category values in current snapshot items, plus the UI's `All` filter |
| `content` | Current mapping plus Gmail HTML or plain body; no body access needed for Unsorted |
| `gmailUrl` | Fixed Gmail URL prefix plus the containing thread ID |
| Settings and first run cutoff | Properties adapter decoding above and captured run start |
| `snapshotFileId` | ID returned by creating and validating the private candidate Drive file |
| Error code and proxy status | Authentication result or caught adapter/transport failure |
| Browser expiry and display time | Device clock and local timezone |

### Security and failure behavior

The account owner controls the map and settings. The phone token authorizes reading through the proxy; the worker key authorizes the proxy's upstream call. Neither logs nor error envelopes may contain secrets, request URLs with keys, bodies, subjects, or raw upstream errors. Operational logs may include a fixed stage name and error code. No new regulatory scope is asserted for this personal tool.

Unsorted subjects and sender addresses are intentionally copied into Drive, responses, and the phone cache. Mapped HTML may also contain personal information. Any issue read or serialization failure aborts the rebuild rather than publishing a partial success. Existing Gmail labels or archive actions cannot be rolled back by this snapshot protocol; the core loop must make retries safe and never advance its marker on an incomplete run.

### Critical test scenarios

1. Empty feed, multiple messages in one thread, equal timestamps, and the exact 24 hour boundary verify AC-1.
2. HTML, plain text, empty plain body, and Unsorted with attempted hidden body fields verify AC-2 and AC-5.
3. Canonical list and sender keys, case normalization, malformed dictionaries, and reserved category names verify AC-3. Precedence and reclassification tests belong to the core loop slice.
4. Valid nullable settings, missing decoded fields, wrong field types, and empty secret verify AC-4. Stored defaults and the first run cutoff are tested when the core loop implements decoding.
5. Malformed nested values, unsupported versions, duplicate IDs, wrong order, invalid URLs, and unknown fields verify AC-5.
6. Both error codes, unknown codes, extra data, and incorrect `ok` values verify AC-6.
7. Valid and invalid JSON round trips for every shared shape, with input mutation checks, verify AC-7.
8. One shared serialized fixture consumed by worker and web tests, plus typecheck and both production bundles, verify AC-8.

Later integration gates are distinct from these acceptance tests. The core loop must test real production functions with fake ports for remapping, settings decoding, publication, uncertain commits, busy refresh, and HTTP error mapping. Include pointer and marker writes that commit and then throw, failed reconciliation reads, and cleanup exclusion of possibly published files. The offline slice must test cache retention and setup navigation against actual browser state handling. Fixtures alone cannot establish these behaviors.

## Build plan

1. Prove a minimal mapped plain text issue through a shared serialized fixture: export the version and snapshot types, validate the fixture, and consume it in worker and web tests. This is the contract's first thread across both halves, satisfying AC-1, AC-2, AC-5, and AC-8.
2. Complete the shared contract with content variants, error types, category maps, decoded settings, normalization, and all validators. Add boundary fixtures, reserved name cases, and invalid decoded settings, satisfying AC-1 through AC-6 and AC-8. Version 0 has no deployed snapshot data to migrate; consumers must reject it rather than inventing a conversion.
3. Test JSON round trips and input preservation for every shared shape, satisfying AC-7. Carry forward the documented integration obligations into the core loop and offline specs without implementing or simulating their orchestration in this foundation.
4. Run workspace lint, typecheck, unit tests, and both bundles to prove the dependency and runtime boundaries, satisfying AC-8. Real Gmail publication and iPhone verification are the core loop slice's integration gate.

## Consequences

The two apps share one checked boundary, and future categories do not require a new contract. Raw content remains clearly separated from rendering policy.

Strict whole snapshot failure can leave the feed stale when one issue is broken. Handwritten validators require careful tests. Creating immutable snapshot files adds Drive housekeeping. A rolling snapshot intentionally has no pagination or history; if payload size stops fitting the existing proxy, splitting list and body fetches requires a new decision.

## Follow-up

1. **Handed to spec [0004](0004-core-loop-todays-feed/index.md) (core loop).** Mapping precedence and reclassification, settings decoding and defaults, the publication and uncertain commit protocol, candidate file cleanup, processing bounds, lock timing, and the endpoint failure matrix tests are all decided there (AC-2 to AC-8). Implementing the stricter `isCategoryMap` from invariant 7 is task 2 of its build plan.
2. **Open, owned by scope feature 6 (in app reader).** The reader spec must define sanitization, sandboxing, image handling, and plain text presentation before raw HTML is rendered.
3. **Open, owned by scope feature 7 (offline & freshness).** The offline slice must implement cache version invalidation, expiry on device time, freshness UI, and authentication recovery. Spec 0004 already does the device time filter and 401 to setup for the live query; caching remains.
4. **Open, owned by scope feature 11 (set category in app).** The category editing slice must define authenticated writes, map persistence, collision feedback, and a browser source for configured category choices absent from current issues, while preserving these canonical keys, reserved names, and label rules.

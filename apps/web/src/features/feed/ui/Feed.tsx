"use client";

import type { TodaySnapshot } from "@newsletter/contract";
import { Banner, EmptyState, IssueRow, StatusRegion } from "@/features/design-system/ui";
import { visibleItems } from "../domain/feed";

export const LOAD_FAILED = "Couldn't load today's newsletters.";

export interface FeedProps {
  snapshot: TodaySnapshot | undefined;
  /** The phone clock as of the latest fetch (the caller owns time, so render stays pure). */
  now: number;
  loading: boolean;
  failed: boolean;
  onRetry(): void;
  onChangeKey(): void;
}

// Only rendered in the browser (the shell renders nothing until IndexedDB is read), so
// formatting with the phone's clock, locale, and timezone never mismatches hydration.
const fmt = (options: Intl.DateTimeFormatOptions, at: number) =>
  new Intl.DateTimeFormat(undefined, options).format(at);

function PlaceholderRows() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex min-h-[64px] flex-col gap-sm border-b border-rule py-md">
          <span className="h-[0.875rem] w-2/5 rounded-sm bg-rule" />
          <span className="h-[1.0625rem] w-4/5 rounded-sm bg-rule" />
        </div>
      ))}
    </div>
  );
}

/** Today's feed (spec 0004 AC-10, AC-11): masthead, status, rows, and the ending. */
export function Feed({ snapshot, now, loading, failed, onRetry, onChangeKey }: FeedProps) {
  const items = snapshot ? visibleItems(snapshot.items, now) : [];
  const meta = snapshot
    ? `${fmt({ month: "long" }, now)} · Updated ${fmt({ hour: "numeric", minute: "2-digit" }, snapshot.generatedAt)}`
    : loading
      ? "Getting today's newsletters"
      : fmt({ month: "long" }, now);

  return (
    <main className="flex flex-1 flex-col px-gutter pt-2xl pb-xl">
      <header className="flex flex-col gap-md pb-lg">
        <h1 className="font-display text-display">
          {fmt({ weekday: "long" }, now)} {fmt({ day: "numeric" }, now)}
        </h1>
        <p className="font-mono text-mono text-text-muted">{meta}</p>
      </header>

      <StatusRegion>
        {failed ? (
          <Banner variant="stale" action={{ label: "Retry", onClick: onRetry }}>
            {LOAD_FAILED}
          </Banner>
        ) : loading && !snapshot ? (
          <span className="sr-only">Loading today&apos;s newsletters</span>
        ) : null}
      </StatusRegion>

      <div className="border-t border-text pt-xs">
        {!snapshot && loading && <PlaceholderRows />}
        {snapshot && items.length === 0 && (
          <EmptyState
            message="Nothing new today."
            detail="Everything older is in Gmail under Newsletters."
          />
        )}
        {items.length > 0 && (
          <>
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <IssueRow
                    sender={item.sender}
                    subject={item.subject}
                    receivedAt={item.receivedAt}
                    href={item.gmailUrl}
                    destination="gmail"
                  />
                </li>
              ))}
            </ul>
            <p className="flex items-baseline justify-between py-lg text-body">
              <span>That&apos;s today.</span>
              <span className="font-mono text-mono text-text-muted">
                {fmt({ month: "short", day: "numeric" }, now)}
              </span>
            </p>
          </>
        )}
      </div>

      <footer className="mt-auto pt-2xl">
        <button
          type="button"
          onClick={onChangeKey}
          className="min-h-[44px] text-meta text-text-muted underline underline-offset-2 active:opacity-70"
        >
          Change secret key
        </button>
      </footer>
    </main>
  );
}

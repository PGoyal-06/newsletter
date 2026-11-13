"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { isDevelopment } from "./isDevelopment";

export type IssueDestination = "reader" | "gmail";

export interface IssueRowProps {
  sender: string;
  subject: string;
  /** When the issue arrived, epoch milliseconds (contract `NewsletterIssue.receivedAt`). */
  receivedAt: number;
  /** The reader route for "reader", the contract's `gmailUrl` for "gmail". */
  href: string;
  destination: IssueDestination;
}

const TIME_ONLY: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
const WEEKDAY_AND_TIME: Intl.DateTimeFormatOptions = { weekday: "short", ...TIME_ONLY };

/**
 * "6:02 AM" for today, "Wed 9:40 PM" for anything before the phone's local midnight.
 * Timezone and locale are the phone's own, so this only ever runs in the browser.
 */
function formatReceivedTime(receivedAt: number, now: number): string {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const options = receivedAt < midnight.getTime() ? WEEKDAY_AND_TIME : TIME_ONLY;
  return new Intl.DateTimeFormat(undefined, options).format(receivedAt);
}

const noSubscription = () => () => {};

/**
 * The time text, or null before the row mounts in the browser. The server snapshot is
 * null, so nothing formats a time at build or on the server, and hydration never
 * mismatches. A string snapshot compares by value, so it is stable between renders.
 */
function useReceivedTime(receivedAt: number): string | null {
  return useSyncExternalStore(
    noSubscription,
    () => (Number.isFinite(receivedAt) ? formatReceivedTime(receivedAt, Date.now()) : null),
    () => null,
  );
}

const ROW =
  "grid min-h-[64px] grid-cols-[minmax(0,1fr)_minmax(auto,40%)] gap-x-md gap-y-xs border-b border-rule py-[0.875rem] text-text no-underline active:opacity-70";

/** One newsletter issue in the feed. The whole row is one link. */
export function IssueRow({ sender, subject, receivedAt, href, destination }: IssueRowProps) {
  const time = useReceivedTime(receivedAt);
  if (isDevelopment && !Number.isFinite(receivedAt)) {
    throw new Error(`IssueRow: receivedAt must be a finite epoch ms value, got ${receivedAt}.`);
  }

  const isGmail = destination === "gmail";

  // DOM order is sender, subject, time, so VoiceOver reads them in that order; the grid
  // moves the time to the top right.
  const content = (
    <>
      <span className="col-start-1 row-start-1 text-label wrap-anywhere">{sender}</span>
      <span data-slot="subject" className="col-span-2 row-start-2 line-clamp-3 text-body">
        {subject}
      </span>
      <time
        dateTime={Number.isFinite(receivedAt) ? new Date(receivedAt).toISOString() : undefined}
        // Space is reserved before mount so the sender does not reflow when the time lands.
        // The column is capped at 40% so at large text the time wraps, not the sender.
        className="col-start-2 row-start-1 min-w-[5em] text-right font-mono text-mono text-text-muted tabular-nums"
      >
        {time}
      </time>
      {isGmail && (
        <span className="col-span-2 row-start-3 text-meta text-text-muted">
          <span aria-hidden="true">Unsorted · opens in Gmail</span>
          <span className="sr-only">, opens in Gmail</span>
        </span>
      )}
    </>
  );

  if (isGmail) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={ROW}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={ROW}>
      {content}
    </Link>
  );
}

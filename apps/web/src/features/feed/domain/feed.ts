import { isTodaySnapshot, type NewsletterIssue, type TodaySnapshot } from "@newsletter/contract";

export const DAY_MS = 86_400_000;

export type TodayOutcome =
  { kind: "success"; snapshot: TodaySnapshot } | { kind: "unauthorized" } | { kind: "failed" };

/**
 * What a `/api/today` answer means for the app: 401 is the only "your key is wrong"
 * signal; anything that is not a 200 with a valid snapshot is a plain failure.
 */
export function classifyTodayResponse(status: number, body: unknown): TodayOutcome {
  if (status === 401) return { kind: "unauthorized" };
  if (status === 200 && isTodaySnapshot(body)) return { kind: "success", snapshot: body };
  return { kind: "failed" };
}

/**
 * Items from the last 24 hours by the phone's clock. Lower bound only, so a phone clock
 * running behind never hides new mail (spec 0004 AC-10).
 */
export function visibleItems(items: readonly NewsletterIssue[], now: number): NewsletterIssue[] {
  return items.filter((item) => item.receivedAt > now - DAY_MS);
}

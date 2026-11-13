import type { TodaySnapshot } from "@newsletter/contract";
import { classifyTodayResponse, type TodayOutcome } from "../domain/feed";

/** A 401: the stored key no longer works. Never retried. */
export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Anything else that is not a valid snapshot: 502, offline, timeout, invalid body. */
export class FeedLoadError extends Error {
  constructor() {
    super("failed");
    this.name = "FeedLoadError";
  }
}

/** Call /api/today with the token and classify the answer. Never throws for a bad status. */
export async function requestToday(token: string): Promise<TodayOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/today", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return { kind: "failed" };
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // A bare 401 or a non JSON body: the status decides.
  }
  return classifyTodayResponse(response.status, body);
}

/** The query function: the snapshot, or a typed error the UI branches on. */
export async function fetchToday(token: string): Promise<TodaySnapshot> {
  const outcome = await requestToday(token);
  if (outcome.kind === "success") return outcome.snapshot;
  if (outcome.kind === "unauthorized") throw new UnauthorizedError();
  throw new FeedLoadError();
}

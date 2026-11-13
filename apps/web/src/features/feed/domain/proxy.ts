import { isErrorEnvelope, isTodaySnapshot, type TodaySnapshot } from "@newsletter/contract";

/**
 * The token from `Authorization: Bearer <token>`: "Bearer" in any letter case, exactly
 * one space, then the rest as is. Anything else is malformed (spec 0004 AC-8).
 */
export function parseBearer(header: string | null): string | null {
  if (header === null) return null;
  const match = /^bearer (.+)$/isu.exec(header);
  return match ? match[1]! : null;
}

/** A fixed stage name the proxy logs; never the URL, key, or body. */
export type UpstreamStage =
  | "upstream_timeout"
  | "upstream_failed"
  | "upstream_not_json"
  | "upstream_invalid"
  | "upstream_bad_key"
  | "upstream_internal";

export type UpstreamResult =
  { kind: "snapshot"; snapshot: TodaySnapshot } | { kind: "error"; stage: UpstreamStage };

/**
 * Classify what the worker sent. Only a JSON content type whose body parses and passes
 * the contract counts as a snapshot; Google's HTML error pages and envelopes do not.
 */
export function classifyUpstream(contentType: string | null, body: string): UpstreamResult {
  if (!contentType || !/^application\/json\b/iu.test(contentType.trim())) {
    return { kind: "error", stage: "upstream_not_json" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { kind: "error", stage: "upstream_not_json" };
  }
  if (isTodaySnapshot(parsed)) return { kind: "snapshot", snapshot: parsed };
  if (isErrorEnvelope(parsed)) {
    return {
      kind: "error",
      stage: parsed.error === "bad_key" ? "upstream_bad_key" : "upstream_internal",
    };
  }
  return { kind: "error", stage: "upstream_invalid" };
}

/** Upstream URL with the key and, only for the literal "1", the refresh flag. */
export function upstreamUrl(scriptUrl: string, scriptKey: string, refresh: string | null): string {
  const url = new URL(scriptUrl);
  url.searchParams.set("key", scriptKey);
  if (refresh === "1") url.searchParams.set("refresh", "1");
  return url.toString();
}

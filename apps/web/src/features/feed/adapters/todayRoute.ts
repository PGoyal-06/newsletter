import { createHash, timingSafeEqual } from "node:crypto";
import { classifyUpstream, parseBearer, upstreamUrl, type UpstreamStage } from "../domain/proxy";

export interface TodayRouteDeps {
  appToken: string;
  scriptUrl: string;
  scriptKey: string;
  fetch: typeof fetch;
  log(line: string): void;
  timeoutMs?: number;
}

const UPSTREAM_TIMEOUT_MS = 25_000;

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest();

/** Constant time: both sides are hashed to 32 bytes first, so lengths never leak. */
function tokenMatches(given: string, expected: string): boolean {
  return timingSafeEqual(sha256(given), sha256(expected));
}

const internal = () =>
  Response.json(
    { ok: false, error: "internal" },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );

/**
 * GET /api/today (spec 0004 AC-8): check the bearer before any upstream call, then
 * proxy the worker. Answers are a valid snapshot (200), a bare 401, or a 502 envelope.
 */
export async function handleToday(request: Request, deps: TodayRouteDeps): Promise<Response> {
  const token = parseBearer(request.headers.get("authorization"));
  if (token === null || !tokenMatches(token, deps.appToken)) {
    return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const refresh = new URL(request.url).searchParams.get("refresh");
  const fail = (stage: UpstreamStage) => {
    deps.log(`api/today ${stage}`);
    return internal();
  };

  let upstream: Response;
  let body: string;
  try {
    upstream = await deps.fetch(upstreamUrl(deps.scriptUrl, deps.scriptKey, refresh), {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(deps.timeoutMs ?? UPSTREAM_TIMEOUT_MS),
    });
    body = await upstream.text();
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return fail(timedOut ? "upstream_timeout" : "upstream_failed");
  }

  const result = classifyUpstream(upstream.headers.get("content-type"), body);
  if (result.kind === "error") return fail(result.stage);
  return Response.json(result.snapshot, { headers: { "Cache-Control": "no-store" } });
}

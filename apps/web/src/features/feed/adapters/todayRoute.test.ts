// covers: spec 0004 AC-8 (the /api/today proxy)
import { describe, expect, it, vi } from "vitest";
import fixture from "../../../../../../packages/contract/fixtures/today.json";
import { handleToday, type TodayRouteDeps } from "./todayRoute";

const SCRIPT_URL = "https://script.google.com/macros/s/abc/exec";
const TOKEN = "phone-token";

function setup(upstream: () => Promise<Response>) {
  const lines: string[] = [];
  const fetchMock = vi.fn<typeof fetch>(upstream);
  const deps: TodayRouteDeps = {
    appToken: TOKEN,
    scriptUrl: SCRIPT_URL,
    scriptKey: "script-key",
    fetch: fetchMock,
    log: (line) => lines.push(line),
    timeoutMs: 50,
  };
  return { deps, fetchMock, lines };
}

const request = (auth?: string, query = "") =>
  new Request(`http://localhost/api/today${query}`, {
    headers: auth === undefined ? {} : { authorization: auth },
  });

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

describe("handleToday", () => {
  it("returns the snapshot with no-store for a valid bearer", async () => {
    const { deps, fetchMock } = setup(async () => jsonResponse(fixture));

    const res = await handleToday(request(`bearer ${TOKEN}`), deps);

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual(fixture);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${SCRIPT_URL}?key=script-key`);
    expect(init).toMatchObject({ redirect: "follow", cache: "no-store" });
  });

  it.each([undefined, "Bearer wrong", `Basic ${TOKEN}`, `Bearer ${TOKEN}x`, "Bearer"])(
    "answers %j with a bare 401 and never calls upstream",
    async (auth) => {
      const { deps, fetchMock } = setup(async () => jsonResponse(fixture));

      const res = await handleToday(request(auth), deps);

      expect(res.status).toBe(401);
      expect(await res.text()).toBe("");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("passes only refresh=1 through", async () => {
    const { deps, fetchMock } = setup(async () => jsonResponse(fixture));

    await handleToday(request(`Bearer ${TOKEN}`, "?refresh=1&key=evil"), deps);
    await handleToday(request(`Bearer ${TOKEN}`, "?refresh=yes"), deps);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${SCRIPT_URL}?key=script-key&refresh=1`,
      `${SCRIPT_URL}?key=script-key`,
    ]);
  });

  it.each([
    [
      "Google HTML",
      async () => new Response("<html/>", { headers: { "content-type": "text/html" } }),
      "upstream_not_json",
    ],
    ["bad_key", async () => jsonResponse({ ok: false, error: "bad_key" }), "upstream_bad_key"],
    ["internal", async () => jsonResponse({ ok: false, error: "internal" }), "upstream_internal"],
    [
      "a wrong version",
      async () => jsonResponse({ ...fixture, contractVersion: 9 }),
      "upstream_invalid",
    ],
    [
      "a network failure",
      async () => {
        throw new TypeError("fetch failed");
      },
      "upstream_failed",
    ],
  ])("maps %s to a 502 internal envelope", async (_label, upstream, stage) => {
    const { deps, lines } = setup(upstream);

    const res = await handleToday(request(`Bearer ${TOKEN}`), deps);

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "internal" });
    expect(lines).toEqual([`api/today ${stage}`]);
  });

  it("aborts after the timeout and logs only the stage, never the URL", async () => {
    const { deps, lines } = setup(
      () => new Promise<Response>(() => {}), // never answers; the abort signal decides
    );
    deps.fetch = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason));
        }),
    );

    const res = await handleToday(request(`Bearer ${TOKEN}`), deps);

    expect(res.status).toBe(502);
    expect(lines).toEqual(["api/today upstream_timeout"]);
    expect(lines.join()).not.toContain("script.google.com");
  });
});

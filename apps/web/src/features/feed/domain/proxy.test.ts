// covers: spec 0004 AC-8 (bearer parsing, upstream classification, refresh pass through)
import { describe, expect, it } from "vitest";
import fixture from "../../../../../../packages/contract/fixtures/today.json";
import { classifyUpstream, parseBearer, upstreamUrl } from "./proxy";

describe("parseBearer", () => {
  it.each([
    ["Bearer abc", "abc"],
    ["bearer abc", "abc"],
    ["BEARER a b c", "a b c"],
    ["Bearer  abc", " abc"],
  ])("reads %j as %j", (header, token) => {
    expect(parseBearer(header)).toBe(token);
  });

  it.each([null, "", "Bearer", "Bearer ", "Basic abc", "Bearerabc", "Token abc"])(
    "rejects %j",
    (header) => {
      expect(parseBearer(header)).toBeNull();
    },
  );
});

describe("classifyUpstream", () => {
  const json = "application/json; charset=utf-8";

  it("accepts a valid snapshot with a JSON content type", () => {
    expect(classifyUpstream(json, JSON.stringify(fixture))).toEqual({
      kind: "snapshot",
      snapshot: fixture,
    });
  });

  it.each([
    ["Google's HTML page", "text/html", "<html>sign in</html>", "upstream_not_json"],
    ["no content type", null, JSON.stringify(fixture), "upstream_not_json"],
    ["a body that does not parse", json, "{oops", "upstream_not_json"],
    ["bad_key", json, '{"ok":false,"error":"bad_key"}', "upstream_bad_key"],
    ["internal", json, '{"ok":false,"error":"internal"}', "upstream_internal"],
    [
      "a wrong version",
      json,
      JSON.stringify({ ...fixture, contractVersion: 2 }),
      "upstream_invalid",
    ],
  ])("maps %s to an error stage", (_label, type, body, stage) => {
    expect(classifyUpstream(type, body)).toEqual({ kind: "error", stage });
  });
});

describe("upstreamUrl", () => {
  const base = "https://script.google.com/macros/s/abc/exec";

  it("adds the key, and refresh only for the literal 1", () => {
    expect(upstreamUrl(base, "k&y", null)).toBe(`${base}?key=k%26y`);
    expect(upstreamUrl(base, "k", "1")).toBe(`${base}?key=k&refresh=1`);
    expect(upstreamUrl(base, "k", "true")).toBe(`${base}?key=k`);
    expect(upstreamUrl(base, "k", "01")).toBe(`${base}?key=k`);
  });
});

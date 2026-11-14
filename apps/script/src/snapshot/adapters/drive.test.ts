// Regression (spec 0004 task 1 check): on the real runtime the Drive advanced service
// parses a JSON file before returning it, so `alt: "media"` gave back our own content as
// a plain object (logged keys: at,check). asText threw drive_read_unexpected on it.
import { isTodaySnapshot } from "@newsletter/contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../../../../../packages/contract/fixtures/today.json";
import { asText, describeReadShape } from "./drive";

const JSON_TEXT = '{"ok":true}';

describe("asText", () => {
  beforeEach(() =>
    vi.stubGlobal("Utilities", {
      newBlob: (bytes: number[]) => ({
        getDataAsString: () => String.fromCharCode(...bytes),
      }),
    }),
  );
  afterEach(() => vi.unstubAllGlobals());

  it("serializes the parsed object Drive returns back to the exact text the check wrote", () => {
    const written = JSON.stringify({ check: true, at: 1_794_398_400_000 });

    expect(asText(JSON.parse(written))).toBe(written);
  });

  it("round trips a parsed snapshot into text that still passes the contract", () => {
    const parsed: unknown = JSON.parse(JSON.stringify(fixture));

    const text = asText(parsed);

    expect(isTodaySnapshot(JSON.parse(text))).toBe(true);
    expect(text).toBe(JSON.stringify(fixture));
  });

  it("returns a string as is", () => {
    expect(asText(JSON_TEXT)).toBe(JSON_TEXT);
  });

  it("reads a plain array of bytes", () => {
    expect(asText([...JSON_TEXT].map((c) => c.charCodeAt(0)))).toBe(JSON_TEXT);
  });

  it.each([
    ["undefined", undefined, "type=undefined ctor=-"],
    ["null", null, "type=null ctor=-"],
    ["a class instance", new Date(0), "type=object ctor=Date"],
  ])("rejects %s, naming the shape only", (_label, value, shape) => {
    expect(() => asText(value)).toThrow(`drive_read_unexpected ${shape}`);
  });
});

describe("describeReadShape", () => {
  it("never includes the content", () => {
    const shape = describeReadShape({ id: "file1", name: "secret.json" });

    expect(shape).toBe("type=object ctor=Object");
  });
});

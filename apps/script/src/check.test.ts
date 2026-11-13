import { describe, expect, it } from "vitest";
import { canonicalJson, checkPayload } from "./check";

describe("canonicalJson", () => {
  it("gives the same text for the same meaning in a different key order", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, 1], c: null } })).toBe(
      canonicalJson({ a: { c: null, d: [2, 1] }, b: 1 }),
    );
  });

  it("tells changed values and array order apart", () => {
    const base = { at: 1_794_398_400_000, list: [1, 2], s: "" };

    expect(canonicalJson({ ...base, at: "1794398400000" })).not.toBe(canonicalJson(base));
    expect(canonicalJson({ ...base, list: [2, 1] })).not.toBe(canonicalJson(base));
    expect(canonicalJson({ ...base, s: null })).not.toBe(canonicalJson(base));
  });
});

describe("checkPayload", () => {
  it("is JSON carrying the value types a snapshot has, and no mail data", () => {
    const parsed = JSON.parse(checkPayload(1_794_398_400_000));

    expect(parsed.generatedAt).toBe(1_794_398_400_000);
    expect(parsed.items.map((i: { id: string }) => i.id)).toEqual(["19a702", "19a701"]);
    expect(parsed.items[1].subject).toBe("");
    expect(parsed.items[0].listId).toBeNull();
  });
});

describe("Drive read back (regression)", () => {
  // The exact pair logged on the real runtime: same values, Drive's own key order.
  const wrote =
    '{"ok":true,"contractVersion":1,"generatedAt":1794612773046,"items":[{"id":"19a702","subject":"Café ☕ 日本","listId":null,"content":{"kind":"none"}},{"id":"19a701","subject":"","listId":"notes.example.com","receivedAt":1794612773045}]}';
  const got =
    '{"generatedAt":1794612773046,"contractVersion":1,"items":[{"content":{"kind":"none"},"subject":"Café ☕ 日本","id":"19a702","listId":null},{"listId":"notes.example.com","receivedAt":1794612773045,"id":"19a701","subject":""}],"ok":true}';

  it("treats Drive's reordered keys as the same content", () => {
    expect(got).not.toBe(wrote);
    expect(canonicalJson(JSON.parse(got))).toBe(canonicalJson(JSON.parse(wrote)));
  });
});

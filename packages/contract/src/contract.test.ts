import { describe, expect, expectTypeOf, it, vi } from "vitest";
import fixture from "../fixtures/today.json";
import {
  CONTRACT_VERSION,
  isCategoryMap,
  isErrorEnvelope,
  isScriptSettings,
  isTodayResponse,
  isTodaySnapshot,
  normalizeListId,
  normalizeSenderEmail,
  type CategoryMap,
  type ErrorEnvelope,
  type IssueContent,
  type NewsletterIssue,
  type ScriptSettings,
  type TodaySnapshot,
  type TodayResponse,
} from "./index";

function snapshot(): TodaySnapshot {
  // The fixture is wire data, so it must pass validation before acquiring its type.
  const value: unknown = JSON.parse(JSON.stringify(fixture));
  if (!isTodaySnapshot(value)) throw new Error("Invalid shared fixture");
  return value;
}

function issue(changes: Partial<NewsletterIssue> = {}): NewsletterIssue {
  return { ...snapshot().items[0], ...changes };
}

const map: CategoryMap = {
  listIds: { "notes.example.com": "Reading", __proto__: "Technology" },
  senders: { "n.otes+daily@example.com": "Reading" },
};
const settings: ScriptSettings = {
  secretKey: "fixture-secret-not-for-production",
  lastProcessedAt: null,
  archivingEnabled: false,
  snapshotFileId: null,
};

describe("snapshot invariants (AC-1, AC-2, AC-5)", () => {
  it("uses assembly time even when the consumer clock is days later (AC-1, AC-5)", () => {
    const value = snapshot();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(value.generatedAt + 7 * 86_400_000);
      expect(isTodaySnapshot(value)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([0, Number.MAX_SAFE_INTEGER])(
    "accepts a message at the valid assembly timestamp %s (AC-1)",
    (generatedAt) => {
      expect(
        isTodaySnapshot({
          ...snapshot(),
          generatedAt,
          items: [issue({ receivedAt: generatedAt })],
        }),
      ).toBe(true);
    },
  );

  it.each([
    { gmailUrl: "https://example.com/" },
    { content: { kind: "none", text: "private" }, category: "Unsorted" },
    { senderEmail: "invalid" },
  ])("rejects the whole feed when its second issue is malformed: %j (AC-5)", (changes) => {
    const value = snapshot();
    const second = {
      ...issue({ id: "19a702", receivedAt: value.items[0].receivedAt - 1 }),
      ...changes,
    };
    expect(isTodaySnapshot({ ...value, items: [...value.items, second] })).toBe(false);
  });

  it.each([
    { kind: "html" },
    { html: "<p>Read me</p>" },
    { kind: "text" },
    { text: "Read me" },
    { kind: "text", text: "Read me", html: "extra body" },
  ])("rejects incomplete or mixed content %j (AC-2, AC-5)", (content) => {
    expect(isTodaySnapshot({ ...snapshot(), items: [{ ...issue(), content }] })).toBe(false);
  });

  it("accepts an empty successful feed, including epoch zero", () => {
    expect(isTodaySnapshot({ ...snapshot(), generatedAt: 0, items: [] })).toBe(true);
  });

  it("accepts distinct messages sharing a thread and orders ties by code units", () => {
    expect(
      isTodaySnapshot({ ...snapshot(), items: [issue({ id: "a" }), issue({ id: "b" })] }),
    ).toBe(true);
    expect(
      isTodaySnapshot({ ...snapshot(), items: [issue({ id: "b" }), issue({ id: "a" })] }),
    ).toBe(false);
  });

  it.each([
    [-86_400_001, false],
    [-86_400_000, false],
    [-86_399_999, true],
    [0, true],
    [1, false],
  ])("checks receivedAt offset %s against assembly time", (offset, valid) => {
    const value = snapshot();
    value.items[0].receivedAt = value.generatedAt + offset;
    expect(isTodaySnapshot(value)).toBe(valid);
  });

  it("rejects duplicate messages and ascending timestamps", () => {
    const first = issue();
    expect(isTodaySnapshot({ ...snapshot(), items: [first, first] })).toBe(false);
    expect(
      isTodaySnapshot({
        ...snapshot(),
        items: [issue({ id: "a", receivedAt: first.receivedAt - 1 }), first],
      }),
    ).toBe(false);
    expect(
      isTodaySnapshot({
        ...snapshot(),
        items: [first, issue({ id: "a", receivedAt: first.receivedAt - 1 })],
      }),
    ).toBe(true);
  });

  it.each<IssueContent>([
    { kind: "html", html: "<script>untrusted()</script><p>Read me</p>" },
    { kind: "text", text: "Plain body" },
    { kind: "text", text: "" },
  ])("accepts explicit mapped content %j without sanitizing it", (content) => {
    expect(
      isTodaySnapshot({ ...snapshot(), items: [issue({ content, subject: "", listId: null })] }),
    ).toBe(true);
  });

  it("accepts Unsorted metadata with no body", () => {
    expect(
      isTodaySnapshot({
        ...snapshot(),
        items: [issue({ category: "Unsorted", content: { kind: "none" } })],
      }),
    ).toBe(true);
  });

  it.each([
    { category: "Unsorted", content: { kind: "text", text: "private" } },
    { category: "Unsorted", content: { kind: "none", html: "private" } },
    { category: "Unsorted", content: { kind: "none", text: "private" } },
    { category: "Reading", content: { kind: "none" } },
    { content: { kind: "html", html: "" } },
    { content: { kind: "html", html: "body", text: "extra" } },
    { content: { kind: "text", text: 1 } },
    { content: { kind: "unknown" } },
    { content: null },
    { content: [] },
    { category: "All" },
    { category: " Reading" },
    { category: "" },
    { category: "Read\u0000ing" },
    { id: "" },
    { id: "not-hex" },
    { threadId: "z" },
    { gmailUrl: "https://mail.google.com/mail/u/1/#all/19a700" },
    { sender: " " },
    { senderEmail: "NOTES@example.com" },
    { senderEmail: "not-an-address" },
    { listId: "<notes.example.com>" },
    { listId: "Notes.example.com" },
    { receivedAt: -1 },
    { receivedAt: 1.5 },
    { receivedAt: NaN },
    { receivedAt: Infinity },
    { receivedAt: Number.MAX_SAFE_INTEGER + 1 },
    { extra: true },
    { subject: null },
  ])("rejects malformed issue %j", (changes) => {
    expect(isTodaySnapshot({ ...snapshot(), items: [{ ...issue(), ...changes }] })).toBe(false);
  });

  it.each([
    { contractVersion: 0 },
    { contractVersion: CONTRACT_VERSION + 1 },
    { contractVersion: "1" },
    { ok: false },
    { ok: 1 },
    { generatedAt: -1 },
    { generatedAt: 0.5 },
    { generatedAt: Infinity },
    { generatedAt: Number.MAX_SAFE_INTEGER + 1 },
    { items: null },
    { items: {} },
    { items: [null] },
    { extra: "private" },
  ])("rejects malformed snapshot %j", (changes) => {
    expect(isTodaySnapshot({ ...snapshot(), ...changes })).toBe(false);
  });

  it("rejects missing fields at each object boundary and sparse items", () => {
    for (const key of Object.keys(snapshot())) {
      const value = { ...snapshot() } as Record<string, unknown>;
      delete value[key];
      expect(isTodaySnapshot(value)).toBe(false);
    }
    for (const key of Object.keys(issue())) {
      const value = { ...issue() } as Record<string, unknown>;
      delete value[key];
      expect(isTodaySnapshot({ ...snapshot(), items: [value] })).toBe(false);
    }
    expect(isTodaySnapshot({ ...snapshot(), items: new Array(1) })).toBe(false);
    expect(isTodaySnapshot(Object.create(snapshot()))).toBe(false);
  });
});

describe("identity normalization (AC-3, AC-8)", () => {
  it.each([
    ["sender", "\tN.Otes+Daily@Example.COM\n", "n.otes+daily@example.com"],
    ["list", "\tMorning Notes < Weekly.Example.COM >\n", "weekly.example.com"],
    ["sender", "a\u0085@b", null],
    ["list", "a\u0085b", null],
    ["sender", "a\u00a0b@c", null],
    ["list", "a\u00a0b", null],
  ])(
    "handles surrounding whitespace and internal controls for %s %j (AC-3)",
    (kind, raw, expected) => {
      const normalize = kind === "sender" ? normalizeSenderEmail : normalizeListId;
      expect(normalize(raw!)).toBe(expected);
    },
  );

  it("keeps canonical identities unchanged on repeated normalization (AC-3)", () => {
    const sender = normalizeSenderEmail(" Notes+Daily@Example.COM ");
    const list = normalizeListId("News < Weekly.Example.COM >");
    expect(sender).toBe("notes+daily@example.com");
    expect(list).toBe("weekly.example.com");
    expect(normalizeSenderEmail(sender!)).toBe(sender);
    expect(normalizeListId(list!)).toBe(list);
  });

  it.each([
    [" N.Otes+Daily@EXAMPLE.COM ", "n.otes+daily@example.com"],
    ["a@b", "a@b"],
    ["", null],
    ["@example.com", null],
    ["a@", null],
    ["a@@b", null],
    ["a b@c", null],
    ["Name <a@b>", null],
    ["a\u0000@b", null],
  ])("normalizes extracted sender %j", (raw, expected) => {
    expect(normalizeSenderEmail(raw!)).toBe(expected);
  });

  it.each([
    [" Notes.Example.COM ", "notes.example.com"],
    ["Morning Notes < Notes.Example.COM >", "notes.example.com"],
    ["<weekly>", "weekly"],
    ["weekly", "weekly"],
    ["", null],
    ["<>", null],
    ["two words", null],
    ["<one><two>", null],
    ["<<one>>", null],
    ["<one", null],
    ["one>", null],
    ["one\u0000two", null],
  ])("normalizes list identity %j", (raw, expected) => {
    expect(normalizeListId(raw!)).toBe(expected);
  });
});

describe("private category maps and decoded settings (AC-3, AC-4)", () => {
  it("accepts own canonical entries in dictionaries without prototypes (AC-3)", () => {
    const listIds = Object.assign(Object.create(null), {
      constructor: "Science",
      weekly: "Reading",
    });
    const senders = Object.assign(Object.create(null), { "notes@example.com": "Reading" });
    expect(isCategoryMap({ listIds, senders })).toBe(true);
    expect(isCategoryMap(JSON.parse(JSON.stringify({ listIds, senders })))).toBe(true);
  });

  it.each(["__proto__", "constructor", "toString"])(
    "validates own list key %s rather than inheriting or ignoring its value (AC-3)",
    (key) => {
      const listIds = JSON.parse(`{"${key}":"All"}`);
      expect(isCategoryMap({ listIds, senders: {} })).toBe(false);
    },
  );

  it("accepts the maximum safe processing timestamp without changing it (AC-4, AC-7)", () => {
    const value = { ...settings, lastProcessedAt: Number.MAX_SAFE_INTEGER };
    expect(isScriptSettings(value)).toBe(true);
    expect(JSON.parse(JSON.stringify(value))).toEqual(value);
  });

  it("accepts empty dictionaries and configurable case sensitive categories", () => {
    expect(isCategoryMap({ listIds: {}, senders: {} })).toBe(true);
    expect(isCategoryMap(map)).toBe(true);
    expect(isCategoryMap({ listIds: { weekly: "all", daily: "unsorted" }, senders: {} })).toBe(
      true,
    );
    expect(isCategoryMap(JSON.parse('{"listIds":{"__proto__":"Reading"},"senders":{}}'))).toBe(
      true,
    );
  });

  it.each(["All", "Unsorted", "", " Reading", "Reading ", "Read\nIng", 1, null, {}])(
    "rejects category value %j in either dictionary",
    (category) => {
      expect(isCategoryMap({ listIds: { weekly: category }, senders: {} })).toBe(false);
      expect(isCategoryMap({ listIds: {}, senders: { "a@b": category } })).toBe(false);
    },
  );

  it.each([
    { listIds: { Weekly: "Reading" }, senders: {} },
    { listIds: { "<weekly>": "Reading" }, senders: {} },
    { listIds: {}, senders: { "A@b": "Reading" } },
    { listIds: {}, senders: { "not-an-address": "Reading" } },
    { listIds: [], senders: {} },
    { listIds: null, senders: {} },
    { listIds: {}, senders: [] },
    { listIds: {} },
    { senders: {} },
    { listIds: {}, senders: {}, secret: "extra" },
  ])("rejects malformed map %j", (value) => expect(isCategoryMap(value)).toBe(false));

  it("accepts nullable or populated decoded settings", () => {
    expect(isScriptSettings(settings)).toBe(true);
    expect(
      isScriptSettings({
        ...settings,
        lastProcessedAt: 0,
        archivingEnabled: true,
        snapshotFileId: "opaque-file-id",
      }),
    ).toBe(true);
  });

  it.each([
    { secretKey: "" },
    { secretKey: " " },
    { secretKey: null },
    { lastProcessedAt: "123" },
    { lastProcessedAt: -1 },
    { lastProcessedAt: 0.1 },
    { lastProcessedAt: Infinity },
    { lastProcessedAt: Number.MAX_SAFE_INTEGER + 1 },
    { archivingEnabled: "false" },
    { archivingEnabled: 0 },
    { snapshotFileId: "" },
    { snapshotFileId: " " },
    { snapshotFileId: 1 },
    { extra: true },
  ])("rejects malformed decoded settings %j", (changes) => {
    expect(isScriptSettings({ ...settings, ...changes })).toBe(false);
  });

  it("requires all decoded settings, leaving defaults to the adapter", () => {
    for (const key of Object.keys(settings)) {
      const value = { ...settings } as Record<string, unknown>;
      delete value[key];
      expect(isScriptSettings(value)).toBe(false);
    }
  });
});

describe("safe errors (AC-6)", () => {
  it.each(["bad_key", "internal"])("accepts %s", (error) => {
    expect(isErrorEnvelope({ ok: false, error })).toBe(true);
    expect(isTodayResponse({ ok: false, error })).toBe(true);
  });

  it.each([
    { ok: false, error: "unknown" },
    { ok: true, error: "internal" },
    { ok: 0, error: "internal" },
    { ok: false },
    { error: "bad_key" },
    { ok: false, error: "internal", message: "private" },
  ])("rejects malformed errors %j", (value) => {
    expect(isErrorEnvelope(value)).toBe(false);
    expect(isTodayResponse(value)).toBe(false);
  });
});

const validators = [
  isTodaySnapshot,
  isErrorEnvelope,
  isTodayResponse,
  isCategoryMap,
  isScriptSettings,
];

describe("public type guards (AC-5, AC-8)", () => {
  it("narrows unknown values to the published types (AC-8)", () => {
    const value: unknown = snapshot();
    if (isTodaySnapshot(value)) expectTypeOf(value).toEqualTypeOf<TodaySnapshot>();
    if (isTodayResponse(value)) expectTypeOf(value).toEqualTypeOf<TodayResponse>();
    if (isCategoryMap(value)) expectTypeOf(value).toEqualTypeOf<CategoryMap>();
    if (isScriptSettings(value)) expectTypeOf(value).toEqualTypeOf<ScriptSettings>();
    if (isErrorEnvelope(value)) expectTypeOf(value).toEqualTypeOf<ErrorEnvelope>();
    expectTypeOf<typeof CONTRACT_VERSION>().toEqualTypeOf<1>();
    expectTypeOf(normalizeSenderEmail).returns.toEqualTypeOf<string | null>();
    expectTypeOf(normalizeListId).returns.toEqualTypeOf<string | null>();
  });

  it.each([
    ["snapshot", snapshot(), isTodaySnapshot],
    ["category map", map, isCategoryMap],
    ["settings", settings, isScriptSettings],
    ["error", { ok: false, error: "internal" }, isErrorEnvelope],
  ] as const)("rejects inherited required fields in a %s (AC-5)", (_name, value, validate) => {
    expect(validate(Object.create(value))).toBe(false);
  });
});

describe("JSON preservation and unknown input (AC-5, AC-7)", () => {
  it.each([null, undefined, true, false, 0, "", [], [{}]])(
    "rejects nonobjects %j without throwing",
    (value) => {
      for (const validate of validators) expect(validate(value)).toBe(false);
    },
  );

  const variants: TodaySnapshot[] = [
    snapshot(),
    { ...snapshot(), items: [] },
    { ...snapshot(), items: [issue({ content: { kind: "html", html: "<p>Read</p>" } })] },
    { ...snapshot(), items: [issue({ content: { kind: "text", text: "" } })] },
    { ...snapshot(), items: [issue({ category: "Unsorted", content: { kind: "none" } })] },
  ];

  const cases: [string, unknown, (value: unknown) => boolean, boolean][] = [
    ...variants.map((value): [string, unknown, (value: unknown) => boolean, boolean] => [
      "snapshot",
      value,
      isTodaySnapshot,
      true,
    ]),
    ["map", map, isCategoryMap, true],
    ["empty map", { listIds: {}, senders: {} }, isCategoryMap, true],
    ["settings", settings, isScriptSettings, true],
    [
      "populated settings",
      { ...settings, lastProcessedAt: 123, snapshotFileId: "file", archivingEnabled: true },
      isScriptSettings,
      true,
    ],
    ["bad key", { ok: false, error: "bad_key" }, isErrorEnvelope, true],
    ["internal", { ok: false, error: "internal" }, isErrorEnvelope, true],
    ["invalid snapshot", { ...snapshot(), contractVersion: 0 }, isTodaySnapshot, false],
    ["invalid map", { listIds: { weekly: "All" }, senders: {} }, isCategoryMap, false],
    ["invalid settings", { ...settings, archivingEnabled: "false" }, isScriptSettings, false],
    ["invalid error", { ok: false, error: "internal", body: "secret" }, isErrorEnvelope, false],
  ];

  it.each(cases)("round trips %s without mutation", (_name, value, validate, valid) => {
    const json = JSON.stringify(value);
    const decoded: unknown = JSON.parse(json);
    expect(decoded).toEqual(value);
    const freeze = (input: unknown): void => {
      if (input !== null && typeof input === "object") {
        Object.values(input).forEach(freeze);
        Object.freeze(input);
      }
    };
    freeze(value);
    freeze(decoded);
    expect(validate(value)).toBe(valid);
    expect(validate(decoded)).toBe(valid);
    expect(JSON.stringify(value)).toBe(json);
    expect(JSON.stringify(decoded)).toBe(json);
  });
});

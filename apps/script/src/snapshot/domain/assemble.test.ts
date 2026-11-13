import { isTodaySnapshot } from "@newsletter/contract";
import { describe, expect, it } from "vitest";
import { fakeMessage } from "../../testing/fakes";
import {
  allUnsorted,
  assembleSnapshot,
  DAY_MS,
  MAX_SNAPSHOT_BYTES,
  serializeSnapshot,
  SnapshotError,
  utf8ByteLength,
} from "./assemble";

const NOW = 1_794_398_400_000;

describe("assembleSnapshot", () => {
  it("builds an all Unsorted snapshot without reading any body", () => {
    const message = fakeMessage({
      id: "a1",
      threadId: "a0",
      receivedAt: NOW - 1000,
      headers: { "List-Id": "Notes <notes.example.com>" },
      html: "<p>secret body</p>",
    });

    const { snapshot } = assembleSnapshot([message], NOW, allUnsorted);

    expect(isTodaySnapshot(snapshot)).toBe(true);
    expect(snapshot.items).toEqual([
      {
        id: "a1",
        threadId: "a0",
        sender: "Morning Notes",
        senderEmail: "notes@example.com",
        listId: "notes.example.com",
        subject: "A quieter morning",
        receivedAt: NOW - 1000,
        category: "Unsorted",
        content: { kind: "none" },
        gmailUrl: "https://mail.google.com/mail/u/0/#all/a0",
      },
    ]);
    expect(message.bodyReads).toBe(0);
  });

  it("uses the HTML body for a mapped item, falling back to plain text", () => {
    const toReading = () => "Reading";
    const html = fakeMessage({ id: "b1", receivedAt: NOW - 2, html: "<p>hi</p>" });
    const text = fakeMessage({ id: "b2", receivedAt: NOW - 1, plain: "hi" });

    const { snapshot } = assembleSnapshot([html, text], NOW, toReading);

    expect(snapshot.items.map((i) => i.content)).toEqual([
      { kind: "text", text: "hi" },
      { kind: "html", html: "<p>hi</p>" },
    ]);
  });

  it("keeps only newsletters inside (generatedAt − 24h, generatedAt], not in trash", () => {
    const keep = fakeMessage({ id: "c1", receivedAt: NOW - DAY_MS + 1 });
    const atEdge = fakeMessage({ id: "c2", receivedAt: NOW - DAY_MS });
    const future = fakeMessage({ id: "c3", receivedAt: NOW + 1 });
    const trashed = fakeMessage({ id: "c4", receivedAt: NOW - 5, inTrash: true });
    const notNewsletter = fakeMessage({
      id: "c5",
      receivedAt: NOW - 5,
      headers: { "List-Unsubscribe": "   " },
    });

    const { snapshot } = assembleSnapshot(
      [keep, atEdge, future, trashed, notNewsletter],
      NOW,
      allUnsorted,
    );

    expect(snapshot.items.map((i) => i.id)).toEqual(["c1"]);
  });

  it("skips and counts an unparseable sender", () => {
    const bad = fakeMessage({ id: "d1", receivedAt: NOW - 5, headers: { From: "nobody" } });
    const good = fakeMessage({ id: "d2", receivedAt: NOW - 5 });

    const result = assembleSnapshot([bad, good], NOW, allUnsorted);

    expect(result.unparseableSenders).toBe(1);
    expect(result.snapshot.items.map((i) => i.id)).toEqual(["d2"]);
  });

  it("deduplicates by ID and sorts newest first, then by ID", () => {
    const messages = [
      fakeMessage({ id: "e2", receivedAt: NOW - 10 }),
      fakeMessage({ id: "e1", receivedAt: NOW - 10 }),
      fakeMessage({ id: "e3", receivedAt: NOW - 5 }),
      fakeMessage({ id: "e1", receivedAt: NOW - 10 }),
    ];

    const { snapshot } = assembleSnapshot(messages, NOW, allUnsorted);

    expect(snapshot.items.map((i) => i.id)).toEqual(["e3", "e1", "e2"]);
  });

  it("returns an empty, valid snapshot when nothing qualifies", () => {
    const { snapshot } = assembleSnapshot([], NOW, allUnsorted);

    expect(snapshot).toEqual({ ok: true, contractVersion: 1, generatedAt: NOW, items: [] });
  });

  it("fails as snapshot_invalid when an item breaks the contract", () => {
    const badId = fakeMessage({ id: "not-hex!", receivedAt: NOW - 5 });

    expect(() => assembleSnapshot([badId], NOW, allUnsorted)).toThrow(
      new SnapshotError("snapshot_invalid"),
    );
  });
});

describe("serializeSnapshot", () => {
  it("returns the JSON and its UTF-8 byte size", () => {
    const snapshot = {
      ok: true as const,
      contractVersion: 1 as const,
      generatedAt: NOW,
      items: [],
    };

    const { json, bytes } = serializeSnapshot(snapshot);

    expect(JSON.parse(json)).toEqual(snapshot);
    expect(bytes).toBe(json.length); // ASCII only, so one byte per character
  });

  it("fails with snapshot_too_large over 4MB instead of cutting the snapshot short", () => {
    const html = "x".repeat(MAX_SNAPSHOT_BYTES);
    const { snapshot } = assembleSnapshot(
      [fakeMessage({ id: "f1", receivedAt: NOW - 1, html })],
      NOW,
      () => "Reading",
    );

    expect(() => serializeSnapshot(snapshot)).toThrow(new SnapshotError("snapshot_too_large"));
  });
});

describe("utf8ByteLength", () => {
  it.each([
    ["plain", 5],
    ["café", 5],
    ["日本語", 9],
    ["emoji 🐦", 10],
    ["", 0],
  ])("counts %j as %i bytes", (text, bytes) => {
    expect(utf8ByteLength(text)).toBe(bytes);
  });
});

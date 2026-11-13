import { describe, expect, it } from "vitest";
import fixture from "../../../../../packages/contract/fixtures/today.json";
import { fakeProps, fakeStore } from "../../testing/fakes";
import { digestsEqual, serveToday, type ServeDeps } from "./serve";

const KEY = "correct horse battery staple";

function setup(props: Record<string, string> = { SCRIPT_KEY: KEY }) {
  const store = fakeStore();
  const fileId = store.createFile("folder", "today.json", JSON.stringify(fixture));
  const lines: string[] = [];
  const deps: ServeDeps = {
    props: fakeProps({ snapshotFileId: fileId, ...props }),
    store,
    // A stand in digest: the real one is SHA-256 in the adapter; equality is what matters here.
    digest: (value) => [...value].map((c) => c.charCodeAt(0)),
    log: (line) => lines.push(line),
  };
  return { deps, store, lines };
}

describe("serveToday", () => {
  it("returns the current snapshot for the correct key", () => {
    const { deps } = setup();

    expect(serveToday(KEY, deps)).toEqual(fixture);
  });

  it.each([
    ["missing", undefined],
    ["wrong", "wrong key"],
    ["longer", `${KEY}x`],
    ["empty", ""],
  ])("returns bad_key for a %s key", (_label, key) => {
    const { deps } = setup();

    expect(serveToday(key, deps)).toEqual({ ok: false, error: "bad_key" });
  });

  it("returns internal when SCRIPT_KEY is not configured", () => {
    const { deps } = setup({});

    expect(serveToday(KEY, deps)).toEqual({ ok: false, error: "internal" });
  });

  it("returns internal when there is no pointer", () => {
    const { deps } = setup({ SCRIPT_KEY: KEY, snapshotFileId: "" });
    deps.props.get = (name) => (name === "SCRIPT_KEY" ? KEY : null);

    expect(serveToday(KEY, deps)).toEqual({ ok: false, error: "internal" });
  });

  it("returns internal for an unreadable, unparseable, or invalid file", () => {
    const missing = setup({ SCRIPT_KEY: KEY, snapshotFileId: "gone" });
    expect(serveToday(KEY, missing.deps)).toEqual({ ok: false, error: "internal" });

    const corrupt = setup();
    corrupt.store.corruptReads = true;
    expect(serveToday(KEY, corrupt.deps)).toEqual({ ok: false, error: "internal" });

    const invalid = setup();
    const id = invalid.store.createFile("folder", "x.json", JSON.stringify({ ok: true }));
    invalid.deps.props.set("snapshotFileId", id);
    expect(serveToday(KEY, invalid.deps)).toEqual({ ok: false, error: "internal" });
  });

  it("never logs the key", () => {
    const { deps, lines } = setup();
    serveToday(KEY, deps);
    serveToday("wrong key", deps);

    expect(lines.join("\n")).not.toMatch(/horse|wrong key/);
  });
});

describe("digestsEqual", () => {
  it("compares every byte, including length differences", () => {
    expect(digestsEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(digestsEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(digestsEqual([1, 2, 3], [1, 2])).toBe(false);
    expect(digestsEqual([], [])).toBe(true);
  });
});

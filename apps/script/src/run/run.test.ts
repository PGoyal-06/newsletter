import { isTodaySnapshot } from "@newsletter/contract";
import { describe, expect, it } from "vitest";
import { MAX_SNAPSHOT_BYTES } from "../snapshot/domain/assemble";
import { fakeMessage, fakeProps, fakeStore } from "../testing/fakes";
import { runThin, THIN_QUERY, type RunDeps } from "./run";

const NOW = 1_794_398_400_000;

function setup(messages = [fakeMessage({ id: "a1", receivedAt: NOW - 60_000 })]) {
  const store = fakeStore();
  const props = fakeProps();
  const lines: string[] = [];
  const queries: string[] = [];
  const deps: RunDeps = {
    now: () => NOW,
    search: (query) => {
      queries.push(query);
      return messages;
    },
    store,
    props,
    log: (line) => lines.push(line),
  };
  return { deps, store, props, lines, queries };
}

describe("runThin", () => {
  it("publishes an all Unsorted snapshot and points snapshotFileId at it", () => {
    const { deps, store, props, queries } = setup();

    const result = runThin(deps);

    expect(result.outcome).toBe("success");
    expect(queries).toEqual([THIN_QUERY]);
    const fileId = props.values.snapshotFileId!;
    const file = store.files.get(fileId)!;
    expect(file.name).toBe(`today-${NOW}.json`);
    expect(file.parent).toBe(props.values.snapshotFolderId);
    const published: unknown = JSON.parse(file.content);
    expect(isTodaySnapshot(published)).toBe(true);
    expect(published).toMatchObject({ items: [{ id: "a1", category: "Unsorted" }] });
  });

  it("reuses the stored folder and recreates it when it is gone", () => {
    const { deps, store, props } = setup();
    runThin(deps);
    const first = props.values.snapshotFolderId;
    runThin(deps);
    expect(props.values.snapshotFolderId).toBe(first);

    store.folders.clear();
    runThin(deps);

    expect(props.values.snapshotFolderId).not.toBe(first);
  });

  it("publishes an empty snapshot when no new mail arrived", () => {
    const { deps, props, store } = setup([]);

    expect(runThin(deps).outcome).toBe("success");
    expect(JSON.parse(store.files.get(props.values.snapshotFileId!)!.content).items).toEqual([]);
  });

  it("logs size and duration but no subjects, addresses, or IDs", () => {
    const { deps, lines } = setup([
      fakeMessage({ id: "a1", receivedAt: NOW - 1, subject: "Secret subject" }),
    ]);

    runThin(deps);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/outcome=success .*items=1 .*bytes=\d+ ms=\d+/);
    expect(lines[0]).not.toMatch(/Secret|example\.com|a1|file\d|folder\d/);
  });

  it("leaves the pointer unchanged when the read back is invalid", () => {
    const { deps, store, props } = setup();
    props.values.snapshotFileId = "old";
    store.corruptReads = true;

    expect(runThin(deps).outcome).toBe("readback_invalid");
    expect(props.values.snapshotFileId).toBe("old");
  });

  it("fails with snapshot_too_large and publishes nothing", () => {
    // The thin run is all Unsorted (no bodies), so a huge subject pushes it over the cap.
    const { deps, store } = setup([
      fakeMessage({ id: "a1", receivedAt: NOW - 1, subject: "x".repeat(MAX_SNAPSHOT_BYTES) }),
    ]);

    expect(runThin(deps).outcome).toBe("snapshot_too_large");
    expect(store.files.size).toBe(0);
  });

  it("reports a Gmail failure as run_failed", () => {
    const { deps } = setup();
    deps.search = () => {
      throw new Error("Service invoked too many times");
    };

    expect(runThin(deps).outcome).toBe("run_failed");
  });
});

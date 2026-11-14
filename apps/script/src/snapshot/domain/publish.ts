import { isTodaySnapshot } from "@newsletter/contract";
import { PROPERTY, SNAPSHOT_FOLDER_NAME, type PropertyStore, type SnapshotStore } from "./store";

export class PublishError extends Error {
  constructor(readonly stage: "readback_invalid") {
    super(stage);
    this.name = "PublishError";
  }
}

/** Reuse the stored snapshot folder, or create one when it is missing or trashed. */
export function ensureFolder(store: SnapshotStore, props: PropertyStore): string {
  const stored = props.get(PROPERTY.snapshotFolderId);
  if (stored !== null && store.folderUsable(stored)) return stored;
  const created = store.createFolder(SNAPSHOT_FOLDER_NAME);
  props.set(PROPERTY.snapshotFolderId, created);
  return created;
}

/**
 * Thin publish (spec 0004 task 1): write a new file, read it back, validate it, then
 * point `snapshotFileId` at it. Task 3 adds the previous pointer, reconcile, and cleanup.
 * A failure before the pointer write leaves the pointer unchanged.
 */
export function publishSnapshot(
  store: SnapshotStore,
  props: PropertyStore,
  json: string,
  generatedAt: number,
): string {
  const folderId = ensureFolder(store, props);
  const fileId = store.createFile(folderId, `today-${generatedAt}.json`, json);

  let readBack: unknown;
  try {
    readBack = JSON.parse(store.readFile(fileId));
  } catch {
    throw new PublishError("readback_invalid");
  }
  if (!isTodaySnapshot(readBack) || readBack.generatedAt !== generatedAt) {
    throw new PublishError("readback_invalid");
  }

  props.set(PROPERTY.snapshotFileId, fileId);
  return fileId;
}

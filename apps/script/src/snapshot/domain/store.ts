/** Drive operations the domain needs. The Drive advanced service adapter implements it. */
export interface SnapshotStore {
  /** True when the folder exists and is not trashed. */
  folderUsable(folderId: string): boolean;
  /** Create the snapshot folder and return its ID. */
  createFolder(name: string): string;
  /** Create a JSON file in the folder and return its ID. */
  createFile(folderId: string, name: string, json: string): string;
  /** Read a file's content as text. */
  readFile(fileId: string): string;
}

/** Script Properties the worker reads and writes. */
export interface PropertyStore {
  get(name: string): string | null;
  set(name: string, value: string): void;
}

export const SNAPSHOT_FOLDER_NAME = "Morning Feed snapshots";

export const PROPERTY = {
  scriptKey: "SCRIPT_KEY",
  snapshotFileId: "snapshotFileId",
  snapshotFolderId: "snapshotFolderId",
} as const;

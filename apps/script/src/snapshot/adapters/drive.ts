import type { SnapshotStore } from "../domain/store";

// Drive through the advanced service (v3) only, never DriveApp, so the pinned
// drive.file scope is enough (spec 0004, "Drive access").

const FOLDER_MIME = "application/vnd.google-apps.folder";

function drive(): GoogleAppsScript.Drive {
  if (!Drive) throw new Error("drive_service_disabled");
  return Drive;
}

/**
 * The shape of a Drive read result, for diagnosis only: the type and constructor name.
 * Never the content.
 */
export function describeReadShape(content: unknown): string {
  const kind = content === null ? "null" : Array.isArray(content) ? "array" : typeof content;
  const ctor =
    typeof content === "object" && content !== null
      ? (Object.getPrototypeOf(content)?.constructor?.name ?? "none")
      : "-";
  return `type=${kind} ctor=${ctor}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * `alt: "media"` content as text. The advanced service parses a JSON file before it
 * returns it (seen on the real runtime: our own fields came back as an object), so a
 * plain object is our content and is serialized back. Snapshot files are always JSON
 * objects; callers parse and validate the text either way.
 */
export function asText(content: unknown): string {
  if (typeof content === "string") return content;
  if (isPlainObject(content)) return JSON.stringify(content);
  if (Array.isArray(content)) {
    return Utilities.newBlob(content as number[]).getDataAsString("UTF-8");
  }
  throw new Error(`drive_read_unexpected ${describeReadShape(content)}`);
}

export const driveSnapshotStore: SnapshotStore = {
  folderUsable(folderId) {
    try {
      const file = drive().Files.get(folderId, { fields: "id,trashed,mimeType" });
      return file.trashed !== true && file.mimeType === FOLDER_MIME;
    } catch {
      return false;
    }
  },

  createFolder(name) {
    // v3 returns `id` in its default fields, so no media and no options are needed.
    const folder = drive().Files.create({ name, mimeType: FOLDER_MIME });
    if (!folder.id) throw new Error("drive_create_folder_failed");
    return folder.id;
  },

  createFile(folderId, name, json) {
    const blob = Utilities.newBlob(json, "application/json", name);
    const file = drive().Files.create(
      { name, parents: [folderId], mimeType: "application/json" },
      blob,
      { fields: "id" },
    );
    if (!file.id) throw new Error("drive_create_file_failed");
    return file.id;
  },

  readFile(fileId) {
    return asText(drive().Files.get(fileId, { alt: "media" }));
  },
};

/** Extra calls only the Drive access check needs (list and permanent delete). */
export const driveCheckOps = {
  listChildren(folderId: string): string[] {
    const list = drive().Files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id)",
      pageSize: 100,
    });
    return (list.files ?? []).map((f) => f.id ?? "");
  },
  remove(fileId: string): void {
    drive().Files.remove(fileId);
  },
};

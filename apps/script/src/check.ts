import { countThreads } from "./mail/adapters/gmail";
import { driveCheckOps, driveSnapshotStore } from "./snapshot/adapters/drive";

/**
 * Editor only check for spec 0004 task 1. Proves the Drive advanced service can create a
 * folder, create a file, read it back, list the folder, and delete, under the pinned
 * drive.file scope. Then reports how many threads `label:Newsletters` matches, so you
 * can tell whether parent label search also matches a thread carrying only a sublabel.
 * Writes nothing to Gmail and logs no subjects or addresses.
 */
/** JSON text with object keys sorted at every level, so equal meaning gives equal text. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * A synthetic file shaped like a snapshot: the value types a real one carries (a large
 * epoch ms number, nested objects, an ordered array, unicode, an empty string, null).
 * No mail data, so logging it on a mismatch is safe.
 */
export function checkPayload(at: number): string {
  return JSON.stringify({
    ok: true,
    contractVersion: 1,
    generatedAt: at,
    items: [
      { id: "19a702", subject: "Café ☕ 日本", listId: null, content: { kind: "none" } },
      { id: "19a701", subject: "", listId: "notes.example.com", receivedAt: at - 1 },
    ],
  });
}

export function checkDriveAccess(): void {
  const steps: string[] = [];
  const step = (name: string, run: () => void) => {
    try {
      run();
      steps.push(`${name}=ok`);
    } catch (error) {
      steps.push(`${name}=FAILED`);
      console.log(`checkDriveAccess ${steps.join(" ")}`);
      throw error;
    }
  };

  let folderId = "";
  let fileId = "";
  const json = checkPayload(Date.now());

  step("create_folder", () => {
    folderId = driveSnapshotStore.createFolder("Morning Feed access check");
  });
  step("create_file", () => {
    fileId = driveSnapshotStore.createFile(folderId, "check.json", json);
  });
  step("read_file", () => {
    // Compare by meaning, not exact text: the advanced service parses JSON and returns it
    // with its own key order (seen on the real runtime; every value survived).
    const text = driveSnapshotStore.readFile(fileId);
    if (canonicalJson(JSON.parse(text)) !== canonicalJson(JSON.parse(json))) {
      throw new Error("read_back_mismatch");
    }
  });
  step("list_folder", () => {
    if (!driveCheckOps.listChildren(folderId).includes(fileId)) throw new Error("list_missing");
  });
  step("delete_file", () => driveCheckOps.remove(fileId));
  step("delete_folder", () => driveCheckOps.remove(folderId));

  console.log(`checkDriveAccess ${steps.join(" ")}`);
  console.log(`checkDriveAccess label:Newsletters threads=${countThreads("label:Newsletters")}`);
}

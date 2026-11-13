import { driveSnapshotStore } from "./snapshot/adapters/drive";
import { scriptProperties } from "./settings/adapters/properties";
import { serveToday } from "./serve/domain/serve";

function sha256(value: string): number[] {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
}

/** Web app entry: `?key=…` returns today's snapshot or an error envelope as JSON. */
export function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput {
  const key = e?.parameter?.key;
  const response = serveToday(typeof key === "string" ? key : undefined, {
    props: scriptProperties,
    store: driveSnapshotStore,
    digest: sha256,
    log: (line) => console.log(line),
  });
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

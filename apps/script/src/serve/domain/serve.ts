import { isTodaySnapshot, type TodayResponse } from "@newsletter/contract";
import { PROPERTY, type PropertyStore, type SnapshotStore } from "../../snapshot/domain/store";

export interface ServeDeps {
  props: PropertyStore;
  store: SnapshotStore;
  /** SHA-256 digest of a string, as bytes. */
  digest(value: string): readonly number[];
  log(line: string): void;
}

/** Compare two digests over every byte, so the time does not depend on where they differ. */
export function digestsEqual(a: readonly number[], b: readonly number[]): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/**
 * `doGet` logic (spec 0004 AC-7, thin): a missing or wrong key gives `bad_key`; a
 * missing secret, missing pointer, or unreadable or invalid file gives `internal`.
 * `refresh` is ignored until task 3.
 */
export function serveToday(key: string | undefined, deps: ServeDeps): TodayResponse {
  const secret = deps.props.get(PROPERTY.scriptKey);
  if (secret === null || secret.length === 0) {
    deps.log("doGet outcome=internal stage=missing_script_key");
    return { ok: false, error: "internal" };
  }
  // Digest both sides even when the key is missing, so every request costs the same.
  const matches = digestsEqual(deps.digest(key ?? ""), deps.digest(secret));
  if (key === undefined || !matches) {
    deps.log("doGet outcome=bad_key");
    return { ok: false, error: "bad_key" };
  }

  const fileId = deps.props.get(PROPERTY.snapshotFileId);
  if (fileId === null) {
    deps.log("doGet outcome=internal stage=no_pointer");
    return { ok: false, error: "internal" };
  }
  try {
    const parsed: unknown = JSON.parse(deps.store.readFile(fileId));
    if (isTodaySnapshot(parsed)) {
      deps.log("doGet outcome=success");
      return parsed;
    }
    deps.log("doGet outcome=internal stage=snapshot_invalid");
  } catch {
    deps.log("doGet outcome=internal stage=snapshot_unreadable");
  }
  return { ok: false, error: "internal" };
}

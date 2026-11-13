import { get, set } from "idb-keyval";

const KEY = "appToken";

/** The stored token, or null. Throws if IndexedDB is unavailable. */
export async function readToken(): Promise<string | null> {
  const value: unknown = await get(KEY);
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Store the token. Throws if IndexedDB refuses the write. */
export async function saveToken(token: string): Promise<void> {
  await set(KEY, token);
}

/** Ask the browser to keep this origin's storage. Refusal or absence breaks nothing. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Best effort only.
  }
}

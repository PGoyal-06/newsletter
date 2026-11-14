// The only place that reads process.env (AGENTS.md). Server only: never import this from
// a "use client" file. Validated twice: by next.config.ts, so a bad value fails the build
// (and the Vercel deploy), and by src/instrumentation.ts when the server starts.

function readFlag(name: string, raw: string | undefined): boolean {
  if (raw === undefined || raw === "" || raw === "0") return false;
  if (raw === "1") return true;
  throw new Error(`${name} must be "1" or "0" (or unset), got "${raw}".`);
}

/**
 * A required secret, trimmed: the phone trims a pasted key, so a stray newline in a
 * dashboard value must not make every key fail. The error names the variable, never
 * the value.
 */
function readSecret(name: string, raw: string | undefined): string {
  const value = raw?.trim() ?? "";
  if (value === "") throw new Error(`${name} is required.`);
  return value;
}

function readHttpsUrl(name: string, raw: string | undefined): string {
  const value = readSecret(name, raw);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an https URL.`);
  }
  if (url.protocol !== "https:") throw new Error(`${name} must be an https URL.`);
  return value;
}

export const env = {
  /** Turns on the /dev/ui component gallery. Never set this on Vercel. */
  enableUiGallery: readFlag("ENABLE_UI_GALLERY", process.env.ENABLE_UI_GALLERY),
  /** The phone's bearer token for /api/today. */
  appToken: readSecret("APP_TOKEN", process.env.APP_TOKEN),
  /** The worker's /exec URL. */
  scriptUrl: readHttpsUrl("SCRIPT_URL", process.env.SCRIPT_URL),
  /** The worker's `key` parameter. */
  scriptKey: readSecret("SCRIPT_KEY", process.env.SCRIPT_KEY),
} as const;

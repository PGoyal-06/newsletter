// The only place that reads process.env (AGENTS.md). Server only: never import this from
// a "use client" file. Validated when the server starts (see src/instrumentation.ts).

function readFlag(name: string, raw: string | undefined): boolean {
  if (raw === undefined || raw === "" || raw === "0") return false;
  if (raw === "1") return true;
  throw new Error(`${name} must be "1" or "0" (or unset), got "${raw}".`);
}

export const env = {
  /** Turns on the /dev/ui component gallery. Never set this on Vercel. */
  enableUiGallery: readFlag("ENABLE_UI_GALLERY", process.env.ENABLE_UI_GALLERY),
} as const;

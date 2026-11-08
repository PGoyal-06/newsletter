// Shared data contract between the Apps Script worker and the web app.
// Source only: no build step, no runtime dependencies, safe in Apps Script and the browser.
// The real shapes (today.json snapshot, error envelope, category map, script settings)
// are decided in spec 0002 (data contract). Until then this only carries the version.

/** Bump on any breaking shape change. The web app uses it as the TanStack Query persister `buster`. */
export const CONTRACT_VERSION = 0;

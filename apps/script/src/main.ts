// The only file that touches Apps Script globals. Apps Script has no modules, so every
// entry point must be assigned to globalThis or the bundle silently drops it.
// When you add an entry point, also add its name to ENTRY_POINTS in scripts/build.mjs.
import { checkDriveAccess } from "./check";
import { doGet } from "./web";
import { installTriggers, onTimer } from "./triggers";

const g = globalThis as Record<string, unknown>;
g.doGet = doGet;
g.onTimer = onTimer;
g.installTriggers = installTriggers;
g.checkDriveAccess = checkDriveAccess;

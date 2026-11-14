import { searchMessages } from "./mail/adapters/gmail";
import { runThin } from "./run/run";
import { driveSnapshotStore } from "./snapshot/adapters/drive";
import { scriptProperties } from "./settings/adapters/properties";

export const TIMER_HANDLER = "onTimer";

/**
 * Time driven trigger entry, every 15 minutes. Any outcome other than success throws
 * after logging, so Google's failure email fires (spec 0004 AC-6).
 */
export function onTimer(_e?: GoogleAppsScript.Events.TimeDriven): void {
  const result = runThin({
    now: () => Date.now(),
    search: searchMessages,
    store: driveSnapshotStore,
    props: scriptProperties,
    log: (line) => console.log(line),
  });
  if (result.outcome !== "success") throw new Error(`onTimer failed: ${result.outcome}`);
}

/**
 * Run once from the Apps Script editor. Idempotent: removes any trigger already
 * pointing at the handler, then creates the single 15 minute one.
 */
export function installTriggers(): void {
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === TIMER_HANDLER) {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  ScriptApp.newTrigger(TIMER_HANDLER).timeBased().everyMinutes(15).create();
  console.log(`installTriggers: ${TIMER_HANDLER} runs every 15 minutes`);
}

export const TIMER_HANDLER = "onTimer";

/**
 * Time driven trigger entry, every 15 minutes.
 * Scaffold placeholder: the core loop feature adds the lock, the Gmail search, and the snapshot write.
 */
export function onTimer(_e?: GoogleAppsScript.Events.TimeDriven): void {
  console.log("onTimer: scaffold run, nothing to do yet");
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

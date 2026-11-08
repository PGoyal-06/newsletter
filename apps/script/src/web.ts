import { CONTRACT_VERSION } from "@newsletter/contract";

/**
 * Web app entry. Scaffold placeholder: returns no mail data.
 * The core loop feature adds the key check and serves today's snapshot.
 */
export function doGet(_e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "scaffold", contractVersion: CONTRACT_VERSION }),
  ).setMimeType(ContentService.MimeType.JSON);
}

import {
  CONTRACT_VERSION,
  type CategoryMap,
  type ErrorEnvelope,
  type NewsletterIssue,
  type ScriptSettings,
  type TodayResponse,
  type TodaySnapshot,
} from "./index";
import { normalizeListId, normalizeSenderEmail } from "./normalization";

type Dictionary = Record<string, unknown>;

function isObject(value: unknown): value is Dictionary {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasFields(value: Dictionary, fields: readonly string[]): boolean {
  return (
    Object.keys(value).length === fields.length &&
    fields.every((field) => Object.prototype.hasOwnProperty.call(value, field))
  );
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCategory(value: unknown): value is string {
  return (
    isNonemptyString(value) && value === value.trim() && !/\p{Cc}/u.test(value) && value !== "All"
  );
}

function isIssue(value: unknown): value is NewsletterIssue {
  if (
    !isObject(value) ||
    !hasFields(value, [
      "id",
      "threadId",
      "sender",
      "senderEmail",
      "listId",
      "subject",
      "receivedAt",
      "category",
      "content",
      "gmailUrl",
    ])
  )
    return false;

  const {
    id,
    threadId,
    sender,
    senderEmail,
    listId,
    subject,
    receivedAt,
    category,
    content,
    gmailUrl,
  } = value;
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]+$/iu.test(id) ||
    typeof threadId !== "string" ||
    !/^[0-9a-f]+$/iu.test(threadId) ||
    !isNonemptyString(sender) ||
    typeof senderEmail !== "string" ||
    normalizeSenderEmail(senderEmail) !== senderEmail ||
    (listId !== null && (typeof listId !== "string" || normalizeListId(listId) !== listId)) ||
    typeof subject !== "string" ||
    !isTimestamp(receivedAt) ||
    !isCategory(category) ||
    gmailUrl !== `https://mail.google.com/mail/u/0/#all/${threadId}` ||
    !isObject(content)
  )
    return false;

  if (category === "Unsorted") return content.kind === "none" && hasFields(content, ["kind"]);
  return (
    (content.kind === "html" &&
      hasFields(content, ["kind", "html"]) &&
      typeof content.html === "string" &&
      content.html.length > 0) ||
    (content.kind === "text" &&
      hasFields(content, ["kind", "text"]) &&
      typeof content.text === "string")
  );
}

/** Validate the whole snapshot using its assembly time, without consulting a clock. */
export function isTodaySnapshot(value: unknown): value is TodaySnapshot {
  if (
    !isObject(value) ||
    !hasFields(value, ["ok", "contractVersion", "generatedAt", "items"]) ||
    value.ok !== true ||
    value.contractVersion !== CONTRACT_VERSION ||
    !isTimestamp(value.generatedAt) ||
    !Array.isArray(value.items)
  )
    return false;

  const ids = new Set<string>();
  let previous: NewsletterIssue | undefined;
  for (const item of value.items) {
    if (
      !isIssue(item) ||
      ids.has(item.id) ||
      item.receivedAt <= value.generatedAt - 86_400_000 ||
      item.receivedAt > value.generatedAt ||
      (previous &&
        (item.receivedAt > previous.receivedAt ||
          (item.receivedAt === previous.receivedAt && item.id <= previous.id)))
    )
      return false;
    ids.add(item.id);
    previous = item;
  }
  return true;
}

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return (
    isObject(value) &&
    hasFields(value, ["ok", "error"]) &&
    value.ok === false &&
    (value.error === "bad_key" || value.error === "internal")
  );
}

export function isTodayResponse(value: unknown): value is TodayResponse {
  return isTodaySnapshot(value) || isErrorEnvelope(value);
}

function isCategoryDictionary(
  value: unknown,
  normalize: (value: string) => string | null,
): boolean {
  return (
    isObject(value) &&
    Object.entries(value).every(
      ([key, category]) =>
        normalize(key) === key && isCategory(category) && category !== "Unsorted",
    )
  );
}

export function isCategoryMap(value: unknown): value is CategoryMap {
  return (
    isObject(value) &&
    hasFields(value, ["listIds", "senders"]) &&
    isCategoryDictionary(value.listIds, normalizeListId) &&
    isCategoryDictionary(value.senders, normalizeSenderEmail)
  );
}

/** Accept decoded private settings. Property string decoding belongs to the adapter. */
export function isScriptSettings(value: unknown): value is ScriptSettings {
  return (
    isObject(value) &&
    hasFields(value, ["secretKey", "lastProcessedAt", "archivingEnabled", "snapshotFileId"]) &&
    isNonemptyString(value.secretKey) &&
    (value.lastProcessedAt === null || isTimestamp(value.lastProcessedAt)) &&
    typeof value.archivingEnabled === "boolean" &&
    (value.snapshotFileId === null || isNonemptyString(value.snapshotFileId))
  );
}

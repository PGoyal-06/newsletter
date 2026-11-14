import {
  CONTRACT_VERSION,
  isTodaySnapshot,
  normalizeListId,
  type IssueContent,
  type NewsletterIssue,
  type TodaySnapshot,
} from "@newsletter/contract";
import { isNewsletter, type MailMessage } from "../../mail/domain/message";
import { parseFrom } from "../../mail/domain/sender";

export const DAY_MS = 86_400_000;
export const UNSORTED = "Unsorted";

/** Resolves a message's category from its normalized List-Id and sender address. */
export type CategoryResolver = (listId: string | null, senderEmail: string) => string;

/** The thin thread has no category map yet, so every issue is Unsorted. */
export const allUnsorted: CategoryResolver = () => UNSORTED;

export interface AssembleResult {
  snapshot: TodaySnapshot;
  /** Messages skipped because `From` had no parseable address (logged as a count only). */
  unparseableSenders: number;
}

export class SnapshotError extends Error {
  constructor(readonly stage: "snapshot_invalid" | "snapshot_too_large") {
    super(stage);
    this.name = "SnapshotError";
  }
}

export function gmailUrlFor(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${threadId}`;
}

function contentFor(category: string, message: MailMessage): IssueContent {
  // An Unsorted body is never read, stored, or served (spec 0004 key invariant).
  if (category === UNSORTED) return { kind: "none" };
  const html = message.htmlBody();
  if (html.length > 0) return { kind: "html", html };
  return { kind: "text", text: message.plainBody() };
}

/**
 * Build the snapshot from candidate messages (spec 0002, spec 0004 step 6): keeps
 * newsletters not in trash that arrived in `(generatedAt − 24h, generatedAt]`, skips an
 * unparseable sender, deduplicates by message ID, sorts newest first then by ID, and
 * validates the result. Throws `SnapshotError("snapshot_invalid")` if validation fails.
 */
export function assembleSnapshot(
  candidates: readonly MailMessage[],
  generatedAt: number,
  resolveCategory: CategoryResolver,
): AssembleResult {
  const byId = new Map<string, NewsletterIssue>();
  let unparseableSenders = 0;

  for (const message of candidates) {
    if (byId.has(message.id)) continue;
    if (message.receivedAt <= generatedAt - DAY_MS || message.receivedAt > generatedAt) continue;
    if (!isNewsletter(message) || message.isInTrash()) continue;

    const sender = parseFrom(message.header("From"));
    if (sender === null) {
      unparseableSenders += 1;
      continue;
    }

    const rawListId = message.header("List-Id").trim();
    const listId = rawListId.length > 0 ? normalizeListId(rawListId) : null;
    const category = resolveCategory(listId, sender.email);

    byId.set(message.id, {
      id: message.id,
      threadId: message.threadId,
      sender: sender.name,
      senderEmail: sender.email,
      listId,
      subject: message.subject,
      receivedAt: message.receivedAt,
      category,
      content: contentFor(category, message),
      gmailUrl: gmailUrlFor(message.threadId),
    });
  }

  const items = [...byId.values()].sort(
    (a, b) => b.receivedAt - a.receivedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const snapshot: TodaySnapshot = {
    ok: true,
    contractVersion: CONTRACT_VERSION,
    generatedAt,
    items,
  };
  if (!isTodaySnapshot(snapshot)) throw new SnapshotError("snapshot_invalid");
  return { snapshot, unparseableSenders };
}

/** 4MB, under Vercel's roughly 4.5MB response limit (spec 0004 AC-15). */
export const MAX_SNAPSHOT_BYTES = 4 * 1024 * 1024;

/** UTF-8 byte length without TextEncoder, which Apps Script does not provide. */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/** Serialize and enforce the size cap. The snapshot is never cut short silently. */
export function serializeSnapshot(snapshot: TodaySnapshot): { json: string; bytes: number } {
  const json = JSON.stringify(snapshot);
  const bytes = utf8ByteLength(json);
  if (bytes > MAX_SNAPSHOT_BYTES) throw new SnapshotError("snapshot_too_large");
  return { json, bytes };
}

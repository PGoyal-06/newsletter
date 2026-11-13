/** Bump on a breaking wire shape or meaning change. Also used to discard old caches. */
export const CONTRACT_VERSION = 1;

export type IssueContent =
  { kind: "html"; html: string } | { kind: "text"; text: string } | { kind: "none" };

export interface NewsletterIssue {
  id: string;
  threadId: string;
  sender: string;
  senderEmail: string;
  listId: string | null;
  subject: string;
  receivedAt: number;
  category: string;
  content: IssueContent;
  gmailUrl: string;
}

export interface TodaySnapshot {
  ok: true;
  contractVersion: typeof CONTRACT_VERSION;
  generatedAt: number;
  items: NewsletterIssue[];
}

export type ErrorCode = "bad_key" | "internal";
export interface ErrorEnvelope {
  ok: false;
  error: ErrorCode;
}
export type TodayResponse = TodaySnapshot | ErrorEnvelope;

export interface CategoryMap {
  listIds: Record<string, string>;
  senders: Record<string, string>;
}

export interface ScriptSettings {
  secretKey: string;
  lastProcessedAt: number | null;
  archivingEnabled: boolean;
  snapshotFileId: string | null;
}

export { normalizeListId, normalizeSenderEmail } from "./normalization";
export {
  isCategoryMap,
  isErrorEnvelope,
  isScriptSettings,
  isTodayResponse,
  isTodaySnapshot,
} from "./validation";

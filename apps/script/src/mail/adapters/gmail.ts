import type { MailMessage } from "../domain/message";

function wrap(message: GoogleAppsScript.Gmail.GmailMessage, threadId: string): MailMessage {
  return {
    id: message.getId(),
    threadId,
    receivedAt: message.getDate().getTime(),
    subject: message.getSubject(),
    // getHeader reads one header; never getRawContent() (spec 0004 step 4).
    header: (name) => message.getHeader(name) ?? "",
    isInTrash: () => message.isInTrash(),
    htmlBody: () => message.getBody(),
    plainBody: () => message.getPlainBody(),
  };
}

/** One page of a Gmail search, flattened to messages. */
export function searchMessages(query: string, start: number, max: number): MailMessage[] {
  return GmailApp.search(query, start, max).flatMap((thread) => {
    const threadId = thread.getId();
    return thread.getMessages().map((m) => wrap(m, threadId));
  });
}

/** Thread count for a query, for the editor only Drive access check. */
export function countThreads(query: string): number {
  return GmailApp.search(query, 0, 100).length;
}

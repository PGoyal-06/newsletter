/**
 * The slice of a Gmail message the domain reads. The Gmail adapter implements it, and
 * tests fake it. Body getters are functions so an Unsorted body is never read.
 */
export interface MailMessage {
  id: string;
  threadId: string;
  /** Arrival time, epoch milliseconds. */
  receivedAt: number;
  subject: string;
  /** A header value, or "" when the message has none. */
  header(name: string): string;
  isInTrash(): boolean;
  htmlBody(): string;
  plainBody(): string;
}

/** A newsletter is any message with a `List-Unsubscribe` header that is nonempty after trimming. */
export function isNewsletter(message: MailMessage): boolean {
  return message.header("List-Unsubscribe").trim().length > 0;
}

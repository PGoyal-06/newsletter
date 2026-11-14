import { normalizeSenderEmail } from "@newsletter/contract";

export interface ParsedSender {
  /** Display name, falling back to the address when the name is empty. */
  name: string;
  /** Normalized address (spec 0002). */
  email: string;
}

/**
 * Parse a `From` header: `Name <addr>`, `"Name" <addr>`, `<addr>`, or a bare address.
 * Returns null when no address can be normalized; the caller skips that message.
 * Encoded words (`=?UTF-8?…?=`) are not decoded (spec 0004, step 6).
 */
export function parseFrom(header: string): ParsedSender | null {
  const value = header.trim();
  const open = value.lastIndexOf("<");
  const close = value.lastIndexOf(">");

  let rawName = "";
  let rawAddress = value;
  if (open !== -1 || close !== -1) {
    if (open === -1 || close < open) return null;
    rawName = value.slice(0, open);
    rawAddress = value.slice(open + 1, close);
  }

  const email = normalizeSenderEmail(rawAddress);
  if (email === null) return null;

  const name = rawName
    .trim()
    .replace(/^"(.*)"$/su, "$1")
    .trim();
  return { name: name.length > 0 ? name : email, email };
}

/** Accept an extracted address, preserving plus tags and dots. */
export function normalizeSenderEmail(value: string): string | null {
  const address = value.trim().toLowerCase();
  return /^[^\s<>@]+@[^\s<>@]+$/u.test(address) && !/\p{Cc}/u.test(address) ? address : null;
}

/** Accept a bare identifier or extract the identifier from one bracket pair. */
export function normalizeListId(value: string): string | null {
  const match = /^[^<>]*<([^<>]*)>[^<>]*$/u.exec(value);
  const identifier = (match ? match[1] : value).trim().toLowerCase();
  return identifier.length > 0 && !/[\s<>\p{Cc}]/u.test(identifier) ? identifier : null;
}

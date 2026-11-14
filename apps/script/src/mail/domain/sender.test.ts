import { describe, expect, it } from "vitest";
import { parseFrom } from "./sender";

describe("parseFrom", () => {
  it.each([
    ["Morning Notes <Notes@Example.com>", "Morning Notes", "notes@example.com"],
    ['"Notes, Daily" <notes@example.com>', "Notes, Daily", "notes@example.com"],
    ["<notes@example.com>", "notes@example.com", "notes@example.com"],
    ["notes+am@example.com", "notes+am@example.com", "notes+am@example.com"],
    ['  "  " <notes@example.com> ', "notes@example.com", "notes@example.com"],
    ["=?UTF-8?Q?Caf=C3=A9?= <cafe@example.com>", "=?UTF-8?Q?Caf=C3=A9?=", "cafe@example.com"],
  ])("parses %j", (header, name, email) => {
    expect(parseFrom(header)).toEqual({ name, email });
  });

  it.each(["", "Morning Notes", "Notes <not an address>", "Notes <a@b", "Notes a@b>"])(
    "returns null for %j",
    (header) => {
      expect(parseFrom(header)).toBeNull();
    },
  );
});

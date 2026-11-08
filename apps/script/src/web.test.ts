import { afterEach, describe, expect, it, vi } from "vitest";
import { doGet } from "./web";

// The scaffold body is a placeholder the core loop replaces, so only the durable part
// is locked in here: doGet always answers with parseable JSON.
function fakeContentService() {
  return {
    MimeType: { JSON: "JSON", TEXT: "TEXT" },
    createTextOutput(content: string) {
      const out = {
        content,
        mimeType: "TEXT",
        setMimeType(m: string) {
          out.mimeType = m;
          return out;
        },
      };
      return out;
    },
  };
}

describe("doGet", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("responds with JSON content that parses", () => {
    vi.stubGlobal("ContentService", fakeContentService());

    const out = doGet({} as GoogleAppsScript.Events.DoGet) as unknown as {
      content: string;
      mimeType: string;
    };

    expect(out.mimeType).toBe("JSON");
    expect(() => JSON.parse(out.content)).not.toThrow();
  });
});

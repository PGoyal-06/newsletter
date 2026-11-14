import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { doGet } from "./web";

// doGet is thin wiring over serveToday (tested in serve/domain). This locks the wiring:
// the key comes from the query parameter and the answer is JSON.
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

function stubServices(scriptKey: string | null) {
  vi.stubGlobal("ContentService", fakeContentService());
  vi.stubGlobal("PropertiesService", {
    getScriptProperties: () => ({
      getProperty: (name: string) => (name === "SCRIPT_KEY" ? scriptKey : null),
    }),
  });
  vi.stubGlobal("Utilities", {
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" },
    computeDigest: (_alg: string, value: string) => [...value].map((c) => c.charCodeAt(0)),
  });
}

type Out = { content: string; mimeType: string };

describe("doGet", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("answers a wrong key with a bad_key JSON envelope", () => {
    stubServices("right");

    const out = doGet({ parameter: { key: "wrong" } } as never) as unknown as Out;

    expect(out.mimeType).toBe("JSON");
    expect(JSON.parse(out.content)).toEqual({ ok: false, error: "bad_key" });
  });

  it("passes the key through: a right key with no snapshot yet is internal, not bad_key", () => {
    stubServices("right");

    const out = doGet({ parameter: { key: "right" } } as never) as unknown as Out;

    expect(JSON.parse(out.content)).toEqual({ ok: false, error: "internal" });
  });
});

// covers: AC-10 (ENABLE_UI_GALLERY is read and validated through src/env.ts only)
// covers: spec 0004 (APP_TOKEN, SCRIPT_URL, SCRIPT_KEY are required; SCRIPT_URL is https)
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// env.ts reads process.env when the module loads, so each case loads a fresh copy.
async function loadEnv() {
  vi.resetModules();
  return (await import("./env")).env;
}

const SECRETS = {
  APP_TOKEN: "app-token-value",
  SCRIPT_URL: "https://script.google.com/macros/s/abc/exec",
  SCRIPT_KEY: "script-key-value",
};

beforeEach(() => {
  for (const [name, value] of Object.entries(SECRETS)) vi.stubEnv(name, value);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("env secrets", () => {
  it("exposes the three server secrets", async () => {
    expect(await loadEnv()).toMatchObject({
      appToken: SECRETS.APP_TOKEN,
      scriptUrl: SECRETS.SCRIPT_URL,
      scriptKey: SECRETS.SCRIPT_KEY,
    });
  });

  it("trims the secrets, so a stray newline from a dashboard paste cannot break every key", async () => {
    vi.stubEnv("APP_TOKEN", `  ${SECRETS.APP_TOKEN}\n`);
    vi.stubEnv("SCRIPT_KEY", `${SECRETS.SCRIPT_KEY}\r\n`);
    vi.stubEnv("SCRIPT_URL", ` ${SECRETS.SCRIPT_URL} `);

    expect(await loadEnv()).toMatchObject({
      appToken: SECRETS.APP_TOKEN,
      scriptKey: SECRETS.SCRIPT_KEY,
      scriptUrl: SECRETS.SCRIPT_URL,
    });
  });

  it.each(["APP_TOKEN", "SCRIPT_URL", "SCRIPT_KEY"])(
    "refuses to load when %s is missing or blank, naming it",
    async (name) => {
      vi.stubEnv(name, undefined);
      await expect(loadEnv()).rejects.toThrow(`${name} is required.`);

      vi.stubEnv(name, "   ");
      await expect(loadEnv()).rejects.toThrow(`${name} is required.`);
    },
  );

  it.each(["http://script.google.com/exec", "not a url"])(
    "refuses SCRIPT_URL %j without echoing it",
    async (value) => {
      vi.stubEnv("SCRIPT_URL", value);

      const error = await loadEnv().catch((e: Error) => e);
      expect(String(error)).toContain("SCRIPT_URL must be an https URL.");
      expect(String(error)).not.toContain(value);
    },
  );
});

describe("env.enableUiGallery", () => {
  it("is off when the flag is unset", async () => {
    vi.stubEnv("ENABLE_UI_GALLERY", undefined);

    expect((await loadEnv()).enableUiGallery).toBe(false);
  });

  it.each(["", "0"])("is off when the flag is %j", async (value) => {
    vi.stubEnv("ENABLE_UI_GALLERY", value);

    expect((await loadEnv()).enableUiGallery).toBe(false);
  });

  it("is on when the flag is 1", async () => {
    vi.stubEnv("ENABLE_UI_GALLERY", "1");

    expect((await loadEnv()).enableUiGallery).toBe(true);
  });

  it.each(["yes", "true", "on", " 1", "2"])(
    "refuses to load when the flag is %j, naming the variable and the value",
    async (value) => {
      vi.stubEnv("ENABLE_UI_GALLERY", value);

      await expect(loadEnv()).rejects.toThrow(
        `ENABLE_UI_GALLERY must be "1" or "0" (or unset), got "${value}".`,
      );
    },
  );
});

describe("instrumentation register", () => {
  it("fails the server start when the env is invalid", async () => {
    vi.stubEnv("ENABLE_UI_GALLERY", "yes");
    vi.resetModules();
    const { register } = await import("./instrumentation");

    await expect(register()).rejects.toThrow("ENABLE_UI_GALLERY");
  });

  it("starts cleanly when the env is valid", async () => {
    vi.stubEnv("ENABLE_UI_GALLERY", "0");
    vi.resetModules();
    const { register } = await import("./instrumentation");

    await expect(register()).resolves.toBeUndefined();
  });
});

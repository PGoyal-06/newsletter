// covers: AC-10 (ENABLE_UI_GALLERY is read and validated through src/env.ts only)
import { afterEach, describe, expect, it, vi } from "vitest";

// env.ts reads process.env when the module loads, so each case loads a fresh copy.
async function loadEnv() {
  vi.resetModules();
  return (await import("./env")).env;
}

afterEach(() => {
  vi.unstubAllEnvs();
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

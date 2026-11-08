// covers: D-5 (the post build check passes, and catches a missing entry point)
import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const PKG = resolve(import.meta.dirname, "..");
let work: string;
let originalMain: string;

// Runs the real build script in a throwaway copy of the package, so a test can break
// src/main.ts without touching the repo.
function build(): { code: number; out: string } {
  try {
    const out = execFileSync("node", ["scripts/build.mjs"], { cwd: work, encoding: "utf8", stdio: "pipe" });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status: number; stdout: string; stderr: string };
    return { code: err.status, out: `${err.stdout}${err.stderr}` };
  }
}

beforeAll(async () => {
  work = await mkdtemp(join(tmpdir(), "script-build-"));
  for (const entry of ["src", "scripts", "appsscript.json", "package.json"]) {
    await cp(join(PKG, entry), join(work, entry), { recursive: true });
  }
  await symlink(join(PKG, "node_modules"), join(work, "node_modules"), "dir");
  originalMain = await readFile(join(work, "src/main.ts"), "utf8");
});

afterAll(async () => {
  await rm(work, { recursive: true, force: true });
});

beforeEach(async () => {
  await writeFile(join(work, "src/main.ts"), originalMain);
});

describe("worker build", () => {
  it("passes the entry point check for doGet, onTimer and installTriggers", () => {
    const { code, out } = build();

    expect(code).toBe(0);
    expect(out).toContain("entry points OK: doGet, onTimer, installTriggers");
  });

  it("writes only Code.js and appsscript.json to dist", async () => {
    build();

    expect((await readdir(join(work, "dist"))).sort()).toEqual(["Code.js", "appsscript.json"]);
  });

  it("clears stale files out of dist so clasp never pushes leftovers", async () => {
    build();
    await writeFile(join(work, "dist/stale.js"), "// old");

    build();

    expect(await readdir(join(work, "dist"))).not.toContain("stale.js");
  });

  it("copies the committed manifest into dist unchanged", async () => {
    build();

    const copied = await readFile(join(work, "dist/appsscript.json"), "utf8");
    expect(copied).toBe(await readFile(join(PKG, "appsscript.json"), "utf8"));
  });

  it.each(["doGet", "onTimer", "installTriggers"])(
    "fails the build and names %s when its globalThis assignment is missing",
    async (name) => {
      const broken = originalMain.replace(new RegExp(`^g\\.${name} = ${name};$`, "m"), "");
      expect(broken).not.toBe(originalMain);
      await writeFile(join(work, "src/main.ts"), broken);

      const { code, out } = build();

      expect(code).toBe(1);
      expect(out).toContain(`entry points not assigned to globalThis: ${name}`);
    },
  );
});

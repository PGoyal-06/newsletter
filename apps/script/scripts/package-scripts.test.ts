// Regression for /debug 2026-11-08: a package script named after a pnpm built in command
// (like `deploy`) is silently shadowed, so `pnpm --filter <pkg> <name>` never runs it.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../../..");

// pnpm 12 built in commands (`pnpm help --all`), minus the ones pnpm forwards to the
// matching package script (test, start, stop, restart) and `run` itself.
const SHADOWING_BUILTINS = new Set([
  "access",
  "add",
  "approve",
  "approve-builds",
  "audit",
  "bin",
  "bugs",
  "cache",
  "cat-file",
  "cat-index",
  "change",
  "ci",
  "clean",
  "completion",
  "config",
  "create",
  "dedupe",
  "deploy",
  "deprecate",
  "dist-tag",
  "dlx",
  "docs",
  "doctor",
  "edit",
  "env",
  "exec",
  "fetch",
  "find-hash",
  "get",
  "help",
  "ignored-builds",
  "import",
  "init",
  "install",
  "install-test",
  "lane",
  "licenses",
  "link",
  "list",
  "ll",
  "login",
  "logout",
  "outdated",
  "owner",
  "pack",
  "pack-app",
  "patch",
  "patch-commit",
  "patch-remove",
  "peers",
  "permissions",
  "ping",
  "pipeline",
  "pkg",
  "prefix",
  "profile",
  "prune",
  "publish",
  "purge",
  "rb",
  "rebuild",
  "recursive",
  "remove",
  "repo",
  "root",
  "runtime",
  "sbom",
  "search",
  "self-update",
  "set",
  "set-script",
  "setup",
  "shim",
  "stage",
  "star",
  "stars",
  "store",
  "tasks",
  "team",
  "token",
  "undeprecate",
  "unlink",
  "unpublish",
  "unstar",
  "update",
  "version",
  "view",
  "whoami",
  "why",
  "with",
  "xmas",
]);

function workspaceManifests(): string[] {
  const found = [join(ROOT, "package.json")];
  for (const group of ["apps", "packages"]) {
    for (const dir of readdirSync(join(ROOT, group))) {
      const p = join(ROOT, group, dir, "package.json");
      if (existsSync(p)) found.push(p);
    }
  }
  return found;
}

const scriptsOf = (p: string): Record<string, string> =>
  JSON.parse(readFileSync(p, "utf8")).scripts ?? {};

describe("workspace package scripts", () => {
  it("finds the root and every workspace package", () => {
    expect(workspaceManifests().length).toBeGreaterThanOrEqual(4);
  });

  it.each(workspaceManifests().map((p) => [p.slice(ROOT.length + 1), p]))(
    "%s has no script that a pnpm built in command would shadow",
    (_label, path) => {
      const clashes = Object.keys(scriptsOf(path)).filter((name) => SHADOWING_BUILTINS.has(name));
      expect(clashes).toEqual([]);
    },
  );

  it("ships the worker through `release`, which typechecks, tests and builds before deploying", () => {
    const release = scriptsOf(join(ROOT, "apps/script/package.json")).release ?? "";
    const order = ["pnpm typecheck", "pnpm test", "pnpm build", "node scripts/deploy.mjs"].map(
      (s) => release.indexOf(s),
    );

    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});

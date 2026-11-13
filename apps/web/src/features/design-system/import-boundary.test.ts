// covers: AC-11 (only the design-system ui index may be imported from outside the folder)
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

// Linted as if they were these files, so the config's file globs apply.
const FEED_FILE = path.join(repoRoot, "apps/web/src/features/feed/ui/Feed.tsx");
const GALLERY_FILE = path.join(repoRoot, "apps/web/src/features/design-system/gallery/Sample.tsx");
const UI_FILE = path.join(repoRoot, "apps/web/src/features/design-system/ui/Sample.tsx");
const FEED_DOMAIN_FILE = path.join(repoRoot, "apps/web/src/features/feed/domain/sample.ts");

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: repoRoot });
});

async function boundaryErrors(source: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(`${source}\nexport const used = x;\n`, { filePath });
  return result!.messages.filter((m) => m.ruleId === "no-restricted-imports").map((m) => m.message);
}

describe("design-system import boundary", () => {
  it("rejects a deep import through the @/ alias", async () => {
    const errors = await boundaryErrors(
      `import { IssueRow as x } from "@/features/design-system/ui/IssueRow";`,
      FEED_FILE,
    );
    expect(errors).toHaveLength(1);
  });

  it("rejects a deep import through a relative path", async () => {
    const errors = await boundaryErrors(
      `import { IssueRow as x } from "../../design-system/ui/IssueRow";`,
      FEED_FILE,
    );
    expect(errors).toHaveLength(1);
  });

  it("rejects a sibling folder reaching into ui inside the same feature", async () => {
    const errors = await boundaryErrors(
      `import { IssueRow as x } from "../ui/IssueRow";`,
      GALLERY_FILE,
    );
    expect(errors).toHaveLength(1);
  });

  it("keeps the domain rules for web domain files while adding the boundary", async () => {
    const deep = await boundaryErrors(
      `import { IssueRow as x } from "@/features/design-system/ui/IssueRow";`,
      FEED_DOMAIN_FILE,
    );
    const framework = await boundaryErrors(
      `import { useState as x } from "react";`,
      FEED_DOMAIN_FILE,
    );
    expect(deep).toHaveLength(1);
    expect(framework).toHaveLength(1);
  });

  it.each([
    `import { IssueRow as x } from "@/features/design-system/ui";`,
    `import { IssueRow as x } from "@/features/design-system/ui/index";`,
    `import { IssueRow as x } from "../ui";`,
  ])("allows the index import: %s", async (source) => {
    expect(await boundaryErrors(source, GALLERY_FILE)).toEqual([]);
  });

  it("lets files inside ui import each other directly", async () => {
    const errors = await boundaryErrors(`import { Button as x } from "./Button";`, UI_FILE);
    expect(errors).toEqual([]);
  });
});

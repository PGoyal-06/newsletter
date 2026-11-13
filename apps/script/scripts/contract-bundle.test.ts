import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";
import fixture from "../../../packages/contract/fixtures/today.json";
import type * as Contract from "@newsletter/contract";

describe("shared contract runtime boundaries (AC-5, AC-8)", () => {
  it.each(["neutral", "browser"] as const)(
    "runs the complete %s bundle with only standard JavaScript globals",
    async (platform) => {
      const result = await build({
        entryPoints: [resolve(import.meta.dirname, "../../../packages/contract/src/index.ts")],
        bundle: true,
        write: false,
        format: "iife",
        globalName: "contract",
        platform,
        target: "es2019",
        metafile: true,
      });
      expect(Object.keys(result.metafile.inputs)).toHaveLength(3);
      expect(
        Object.values(result.metafile.outputs).every((output) => output.imports.length === 0),
      ).toBe(true);

      // No Node, DOM, or Google services are injected into this runtime.
      const context = createContext({ wire: JSON.stringify(fixture) });
      runInContext(result.outputFiles[0].text, context);
      const contract = context.contract as typeof Contract;
      expect(contract.CONTRACT_VERSION).toBe(1);
      expect(runInContext("contract.isTodaySnapshot(JSON.parse(wire))", context)).toBe(true);
      expect(contract.isTodayResponse({ ok: false, error: "internal" })).toBe(true);
      expect(contract.isCategoryMap({ listIds: {}, senders: {} })).toBe(true);
      expect(
        contract.isScriptSettings({
          secretKey: "fixture-secret",
          lastProcessedAt: null,
          archivingEnabled: false,
          snapshotFileId: null,
        }),
      ).toBe(true);
      expect(contract.normalizeSenderEmail(" A+B@EXAMPLE.COM ")).toBe("a+b@example.com");
      expect(contract.normalizeListId("Notes <WEEKLY>")).toBe("weekly");
    },
  );
});

import { describe, expect, it } from "vitest";
import { CONTRACT_VERSION, isTodayResponse } from "@newsletter/contract";
import fixture from "../../../../../../packages/contract/fixtures/today.json";

describe("web contract consumption", () => {
  it("narrows the worker JSON to the shared snapshot type", () => {
    const response: unknown = JSON.parse(JSON.stringify(fixture));
    expect(isTodayResponse(response)).toBe(true);
    if (!isTodayResponse(response) || !response.ok) throw new Error("Invalid shared fixture");
    expect(response.contractVersion).toBe(CONTRACT_VERSION);
    expect(response.items[0].content).toEqual({ kind: "text", text: "Your morning reading." });
  });

  it("rejects the previous version rather than consuming it", () => {
    expect(isTodayResponse({ ...fixture, contractVersion: 0 })).toBe(false);
  });
});

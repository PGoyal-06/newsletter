import { describe, expect, it } from "vitest";
import { CONTRACT_VERSION, isTodaySnapshot, type TodaySnapshot } from "@newsletter/contract";
import fixture from "../../../packages/contract/fixtures/today.json";

describe("worker contract serialization", () => {
  it("serializes the shared snapshot without losing content", () => {
    expect(isTodaySnapshot(fixture)).toBe(true);
    if (!isTodaySnapshot(fixture)) throw new Error("Invalid shared fixture");
    const snapshot: TodaySnapshot = fixture;
    const decoded: unknown = JSON.parse(JSON.stringify(snapshot));
    expect(isTodaySnapshot(decoded)).toBe(true);
    expect(decoded).toEqual(fixture);
    expect(snapshot.contractVersion).toBe(CONTRACT_VERSION);
  });
});

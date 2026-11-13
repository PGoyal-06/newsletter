// covers: spec 0004 AC-10 (24 hour filter), AC-11 (401 versus any other failure)
import { describe, expect, it } from "vitest";
import fixture from "../../../../../../packages/contract/fixtures/today.json";
import type { NewsletterIssue } from "@newsletter/contract";
import { classifyTodayResponse, DAY_MS, visibleItems } from "./feed";

describe("classifyTodayResponse", () => {
  it("is success only for a 200 with a valid snapshot", () => {
    expect(classifyTodayResponse(200, fixture)).toEqual({ kind: "success", snapshot: fixture });
  });

  it("is unauthorized for a 401, whatever the body", () => {
    expect(classifyTodayResponse(401, null)).toEqual({ kind: "unauthorized" });
  });

  it.each([
    [502, { ok: false, error: "internal" }],
    [200, { ok: true }],
    [200, null],
    [500, fixture],
  ])("is failed for %i with %j", (status, body) => {
    expect(classifyTodayResponse(status, body)).toEqual({ kind: "failed" });
  });
});

describe("visibleItems", () => {
  const item = fixture.items[0] as NewsletterIssue;
  const at = (receivedAt: number) => ({ ...item, receivedAt });
  const NOW = 1_794_398_400_000;

  it("hides items 24 hours old or older by the phone clock", () => {
    const items = [at(NOW - 1000), at(NOW - DAY_MS), at(NOW - DAY_MS - 3_600_000)];

    expect(visibleItems(items, NOW).map((i) => i.receivedAt)).toEqual([NOW - 1000]);
  });

  it("keeps items from the future, so a phone clock running behind hides nothing new", () => {
    expect(visibleItems([at(NOW + 60_000)], NOW)).toHaveLength(1);
  });
});

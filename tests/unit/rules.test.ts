import { describe, expect, it } from "vitest";
import fixture from "@/fixtures/demo-case.json";
import { evaluateRules, simulateScenarios } from "@/lib/rules/engine";
import type { DemoCase, ScenarioInput } from "@/lib/domain/types";

const demo = fixture as DemoCase;

describe("medical claim rule engine", () => {
  it("finds the seeded procedural defects deterministically", () => {
    const results = evaluateRules(demo);

    expect(results).toHaveLength(6);
    expect(results.find((rule) => rule.ruleId === "MB-014")?.status).toBe("fail");
    expect(results.find((rule) => rule.ruleId === "MB-031")?.amountAtIssue).toBe(850);
    expect(results.find((rule) => rule.ruleId === "MB-042")?.status).toBe("needs_evidence");
  });

  it("compares scenarios without mutating the stored case", () => {
    const scenarios: ScenarioInput[] = [
      { id: "baseline", label: "Appeal now", changes: [] },
      {
        id: "complete",
        label: "Obtain bill + signed referral",
        changes: ["add_itemized_bill", "add_signed_referral", "remove_duplicate"],
      },
    ];

    const results = simulateScenarios(demo, scenarios);

    expect(results[1].readiness).toBeGreaterThan(results[0].readiness);
    expect(results[1].resolvedRules).toEqual(expect.arrayContaining(["MB-014", "MB-031", "MB-042"]));
    expect(demo.documents.find((doc) => doc.kind === "itemized_bill")?.present).toBe(false);
  });
});

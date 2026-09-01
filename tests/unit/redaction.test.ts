import { describe, expect, it } from "vitest";
import fixture from "@/fixtures/demo-case.json";
import { seal } from "@/lib/vault/redaction";
import type { DemoCase } from "@/lib/domain/types";

const demo = fixture as DemoCase;

describe("seal", () => {
  it("returns tokenized content when no raw identifiers are present", () => {
    const value = seal(
      { summary: "Claim for [[NAME]] is missing an itemized bill." },
      [],
      demo.rawIdentifiers,
    );

    expect(value).toEqual({ summary: "Claim for [[NAME]] is missing an itemized bill." });
  });

  it("fails closed when a nested result contains a known raw identifier", () => {
    expect(() =>
      seal({ nested: { claimant: demo.rawIdentifiers.patient_name } }, [], demo.rawIdentifiers),
    ).toThrow(/patient_name/);
  });

  it("releases only an explicitly allowlisted identifier", () => {
    const result = seal(
      { field: "date_of_birth", value: demo.rawIdentifiers.date_of_birth },
      ["date_of_birth"],
      demo.rawIdentifiers,
    );

    expect(result).toEqual({ field: "date_of_birth", value: "1988-04-12" });
    expect(() =>
      seal({ value: demo.rawIdentifiers.member_id }, ["date_of_birth"], demo.rawIdentifiers),
    ).toThrow(/member_id/);
  });

  it("never returns a token map even when nested", () => {
    expect(() => seal({ metadata: { tokenMap: demo.tokens } }, [], demo.rawIdentifiers)).toThrow(
      /token map/i,
    );
  });
});

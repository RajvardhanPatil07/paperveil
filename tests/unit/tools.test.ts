import { beforeEach, describe, expect, it } from "vitest";
import fixture from "@/fixtures/demo-case.json";
import { createToolHandlers } from "@/lib/webmcp/handlers";
import type { DemoCase, Decision, LedgerEntry } from "@/lib/domain/types";

describe("PaperVeil tool contracts", () => {
  let current: DemoCase;
  let downloaded = "";

  beforeEach(() => {
    current = structuredClone(fixture) as DemoCase;
    downloaded = "";
  });

  function runtime(decision: Decision = "denied") {
    return createToolHandlers({
      load: async () => current,
      save: async (next) => {
        current = structuredClone(next);
      },
      appendLedger: async (entry: LedgerEntry) => {
        current.ledger.push(entry);
      },
      gate: async () => decision,
      download: (contents) => {
        downloaded = contents;
      },
      notify: () => undefined,
    });
  }

  it("keeps a denied disclosure private and directs the agent to the token", async () => {
    const result = await runtime("denied").request_disclosure({
      field: "date_of_birth",
      reason: "Place the birth date in the appeal heading.",
    });

    expect(result).toEqual({ granted: false, decision: "denied", useToken: "[[DOB]]" });
    expect(JSON.stringify(result)).not.toContain(current.rawIdentifiers.date_of_birth);
    expect(current.ledger.at(-1)).toMatchObject({ decision: "denied", rawFieldsReleased: [] });
  });

  it("releases exactly one approved identifier", async () => {
    const result = await runtime("approved").request_disclosure({
      field: "date_of_birth",
      reason: "Verify the case header.",
    });

    expect(result).toEqual({
      granted: true,
      decision: "approved",
      field: "date_of_birth",
      value: "1988-04-12",
    });
    expect(current.ledger.at(-1)).toMatchObject({ rawFieldsReleased: ["date_of_birth"] });
  });

  it("stores a tokenized draft but returns only a receipt", async () => {
    const result = await runtime().draft_appeal({
      tone: "formal",
      grounds: [
        {
          ruleId: "MB-014",
          heading: "Missing itemized bill",
          argument: "The denial cannot be reconciled without the provider's itemized bill.",
          citation: "Northstar Member Policy (fictional), §4.3",
        },
      ],
    });

    expect(result).toEqual({ ok: true, grounds: 1, tokensUsed: ["[[NAME]]", "[[MEMBER_ID]]", "[[ADDRESS]]"], view: "/#packet" });
    expect(JSON.stringify(result)).not.toContain("denial cannot be reconciled");
    expect(current.draft?.tokenizedText).toContain("[[NAME]]");
  });

  it("downloads locally while returning no packet contents", async () => {
    current.draft = {
      updatedAt: 1,
      tone: "formal",
      grounds: [],
      tokenizedText: "Appeal for [[NAME]] / [[MEMBER_ID]]",
    };

    const result = await runtime("approved").export_packet({ format: "txt" });

    expect(result).toEqual({ ok: true, decision: "approved", format: "txt", downloaded: true });
    expect(downloaded).toContain("Maya Chen");
    expect(JSON.stringify(result)).not.toContain("Maya Chen");
  });

  it("keeps every read result within the 1,500-byte tool budget", async () => {
    const tools = runtime();
    const results = await Promise.all([
      tools.list_evidence({ detail: "documents" }),
      tools.find_line_items({ cursor: 0, limit: 10 }),
      tools.check_rules({}),
      tools.simulate_outcomes({
        scenarios: [
          { id: "now", label: "Appeal now", changes: [] },
          { id: "complete", label: "Complete packet", changes: ["add_itemized_bill", "remove_duplicate"] },
        ],
      }),
    ]);

    for (const result of results) {
      expect(new TextEncoder().encode(JSON.stringify(result)).byteLength).toBeLessThanOrEqual(1500);
    }
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "@/fixtures/demo-case.json";
import { registerPaperVeilTools } from "@/lib/webmcp/register";

type RegisteredTool = {
  name: string;
  title?: string;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean; consequentialHint?: boolean };
  execute: (input: never) => Promise<unknown>;
};

describe("WebMCP registration boundary", () => {
  afterEach(() => {
    Reflect.deleteProperty(document, "modelContext");
  });

  it("registers seven executable definitions with truthful mutation hints", async () => {
    const registered: RegisteredTool[] = [];
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: vi.fn((definition: RegisteredTool) => {
          registered.push(definition);
        }),
      },
    });

    const count = await registerPaperVeilTools(new AbortController().signal);

    expect(count).toBe(7);
    expect(registered.map((tool) => tool.name)).toEqual([
      "list_evidence",
      "find_line_items",
      "check_rules",
      "simulate_outcomes",
      "draft_appeal",
      "request_disclosure",
      "export_packet",
    ]);
    expect(registered.find((tool) => tool.name === "check_rules")?.annotations?.readOnlyHint).toBe(false);
    expect(registered.find((tool) => tool.name === "simulate_outcomes")?.annotations?.readOnlyHint).toBe(false);
    expect(registered.every((tool) => Boolean(tool.title))).toBe(true);
    expect(registered.find((tool) => tool.name === "list_evidence")?.annotations?.untrustedContentHint).toBe(true);
    expect(registered.find((tool) => tool.name === "find_line_items")?.annotations?.untrustedContentHint).toBe(true);
    expect(registered.find((tool) => tool.name === "request_disclosure")?.annotations?.consequentialHint).toBe(true);
    expect(registered.find((tool) => tool.name === "export_packet")?.annotations?.consequentialHint).toBe(true);

    const result = await registered.find((tool) => tool.name === "list_evidence")?.execute({} as never);
    expect(result).toMatchObject({ caseId: fixture.id, documentsPresent: 3 });
    expect(JSON.stringify(result)).not.toContain(fixture.rawIdentifiers.patient_name);
  });
});

"use client";

import type { RawField } from "@/lib/domain/types";
import { createToolHandlers } from "@/lib/webmcp/handlers";
import { requestHumanGate } from "@/lib/webmcp/human-gate";
import {
  announceStateChange,
  appendLedgerEntry,
  loadDemoCase,
  saveDemoCase,
} from "@/lib/vault/store";

const rawFields: RawField[] = ["patient_name", "date_of_birth", "member_id", "address"];

export const browserToolHandlers = createToolHandlers({
  origin: "webmcp",
  load: loadDemoCase,
  save: saveDemoCase,
  appendLedger: appendLedgerEntry,
  gate: requestHumanGate,
  download: downloadPacket,
  notify: announceStateChange,
});

export const humanToolHandlers = createToolHandlers({
  origin: "human-ui",
  load: loadDemoCase,
  save: saveDemoCase,
  appendLedger: appendLedgerEntry,
  gate: requestHumanGate,
  download: downloadPacket,
  notify: announceStateChange,
});

const emptySchema = { type: "object", properties: {}, additionalProperties: false } as const;

export const toolDefinitions = [
  {
    name: "list_evidence",
    title: "List case evidence",
    description: "List the local case evidence, tokenized summaries, or missing-evidence gaps. Returns no raw identity fields.",
    inputSchema: {
      type: "object",
      properties: { detail: { type: "string", enum: ["summary", "documents", "gaps"], description: "Evidence view to return." } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: browserToolHandlers.list_evidence,
  },
  {
    name: "find_line_items",
    title: "Find claim line items",
    description: "Find paginated claim line items by code or description. Exposes dates, codes, and amounts but no raw identity.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional code or description filter." },
        cursor: { type: "integer", minimum: 0, description: "Zero-based result cursor." },
        limit: { type: "integer", minimum: 1, maximum: 10, description: "Maximum rows to return." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: browserToolHandlers.find_line_items,
  },
  {
    name: "check_rules",
    title: "Check policy rules",
    description: "Evaluate the fictional policy pack against local evidence. Returns checkable defects and source labels without identity.",
    inputSchema: emptySchema,
    annotations: { readOnlyHint: false },
    execute: browserToolHandlers.check_rules,
  },
  {
    name: "simulate_outcomes",
    title: "Compare appeal outcomes",
    description: "Compare one to four hypothetical evidence changes, save the comparison for the shared UI, and leave the underlying evidence unchanged.",
    inputSchema: {
      type: "object",
      properties: {
        scenarios: {
          type: "array",
          minItems: 1,
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              changes: {
                type: "array",
                items: { type: "string", enum: ["add_itemized_bill", "remove_duplicate", "add_signed_referral"] },
              },
            },
            required: ["id", "label", "changes"],
            additionalProperties: false,
          },
        },
      },
      required: ["scenarios"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: browserToolHandlers.simulate_outcomes,
  },
  {
    name: "draft_appeal",
    title: "Draft tokenized appeal",
    description: "Write an argument structure into the local appeal draft. Returns only a receipt; the personalized letter never enters tool output.",
    inputSchema: {
      type: "object",
      properties: {
        tone: { type: "string", enum: ["formal", "plain"] },
        grounds: {
          type: "array",
          minItems: 1,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              ruleId: { type: "string" },
              heading: { type: "string" },
              argument: { type: "string" },
              citation: { type: "string" },
            },
            required: ["ruleId", "heading", "argument", "citation"],
            additionalProperties: false,
          },
        },
      },
      required: ["grounds"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: browserToolHandlers.draft_appeal,
  },
  {
    name: "request_disclosure",
    title: "Request identifier disclosure",
    description: "Ask the user to reveal one raw identifier for a stated reason. On denial or timeout, continue with the returned local token.",
    inputSchema: {
      type: "object",
      properties: {
        field: { type: "string", enum: rawFields, description: "Single identifier to request." },
        reason: { type: "string", description: "Reason shown verbatim to the user." },
      },
      required: ["field", "reason"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, consequentialHint: true },
    execute: browserToolHandlers.request_disclosure,
  },
  {
    name: "export_packet",
    title: "Export appeal packet",
    description: "Ask for confirmation, personalize the appeal locally, and download it. Returns a receipt, never packet contents.",
    inputSchema: {
      type: "object",
      properties: { format: { type: "string", enum: ["txt", "pdf"], description: "Local download format." } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, consequentialHint: true },
    execute: browserToolHandlers.export_packet,
  },
] as const;

export async function registerPaperVeilTools(signal: AbortSignal) {
  if (typeof document.modelContext?.registerTool !== "function") return 0;

  for (const tool of toolDefinitions) {
    await document.modelContext.registerTool(tool as never, { signal });
  }
  announceStateChange();
  return toolDefinitions.length;
}

async function downloadPacket(contents: string, format: "txt" | "pdf") {
  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "letter" });
    const lines = pdf.splitTextToSize(contents, 170) as string[];
    let y = 20;
    pdf.setFont("times", "normal");
    pdf.setFontSize(11);
    for (const line of lines) {
      if (y > 255) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 20, y);
      y += 5.5;
    }
    pdf.save("paperveil-appeal.pdf");
    return;
  }
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "paperveil-appeal.txt";
  link.click();
  URL.revokeObjectURL(url);
}

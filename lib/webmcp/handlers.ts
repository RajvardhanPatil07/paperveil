import type {
  AppealGround,
  Decision,
  DemoCase,
  InvocationOrigin,
  LedgerEntry,
  RawField,
  ScenarioInput,
} from "@/lib/domain/types";
import { evaluateRules, simulateScenarios } from "@/lib/rules/engine";
import { byteSize, rehydrateTokens, seal } from "@/lib/vault/redaction";

export type GateRequest =
  | { kind: "disclosure"; field: RawField; reason: string }
  | { kind: "export"; reason: string };

export type ToolRuntime = {
  origin: InvocationOrigin;
  load: () => Promise<DemoCase>;
  save: (caseData: DemoCase) => Promise<void>;
  appendLedger: (entry: LedgerEntry) => Promise<void>;
  gate: (request: GateRequest) => Promise<Decision>;
  download: (contents: string, format: "txt" | "pdf") => Promise<void> | void;
  notify: () => void;
};

type ListEvidenceInput = { detail?: "documents" | "gaps" | "summary" };
type FindLineItemsInput = { query?: string; cursor?: number; limit?: number };
type SimulateOutcomesInput = { scenarios: ScenarioInput[] };
type DraftAppealInput = { grounds: AppealGround[]; tone?: "formal" | "plain" };
type DisclosureInput = { field: RawField; reason: string };
type ExportInput = { format?: "txt" | "pdf" };

export function createToolHandlers(runtime: ToolRuntime) {
  async function record(
    caseData: DemoCase,
    tool: string,
    args: unknown,
    result: unknown,
    options: {
      rawFieldsReleased?: RawField[];
      quasiFieldsExposed?: string[];
      gated?: boolean;
      decision?: Decision;
    } = {},
  ) {
    if (byteSize(result) > 1500) throw new Error(`${tool} exceeded the 1,500-byte output budget.`);
    await runtime.appendLedger({
      id: crypto.randomUUID(),
      kind: "invocation",
      ts: Date.now(),
      tool,
      origin: runtime.origin,
      args,
      result,
      bytesOut: byteSize(result),
      rawFieldsReleased: options.rawFieldsReleased ?? [],
      quasiFieldsExposed: options.quasiFieldsExposed ?? [],
      gated: options.gated ?? false,
      decision: options.decision,
    });
    runtime.notify();
  }

  return {
    async list_evidence(input: ListEvidenceInput = {}) {
      const caseData = await runtime.load();
      const detail = input.detail ?? "summary";
      const rules = evaluateRules(caseData);
      const payload =
        detail === "documents"
          ? {
              caseId: caseData.id,
              documents: caseData.documents.map(({ id, kind, title, receivedAt, pages, summary, present }) => ({
                id,
                kind,
                title,
                receivedAt,
                pages,
                summary,
                present,
              })),
            }
          : detail === "gaps"
            ? {
                caseId: caseData.id,
                gaps: rules
                  .filter((rule) => rule.status !== "pass")
                  .map(({ ruleId, title, status, action }) => ({ ruleId, title, status, action })),
              }
            : {
                caseId: caseData.id,
                documentsPresent: caseData.documents.filter((doc) => doc.present).length,
                documentsExpected: caseData.documents.length,
                openGaps: rules.filter((rule) => rule.status !== "pass").length,
                claimAmount: caseData.claimAmount,
              };
      const result = seal(payload, [], caseData.rawIdentifiers);
      await record(caseData, "list_evidence", input, result, { quasiFieldsExposed: ["claim_amount", "document_dates"] });
      return result;
    },

    async find_line_items(input: FindLineItemsInput = {}) {
      const caseData = await runtime.load();
      const cursor = Math.max(0, input.cursor ?? 0);
      const limit = Math.min(10, Math.max(1, input.limit ?? 5));
      const query = input.query?.trim().toLowerCase();
      const matches = query
        ? caseData.lineItems.filter((item) => `${item.code} ${item.description}`.toLowerCase().includes(query))
        : caseData.lineItems;
      const items = matches.slice(cursor, cursor + limit);
      const result = seal(
        { items, nextCursor: cursor + items.length < matches.length ? cursor + items.length : null, total: matches.length },
        [],
        caseData.rawIdentifiers,
      );
      await record(caseData, "find_line_items", input, result, {
        quasiFieldsExposed: ["service_dates", "procedure_codes", "amounts"],
      });
      return result;
    },

    async check_rules(input: Record<string, never> = {}) {
      void input;
      const caseData = await runtime.load();
      const rules = evaluateRules(caseData);
      caseData.ruleResults = rules;
      await runtime.save(caseData);
      const result = seal(
        {
          caseId: caseData.id,
          passed: rules.filter((rule) => rule.status === "pass").map((rule) => rule.ruleId),
          issues: rules
            .filter((rule) => rule.status !== "pass")
            .map((rule) => ({
              id: rule.ruleId,
              status: rule.status,
              finding: rule.because,
              next: rule.action,
              source: rule.source,
              amount: rule.amountAtIssue,
            })),
        },
        [],
        caseData.rawIdentifiers,
      );
      await record(caseData, "check_rules", {}, result, {
        quasiFieldsExposed: ["denial_code", "amount_at_issue"],
      });
      return result;
    },

    async simulate_outcomes(input: SimulateOutcomesInput) {
      const caseData = await runtime.load();
      if (!Array.isArray(input.scenarios) || input.scenarios.length < 1 || input.scenarios.length > 4) {
        throw new Error("Provide between one and four scenarios.");
      }
      const scenarios = simulateScenarios(caseData, input.scenarios);
      caseData.scenarios = scenarios;
      await runtime.save(caseData);
      const result = seal({ scenarios }, [], caseData.rawIdentifiers);
      await record(caseData, "simulate_outcomes", input, result, { quasiFieldsExposed: ["amounts"] });
      return result;
    },

    async draft_appeal(input: DraftAppealInput) {
      const caseData = await runtime.load();
      if (!Array.isArray(input.grounds) || input.grounds.length < 1 || input.grounds.length > 6) {
        throw new Error("Provide between one and six appeal grounds.");
      }
      const tone = input.tone ?? "formal";
      const tokenizedText = buildTokenizedDraft(caseData, input.grounds, tone);
      seal({ tokenizedText }, [], caseData.rawIdentifiers);
      caseData.draft = { updatedAt: Date.now(), tone, grounds: input.grounds, tokenizedText };
      caseData.status = "ready";
      await runtime.save(caseData);
      const result = seal(
        { ok: true as const, grounds: input.grounds.length, tokensUsed: ["[[NAME]]", "[[MEMBER_ID]]", "[[ADDRESS]]"], view: "/#packet" },
        [],
        caseData.rawIdentifiers,
      );
      await record(caseData, "draft_appeal", input, result);
      return result;
    },

    async request_disclosure(input: DisclosureInput) {
      const caseData = await runtime.load();
      const decision = await runtime.gate({ kind: "disclosure", field: input.field, reason: input.reason });
      const granted = decision === "approved";
      const result = granted
        ? seal(
            { granted: true as const, decision, field: input.field, value: caseData.rawIdentifiers[input.field] },
            [input.field],
            caseData.rawIdentifiers,
          )
        : seal(
            { granted: false as const, decision, useToken: caseData.tokens[input.field] },
            [],
            caseData.rawIdentifiers,
          );
      await record(caseData, "request_disclosure", input, result, {
        gated: true,
        decision,
        rawFieldsReleased: granted ? [input.field] : [],
      });
      return result;
    },

    async export_packet(input: ExportInput = {}) {
      const caseData = await runtime.load();
      const format = input.format ?? "txt";
      if (!caseData.draft) throw new Error("Draft the appeal before exporting the packet.");
      const decision = await runtime.gate({ kind: "export", reason: "Download the locally personalized appeal packet." });
      const approved = decision === "approved";
      if (approved) {
        const contents = rehydrateTokens(caseData.draft.tokenizedText, caseData.rawIdentifiers);
        await runtime.download(contents, format);
      }
      const result = seal(
        { ok: approved, decision, format, downloaded: approved },
        [],
        caseData.rawIdentifiers,
      );
      await record(caseData, "export_packet", input, result, { gated: true, decision });
      return result;
    },
  };
}

function buildTokenizedDraft(caseData: DemoCase, grounds: AppealGround[], tone: "formal" | "plain") {
  const opening = tone === "formal" ? "To the Claims Review Team," : "Hello Claims Review Team,";
  const body = grounds
    .map(
      (ground, index) =>
        `${index + 1}. ${ground.heading}\n${ground.argument}\nSource: ${ground.citation} · Rule ${ground.ruleId}`,
    )
    .join("\n\n");

  return `${opening}\n\nRe: Internal appeal for [[NAME]]\nMember: [[MEMBER_ID]]\nClaim: ${caseData.id}\n\nI request reconsideration of the ${caseData.insurer} claim described above. This demonstration packet identifies procedural evidence that should be reviewed; it does not promise an outcome.\n\n${body}\n\nPlease confirm receipt and advise if any additional documentation is required.\n\nSincerely,\n[[NAME]]\n[[ADDRESS]]`;
}

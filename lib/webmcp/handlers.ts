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
import { byteSize, PrivacyBoundaryError, rehydrateTokens, seal, tokensUsed } from "@/lib/vault/redaction";

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

type AuditOptions = {
  rawFieldsReleased?: RawField[];
  quasiFieldsExposed?: string[];
  gated?: boolean;
  decision?: Decision;
};

class OutputBudgetError extends Error {
  readonly code = "output_budget";

  constructor(readonly bytes: number, tool: string) {
    super(`${tool} exceeded the 1,500-byte output budget.`);
    this.name = "OutputBudgetError";
  }
}

export function createToolHandlers(runtime: ToolRuntime) {
  async function invoke<T>(
    tool: string,
    args: unknown,
    operation: (caseData: DemoCase, audit: AuditOptions) => Promise<T> | T,
  ): Promise<T> {
    let caseData: DemoCase | undefined;
    let result: T | undefined;
    const audit: AuditOptions = {};

    try {
      caseData = await runtime.load();
      result = await operation(caseData, audit);
      const bytesOut = byteSize(result);
      if (bytesOut > 1500) throw new OutputBudgetError(bytesOut, tool);

      await runtime.appendLedger({
        id: crypto.randomUUID(),
        kind: "invocation",
        ts: Date.now(),
        tool,
        origin: runtime.origin,
        args,
        result,
        outcome: "success",
        bytesOut,
        rawFieldsReleased: audit.rawFieldsReleased ?? [],
        quasiFieldsExposed: audit.quasiFieldsExposed ?? [],
        gated: audit.gated ?? false,
        decision: audit.decision,
      });
      runtime.notify();
      return result;
    } catch (error) {
      if (caseData) {
        const privacyError = error instanceof PrivacyBoundaryError ? error : null;
        const budgetError = error instanceof OutputBudgetError ? error : null;
        await runtime.appendLedger({
          id: crypto.randomUUID(),
          kind: "invocation",
          ts: Date.now(),
          tool,
          origin: runtime.origin,
          args,
          result: null,
          outcome: privacyError ? "blocked" : "error",
          error: {
            code: privacyError ? "privacy_boundary" : budgetError ? "output_budget" : "tool_error",
            message: error instanceof Error ? error.message : "The tool failed without an error message.",
            rawField: privacyError?.field,
            offendingValue: privacyError?.offendingValue,
          },
          bytesOut: result === undefined ? 0 : byteSize(result),
          rawFieldsReleased: audit.rawFieldsReleased ?? [],
          quasiFieldsExposed: audit.quasiFieldsExposed ?? [],
          gated: audit.gated ?? false,
          decision: audit.decision,
        });
        runtime.notify();
      }
      throw error;
    }
  }

  return {
    async list_evidence(input: ListEvidenceInput = {}) {
      return invoke("list_evidence", input, (caseData, audit) => {
        const detail = input.detail ?? "summary";
        const rules = evaluateRules(caseData);
        audit.quasiFieldsExposed = ["claim_amount", "document_dates"];
        const payload = detail === "documents"
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
        return seal(payload, [], caseData.rawIdentifiers);
      });
    },

    async find_line_items(input: FindLineItemsInput = {}) {
      return invoke("find_line_items", input, (caseData, audit) => {
        const cursor = Math.max(0, input.cursor ?? 0);
        const limit = Math.min(10, Math.max(1, input.limit ?? 5));
        const query = input.query?.trim().toLowerCase();
        const matches = query
          ? caseData.lineItems.filter((item) => `${item.code} ${item.description}`.toLowerCase().includes(query))
          : caseData.lineItems;
        const page = matches.slice(cursor, cursor + limit);
        const items = page.map(({ id, serviceDate, code, description, billed, allowed, patientOwes, suspectedDuplicate }) => ({
          id,
          serviceDate,
          code,
          description,
          billed,
          allowed,
          patientOwes,
          ...(suspectedDuplicate === undefined ? {} : { suspectedDuplicate }),
        }));
        audit.quasiFieldsExposed = ["service_dates", "procedure_codes", "amounts"];
        return seal(
          { items, nextCursor: cursor + items.length < matches.length ? cursor + items.length : null, total: matches.length },
          [],
          caseData.rawIdentifiers,
        );
      });
    },

    async check_rules(input: Record<string, never> = {}) {
      return invoke("check_rules", input, async (caseData, audit) => {
        const rules = evaluateRules(caseData);
        caseData.ruleResults = rules;
        await runtime.save(caseData);
        audit.quasiFieldsExposed = ["denial_code", "amount_at_issue"];
        return seal(
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
      });
    },

    async simulate_outcomes(input: SimulateOutcomesInput) {
      return invoke("simulate_outcomes", input, async (caseData, audit) => {
        if (!Array.isArray(input.scenarios) || input.scenarios.length < 1 || input.scenarios.length > 4) {
          throw new Error("Provide between one and four scenarios.");
        }
        const scenarios = simulateScenarios(caseData, input.scenarios).map(
          ({ id, label, readiness, resolvedRules, amountClarified }) => ({ id, label, readiness, resolvedRules, amountClarified }),
        );
        caseData.scenarios = scenarios;
        await runtime.save(caseData);
        audit.quasiFieldsExposed = ["amounts"];
        return seal({ scenarios }, [], caseData.rawIdentifiers);
      });
    },

    async draft_appeal(input: DraftAppealInput) {
      return invoke("draft_appeal", input, async (caseData) => {
        if (!Array.isArray(input.grounds) || input.grounds.length < 1 || input.grounds.length > 6) {
          throw new Error("Provide between one and six appeal grounds.");
        }
        const tone = input.tone ?? "formal";
        const tokenizedText = buildTokenizedDraft(caseData, input.grounds, tone);
        const safeDraft = seal({ tokenizedText }, [], caseData.rawIdentifiers).tokenizedText;
        caseData.draft = { updatedAt: Date.now(), tone, grounds: input.grounds, tokenizedText: safeDraft };
        caseData.status = "ready";
        await runtime.save(caseData);
        return seal(
          { ok: true as const, grounds: input.grounds.length, tokensUsed: tokensUsed(safeDraft), view: "/#packet" },
          [],
          caseData.rawIdentifiers,
        );
      });
    },

    async request_disclosure(input: DisclosureInput) {
      return invoke("request_disclosure", input, async (caseData, audit) => {
        audit.gated = true;
        const decision = await runtime.gate({ kind: "disclosure", field: input.field, reason: input.reason });
        audit.decision = decision;
        const granted = decision === "approved";
        audit.rawFieldsReleased = granted ? [input.field] : [];
        return granted
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
      });
    },

    async export_packet(input: ExportInput = {}) {
      return invoke("export_packet", input, async (caseData, audit) => {
        const format = input.format ?? "txt";
        if (!caseData.draft) throw new Error("Draft the appeal before exporting the packet.");
        audit.gated = true;
        const decision = await runtime.gate({ kind: "export", reason: "Download the locally personalized appeal packet." });
        audit.decision = decision;
        const approved = decision === "approved";
        if (approved) {
          const contents = rehydrateTokens(caseData.draft.tokenizedText, caseData.rawIdentifiers);
          await runtime.download(contents, format);
        }
        return seal(
          { ok: approved, decision, format, downloaded: approved },
          [],
          caseData.rawIdentifiers,
        );
      });
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

  return `${opening}\n\nRe: Internal appeal for [[NAME]]\nMember: [[MEMBER_ID]]\nDate of birth: [[DOB]]\nClaim: ${caseData.id}\n\nI request reconsideration of the ${caseData.insurer} claim described above. This demonstration packet identifies procedural evidence that should be reviewed; it does not promise an outcome.\n\n${body}\n\nPlease confirm receipt and advise if any additional documentation is required.\n\nSincerely,\n[[NAME]]\n[[ADDRESS]]`;
}

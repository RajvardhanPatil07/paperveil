export type RawField = "patient_name" | "date_of_birth" | "member_id" | "address";
export type RuleStatus = "pass" | "fail" | "needs_evidence";
export type Decision = "approved" | "denied" | "timeout";

export type EvidenceDocument = {
  id: string;
  kind: "eob" | "denial_letter" | "referral" | "itemized_bill";
  title: string;
  receivedAt: string;
  pages: number;
  summary: string;
  present: boolean;
};

export type LineItem = {
  id: string;
  serviceDate: string;
  code: string;
  description: string;
  billed: number;
  allowed: number;
  patientOwes: number;
  suspectedDuplicate?: boolean;
};

export type RuleResult = {
  ruleId: string;
  title: string;
  status: RuleStatus;
  because: string;
  action: string;
  source: string;
  amountAtIssue?: number;
};

export type ScenarioInput = {
  id: string;
  label: string;
  changes: Array<"add_itemized_bill" | "remove_duplicate" | "add_signed_referral">;
};

export type ScenarioResult = {
  id: string;
  label: string;
  readiness: number;
  resolvedRules: string[];
  amountClarified: number;
};

export type AppealGround = {
  ruleId: string;
  heading: string;
  argument: string;
  citation: string;
};

export type AppealDraft = {
  updatedAt: number;
  tone: "formal" | "plain";
  grounds: AppealGround[];
  tokenizedText: string;
};

export type RegistrationEntry = {
  id: string;
  kind: "registration";
  ts: number;
  tool: string;
  descriptionHash: string;
};

export type InvocationEntry = {
  id: string;
  kind: "invocation";
  ts: number;
  tool: string;
  args: unknown;
  result: unknown;
  bytesOut: number;
  rawFieldsReleased: RawField[];
  quasiFieldsExposed: string[];
  gated: boolean;
  decision?: Decision;
};

export type LedgerEntry = RegistrationEntry | InvocationEntry;

export type DemoCase = {
  id: string;
  title: string;
  status: "reviewing" | "ready";
  insurer: string;
  claimAmount: number;
  denialCode: string;
  denialReason: string;
  appealDeadline: string;
  rawIdentifiers: Record<RawField, string>;
  tokens: Record<RawField, string>;
  documents: EvidenceDocument[];
  lineItems: LineItem[];
  ruleResults: RuleResult[];
  scenarios: ScenarioResult[];
  draft: AppealDraft | null;
  ledger: LedgerEntry[];
};

import type { DemoCase, RuleResult, ScenarioInput, ScenarioResult } from "@/lib/domain/types";

const source = (section: string) => `Northstar Member Policy (fictional), ${section}`;

export function evaluateRules(caseData: DemoCase): RuleResult[] {
  const has = (kind: string) => caseData.documents.some((doc) => doc.kind === kind && doc.present);
  const itemizedBill = has("itemized_bill");
  const referralSigned = caseData.documents.some(
    (doc) => doc.kind === "referral" && doc.present && !doc.summary.toLowerCase().includes("no provider signature"),
  );
  const duplicate = caseData.lineItems.find((item) => item.suspectedDuplicate);

  return [
    {
      ruleId: "MB-001",
      title: "Denial reason is reviewable",
      status: caseData.denialCode ? "pass" : "needs_evidence",
      because: `The denial notice identifies ${caseData.denialCode}: ${caseData.denialReason}.`,
      action: "Use the stated reason as the opening appeal ground.",
      source: source("§2.1 Denial notices"),
    },
    {
      ruleId: "MB-014",
      title: "Itemized bill supports the charges",
      status: itemizedBill ? "pass" : "fail",
      because: itemizedBill
        ? "An itemized provider bill is present."
        : "The case includes an EOB but no itemized provider bill.",
      action: itemizedBill
        ? "Bind the itemized charges to the appeal packet."
        : "Request the itemized bill before filing the final packet.",
      source: source("§4.3 Supporting documents"),
    },
    {
      ruleId: "MB-031",
      title: "Duplicate technical charge is reconciled",
      status: duplicate ? "fail" : "pass",
      because: duplicate
        ? `${duplicate.code} appears to duplicate a technical component on the same service date.`
        : "No suspected duplicate charge remains.",
      action: duplicate
        ? `Ask the provider to reconcile the ${money(duplicate.patientOwes)} technical charge.`
        : "Include the reconciled ledger in the packet.",
      source: source("§5.2 Charge reconciliation"),
      amountAtIssue: duplicate?.patientOwes,
    },
    {
      ruleId: "MB-042",
      title: "Referral is authenticated",
      status: referralSigned ? "pass" : has("referral") ? "needs_evidence" : "fail",
      because: referralSigned
        ? "The referral is present and signed."
        : "The referral covers the date of service, but the synthetic copy is unsigned.",
      action: "Obtain a signed referral or provider attestation.",
      source: source("§3.8 Referral evidence"),
    },
    {
      ruleId: "MB-050",
      title: "Appeal window remains open",
      status: new Date(caseData.appealDeadline).getTime() > new Date("2026-09-02").getTime() ? "pass" : "fail",
      because: `The fictional policy deadline is ${caseData.appealDeadline}.`,
      action: "Submit before the date printed on the denial notice.",
      source: source("§7.1 Internal appeal window"),
    },
    {
      ruleId: "MB-061",
      title: "Claim total reconciles",
      status: caseData.lineItems.reduce((total, item) => total + item.billed, 0) === caseData.claimAmount ? "pass" : "fail",
      because: "The three listed charges total $4,200, matching the claim face value.",
      action: "Keep the line-item total visible in the cover sheet.",
      source: source("§5.1 Claim totals"),
    },
  ];
}

export function simulateScenarios(caseData: DemoCase, scenarios: ScenarioInput[]): ScenarioResult[] {
  return scenarios.slice(0, 4).map((scenario) => {
    const copy = structuredClone(caseData);
    const before = evaluateRules(copy);

    if (scenario.changes.includes("add_itemized_bill")) {
      const doc = copy.documents.find((item) => item.kind === "itemized_bill");
      if (doc) {
        doc.present = true;
        doc.pages = 2;
        doc.receivedAt = "2026-09-03";
      }
    }
    if (scenario.changes.includes("remove_duplicate")) {
      copy.lineItems = copy.lineItems.map((item) => ({ ...item, suspectedDuplicate: false }));
    }
    if (scenario.changes.includes("add_signed_referral")) {
      const doc = copy.documents.find((item) => item.kind === "referral");
      if (doc) doc.summary = "Signed referral covers the date and imaging service.";
    }

    const after = evaluateRules(copy);
    const resolvedRules = after
      .filter((rule) => rule.status === "pass" && before.find((item) => item.ruleId === rule.ruleId)?.status !== "pass")
      .map((rule) => rule.ruleId);
    const passed = after.filter((rule) => rule.status === "pass").length;

    return {
      id: scenario.id,
      label: scenario.label,
      readiness: Math.round((passed / after.length) * 100),
      resolvedRules,
      amountClarified: scenario.changes.includes("remove_duplicate") ? 850 : 0,
    };
  });
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

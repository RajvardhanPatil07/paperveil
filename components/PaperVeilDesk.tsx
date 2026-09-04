"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Copy,
  FileCheck2,
  FileDown,
  FileText,
  FlaskConical,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  ScanSearch,
  Shield,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import fixture from "@/fixtures/demo-case.json";
import type { AppealGround, DemoCase, RuleResult, ScenarioInput } from "@/lib/domain/types";
import { evaluateRules } from "@/lib/rules/engine";
import { rehydrateTokens } from "@/lib/vault/redaction";
import { demoCaseOptions, loadDemoCase, resetDemoCase, selectDemoCase, subscribeToState } from "@/lib/vault/store";
import { subscribeToHumanGate, type PendingGate } from "@/lib/webmcp/human-gate";
import { humanToolHandlers, registerPaperVeilTools, toolDefinitions } from "@/lib/webmcp/register";
import { GateDialog } from "@/components/GateDialog";
import { LedgerRail } from "@/components/LedgerRail";
import { PaperTooltip, PaperTooltipProvider } from "@/components/ui/PaperTooltip";

type View = "desk" | "strategy" | "packet";
const demoPrompt = "Use the PaperVeil site tools to review this denied claim. First list the evidence and run the policy checks. Compare filing now with adding the missing evidence and reconciling any duplicate charge. Then request only date_of_birth for the appeal header so I can demonstrate the privacy gate. If I deny it, continue with [[DOB]] and draft the appeal anyway. Do not request any other raw identifier and do not export until I ask.";

export function PaperVeilDesk() {
  const [caseData, setCaseData] = useState<DemoCase>(structuredClone(fixture) as DemoCase);
  const [view, setView] = useState<View>("desk");
  const [gate, setGate] = useState<PendingGate | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toolCount, setToolCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [revealLocal, setRevealLocal] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const [guideOpen, setGuideOpen] = useState(true);
  const workbenchRef = useRef<HTMLElement>(null);
  const previousView = useRef<View>(view);

  const refresh = useCallback(async () => setCaseData(await loadDemoCase()), []);
  const closeGate = useCallback(() => setGate(null), []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    const unsubscribe = subscribeToState(() => void refresh());
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [refresh]);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  useEffect(() => subscribeToHumanGate(setGate), []);

  useEffect(() => {
    const controller = new AbortController();
    void registerPaperVeilTools(controller.signal).then(setToolCount).catch(() => setToolCount(0));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (previousView.current === view) return;
    previousView.current = view;
    workbenchRef.current?.scrollIntoView({ block: "start" });
    window.requestAnimationFrame(() => document.getElementById(`view-${view}-title`)?.focus());
  }, [view]);

  const rules = caseData.ruleResults.length ? caseData.ruleResults : evaluateRules(caseData);
  const defects = rules.filter((rule) => rule.status !== "pass");
  const readyRules = rules.filter((rule) => rule.status === "pass").length;
  const modelView = caseData.draft?.tokenizedText ?? "The draft receipt will appear here after the agent supplies appeal grounds.";
  const localView = caseData.draft ? rehydrateTokens(caseData.draft.tokenizedText, caseData.rawIdentifiers) : modelView;
  const invocations = caseData.ledger.filter((entry) => entry.kind === "invocation");
  const agentInvocations = invocations.filter((entry) => entry.origin === "webmcp");
  const releasedFields = new Set(invocations.flatMap((entry) => entry.rawFieldsReleased));
  const deniedDisclosure = invocations.some((entry) => entry.tool === "request_disclosure" && entry.decision !== "approved");
  const privacySuccess = deniedDisclosure && Boolean(caseData.draft) && releasedFields.size === 0;

  const runAction = async (name: string, action: () => Promise<unknown>, nextView?: View, success?: string) => {
    if (busy) return;
    disarmReset();
    setBusy(name);
    try {
      await action();
      await refresh();
      if (nextView) setView(nextView);
      if (success) toast.success(success);
    } catch {
      toast.error("The action could not be completed. Your local case is unchanged; try again.");
    } finally {
      setBusy(null);
    }
  };

  const analyze = () => runAction("analyze", () => humanToolHandlers.check_rules({}), "strategy");
  const simulate = () => {
    const scenarios: ScenarioInput[] = [
      { id: "now", label: "Appeal with current evidence", changes: [] },
      { id: "complete", label: "Complete the evidence packet", changes: ["add_itemized_bill", "add_signed_referral", "remove_duplicate"] },
    ];
    return runAction("simulate", () => humanToolHandlers.simulate_outcomes({ scenarios }), "strategy");
  };
  const draft = () => runAction("draft", () => humanToolHandlers.draft_appeal({ grounds: defaultGrounds(rules), tone: "formal" }), "packet");
  const disclosureDemo = () => runAction("disclose", () => humanToolHandlers.request_disclosure({
    field: "date_of_birth",
    reason: "Place the birth date in the appeal header. A placeholder also works.",
  }));
  const exportPacket = () => runAction("export", () => humanToolHandlers.export_packet({ format: "txt" }), undefined, "Personalized packet downloaded locally.");

  const switchCase = (caseId: string) => runAction("switch", async () => {
    const selected = await selectDemoCase(caseId);
    setCaseData(selected);
    setView("desk");
    setRevealLocal(false);
  }, undefined, "Demo case switched. The same seven tools now operate on the new local case.");

  const disarmReset = useCallback(() => {
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
    setConfirmReset(false);
  }, []);

  const reset = async () => {
    if (busy) return;
    if (!confirmReset) {
      setConfirmReset(true);
      resetTimer.current = window.setTimeout(disarmReset, 4000);
      return;
    }
    disarmReset();
    setBusy("reset");
    try {
      await resetDemoCase();
      setView("desk");
      setRevealLocal(false);
      await refresh();
      toast.success("Demo case reset.");
    } catch {
      toast.error("The demo could not be reset. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const navigate = (nextView: View) => {
    if (confirmReset) disarmReset();
    setView(nextView);
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(demoPrompt);
      setCopied(true);
      toast.success("Demo prompt copied.");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy the demo prompt. Try again.");
    }
  };

  const nav = [
    { id: "desk" as const, label: "Case desk", icon: FileText },
    { id: "strategy" as const, label: "Strategy", icon: ScanSearch },
    { id: "packet" as const, label: "Packet", icon: FileCheck2 },
  ];
  const busyLabel = busy ? ({
    analyze: "Checking rules…",
    simulate: "Comparing paths…",
    draft: "Preparing packet…",
    disclose: "Opening privacy gate…",
    export: "Exporting packet…",
    reset: "Resetting demo…",
    switch: "Switching case…",
  }[busy] ?? "Working…") : "";

  return (
    <PaperTooltipProvider>
    <main className="app-shell" aria-busy={Boolean(busy)}>
      <p className="sr-only" role="status" aria-live="polite">{busyLabel || `${nav.find((item) => item.id === view)?.label} view opened.`}</p>
      <aside className="side-nav">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <div><strong>PaperVeil</strong><small>local claim desk</small></div>
        </div>

        <nav aria-label="Case workflow">
          {nav.map((item) => (
            <PaperTooltip label={item.label} key={item.id}>
              <button className={view === item.id ? "active" : ""} aria-label={item.label} aria-current={view === item.id ? "page" : undefined} onClick={() => navigate(item.id)}>
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.id === "packet" && caseData.draft ? <Check size={15} className="nav-check" /> : null}
              </button>
            </PaperTooltip>
          ))}
        </nav>

        <div className="boundary-note">
          <LockKeyhole size={18} />
          <strong>Local vault</strong>
          <p>Raw identity stays in this browser until you approve one field.</p>
        </div>
        <PaperTooltip label={confirmReset ? "Confirm reset" : "Reset demo"}>
          <button className={`reset-button${confirmReset ? " armed" : ""}`} onClick={reset} disabled={Boolean(busy)}>
            {confirmReset ? <TriangleAlert size={15} /> : <RotateCcw size={15} />}
            {confirmReset ? "Confirm reset?" : "Reset demo"}
          </button>
        </PaperTooltip>
      </aside>

      <section className="workbench" ref={workbenchRef}>
        <header className="topbar">
          <label className="case-picker">
            <span>Demo case</span>
            <select value={caseData.id} disabled={Boolean(busy)} onChange={(event) => void switchCase(event.target.value)}>
              {demoCaseOptions.map((option) => <option key={option.id} value={option.id}>{option.id} · {option.title}</option>)}
            </select>
          </label>
          <div className="topbar-actions">
            <span className={`tool-status ${toolCount ? "connected" : "preview"}`}>
              <span /> {toolCount ? `${toolCount} site tools connected` : `${toolDefinitions.length} tools ready · preview`}
            </span>
            <button className="button button-prompt" onClick={copyPrompt}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy demo prompt"}</button>
            <span className="visually-hidden" role="status">{copied ? "Demo prompt copied to clipboard." : ""}</span>
          </div>
        </header>

        <div className="notice-bar" role="note">
          <FlaskConical size={15} />
          <span><strong>Synthetic demonstration.</strong> Fictional policy and patient data; not medical or legal advice.</span>
        </div>

        {guideOpen ? (
          <JudgeGuide
            agentInvocations={agentInvocations}
            draftReady={Boolean(caseData.draft)}
            onDismiss={() => setGuideOpen(false)}
          />
        ) : null}

        <div className="mobile-proof-summary" aria-label="Current disclosure proof">
          <strong>{releasedFields.size}/4 raw identifiers released</strong>
          <span>{agentInvocations.length} agent calls · {invocations.filter((entry) => entry.origin === "human-ui").length} human actions</span>
        </div>

        {privacySuccess ? (
          <div className="privacy-success" role="status">
            <CheckCircle2 size={20} />
            <span><strong>DOB denied. Appeal drafted. 0 raw identifiers released.</strong> The workflow continued with a local token.</span>
          </div>
        ) : null}

        {view === "desk" ? (
          <DeskView caseData={caseData} rules={rules} defects={defects} busy={busy} onAnalyze={analyze} onDisclosure={disclosureDemo} />
        ) : view === "strategy" ? (
          <StrategyView caseData={caseData} rules={rules} readyRules={readyRules} busy={busy} onSimulate={simulate} onDraft={draft} />
        ) : (
          <PacketView caseData={caseData} modelView={modelView} localView={localView} revealLocal={revealLocal} setRevealLocal={setRevealLocal} busy={busy} onDraft={draft} onExport={exportPacket} />
        )}
      </section>

      <LedgerRail caseData={caseData} registeredToolCount={toolCount} />
      <GateDialog gate={gate} onClose={closeGate} />
    </main>
    </PaperTooltipProvider>
  );
}

function JudgeGuide({ agentInvocations, draftReady, onDismiss }: {
  agentInvocations: Array<{ tool: string; decision?: string }>;
  draftReady: boolean;
  onDismiss: () => void;
}) {
  const inspected = agentInvocations.some((entry) => entry.tool === "check_rules");
  const denied = agentInvocations.some((entry) => entry.tool === "request_disclosure" && entry.decision !== "approved");
  const drafted = agentInvocations.some((entry) => entry.tool === "draft_appeal") || (denied && draftReady);
  const steps = [
    { label: "Agent inspects", detail: "Run evidence + policy tools", complete: inspected },
    { label: "You deny DOB", detail: "Use the safe token instead", complete: denied },
    { label: "Agent continues", detail: "Draft stays browser-local", complete: drafted },
    { label: "Browser exports", detail: "Personalize only after approval", complete: agentInvocations.some((entry) => entry.tool === "export_packet" && entry.decision === "approved") },
  ];

  return (
    <section className="judge-guide" aria-label="Judge walkthrough">
      <div className="guide-heading">
        <div><strong>90-second judge walkthrough</strong><span>Copy the prompt, then watch each boundary event become provable.</span></div>
        <button onClick={onDismiss}>Dismiss guide</button>
      </div>
      <ol>{steps.map((step, index) => (
        <li className={step.complete ? "complete" : ""} key={step.label}>
          <span>{step.complete ? <Check size={13} /> : index + 1}</span>
          <div><strong>{step.label}</strong><small>{step.detail}</small></div>
        </li>
      ))}</ol>
    </section>
  );
}

function DeskView({ caseData, rules, defects, busy, onAnalyze, onDisclosure }: {
  caseData: DemoCase;
  rules: RuleResult[];
  defects: RuleResult[];
  busy: string | null;
  onAnalyze: () => void;
  onDisclosure: () => void;
}) {
  const isBusy = Boolean(busy);
  return (
    <div className="view-panel desk-view">
      <section className="case-heading">
        <div>
          <div className="case-state"><span /> procedural review open</div>
          <h1 id="view-desk-title" tabIndex={-1}>{caseData.title}</h1>
          <p>{caseData.insurer} denied the claim for <strong>{caseData.denialReason.toLowerCase()}</strong>. PaperVeil checks the evidence without returning raw identity.</p>
        </div>
        <div className="claim-total"><span>Claim face value</span><strong>{money(caseData.claimAmount)}</strong><small>{caseData.lineItems.length} line items · synthetic</small></div>
      </section>

      <section className="diagnostic-strip">
        <div className="diagnostic-icon"><TriangleAlert size={21} /></div>
        <div><strong>{defects.length} procedural issues need attention</strong><p>{defectSummary(defects)}</p></div>
        <button className="button button-dark" onClick={onAnalyze} disabled={isBusy}>
          {busy === "analyze" ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
          {busy === "analyze" ? "Checking rules…" : "Run rule check"}
        </button>
      </section>

      <div className="desk-grid">
        <section className="evidence-board">
          <header className="section-heading"><div><h2>Evidence on the light table</h2><p>Tokenized summaries are safe for tool return.</p></div><span>{caseData.documents.filter((doc) => doc.present).length}/{caseData.documents.length} present</span></header>
          <div className="document-stack">
            {caseData.documents.map((doc) => (
              <article className={`evidence-row ${doc.present ? "present" : "missing"}`} key={doc.id}>
                <span className="doc-sheet"><FileText size={17} /></span>
                <div><strong>{doc.title}</strong><p>{doc.summary}</p><small>{doc.present ? `${doc.pages} page${doc.pages === 1 ? "" : "s"} · ${doc.receivedAt}` : "Required evidence gap"}</small></div>
                <span className="evidence-status">{doc.present ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}{doc.present ? "present" : "missing"}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="claim-sheet">
          <header><span>EXPLANATION OF BENEFITS</span><small>synthetic record</small></header>
          <div className="token-line"><span>Patient</span><strong>[[NAME]]</strong></div>
          <div className="token-line"><span>Member</span><strong>[[MEMBER_ID]]</strong></div>
          <div className="denial-stamp"><span>{caseData.denialCode}</span><strong>INCOMPLETE</strong><small>{caseData.denialReason}</small></div>
          <table>
            <thead><tr><th>Code</th><th>Charge</th><th>You owe</th></tr></thead>
            <tbody>{caseData.lineItems.map((item) => <tr key={item.id} className={item.suspectedDuplicate ? "flagged" : ""}><td>{item.code}</td><td>{money(item.billed)}</td><td>{money(item.patientOwes)}</td></tr>)}</tbody>
          </table>
          <button className="disclosure-demo" onClick={onDisclosure} disabled={isBusy && busy !== "disclose"}>
            {busy === "disclose" ? <LoaderCircle className="spin" size={16} /> : <KeyRound size={16} />}
            <span><strong>{busy === "disclose" ? "Opening privacy gate…" : "Test the privacy gate"}</strong><small>Ask for DOB, then deny it</small></span><ArrowRight size={16} />
          </button>
        </section>
      </div>
      <p className="rules-footnote">{rules.length} deterministic checks · fictional policy citations · agent outputs capped at 1,500 bytes</p>
    </div>
  );
}

function StrategyView({ caseData, rules, readyRules, busy, onSimulate, onDraft }: {
  caseData: DemoCase;
  rules: RuleResult[];
  readyRules: number;
  busy: string | null;
  onSimulate: () => void;
  onDraft: () => void;
}) {
  const isBusy = Boolean(busy);
  const defaultOpenRules = rules.filter((rule) => rule.status !== "pass").map((rule) => rule.ruleId);
  return (
    <div className="view-panel strategy-view">
      <section className="strategy-heading">
        <div><h1 id="view-strategy-title" tabIndex={-1}>Build the appeal around checkable defects.</h1><p>The case is strongest when every unresolved requirement is addressed before filing.</p></div>
        <div className="readiness"><span>{Math.round((readyRules / rules.length) * 100)}%</span><small>packet readiness</small></div>
      </section>
      <div className="strategy-grid">
        <section className="rule-list">
          <header className="section-heading"><div><h2>Policy checks</h2><p>Each result carries a source label the agent can cite.</p></div></header>
          <Accordion.Root type="multiple" defaultValue={defaultOpenRules}>
            {rules.map((rule) => <RuleRow key={rule.ruleId} rule={rule} />)}
          </Accordion.Root>
        </section>
        <section className="scenario-panel">
          <header><h2>Scenario comparison</h2><p>Ask what changes before committing to an appeal strategy.</p></header>
          {caseData.scenarios.length ? (
            <div className="scenario-results">
              {caseData.scenarios.map((scenario, index) => (
                <div className={`scenario ${index === 1 ? "recommended" : ""}`} key={scenario.id}>
                  <div><strong>{scenario.label}</strong>{index === 1 ? <span>projected · recommended</span> : <span>current</span>}</div>
                  <b>{scenario.readiness}%</b>
                  <div className="readiness-bar"><span style={{ width: `${scenario.readiness}%` }} /></div>
                  <p>{scenario.resolvedRules.length ? `${Math.round((readyRules / rules.length) * 100)}% now → ${scenario.readiness}% if ${scenario.resolvedRules.length} requirements are resolved${scenario.amountClarified ? ` · ${money(scenario.amountClarified)} clarified` : ""}` : "Current evidence; no requirements resolved"}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="scenario-empty"><ClipboardCheck size={28} /><strong>No comparison yet</strong><p>Compare filing now with completing the evidence packet first.</p></div>
          )}
          <button className="button button-outline wide" onClick={onSimulate} disabled={isBusy}>{busy === "simulate" ? <LoaderCircle className="spin" size={17} /> : <ScanSearch size={17} />}{busy === "simulate" ? "Comparing paths…" : "Compare two paths"}</button>
          <button className="button button-coral wide" onClick={onDraft} disabled={isBusy}>{busy === "draft" ? <LoaderCircle className="spin" size={17} /> : <FileCheck2 size={17} />}{busy === "draft" ? "Preparing packet…" : defectsRemain(rules) ? "Create draft with current gaps" : "Prepare appeal packet"}</button>
        </section>
      </div>
    </div>
  );
}

function RuleRow({ rule }: { rule: RuleResult }) {
  return (
    <Accordion.Item className={`rule-row ${rule.status}`} value={rule.ruleId}>
      <Accordion.Header>
        <Accordion.Trigger>
          <span className="rule-status">{rule.status === "pass" ? <Check size={15} /> : rule.status === "fail" ? <TriangleAlert size={15} /> : <CircleAlert size={15} />}</span>
          <span><small>{rule.ruleId}</small><strong>{rule.title}</strong></span>
          {rule.amountAtIssue ? <b>{money(rule.amountAtIssue)}</b> : <em>{rule.status.replace("_", " ")}</em>}
          <ChevronDown className="accordion-chevron" size={15} aria-hidden="true" />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="rule-content">
        <div><p>{rule.because}</p><span>{rule.action}</span><cite>{rule.source}</cite></div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

function PacketView({ caseData, modelView, localView, revealLocal, setRevealLocal, busy, onDraft, onExport }: {
  caseData: DemoCase;
  modelView: string;
  localView: string;
  revealLocal: boolean;
  setRevealLocal: (value: boolean) => void;
  busy: string | null;
  onDraft: () => void;
  onExport: () => void;
}) {
  const isBusy = Boolean(busy);
  const receipt = caseData.draft ? JSON.stringify({ ok: true, grounds: caseData.draft.grounds.length, tokensUsed: ["[[NAME]]", "[[MEMBER_ID]]", "[[ADDRESS]]"], view: "/#packet" }, null, 2) : "Waiting for draft_appeal…";

  const copyReceipt = async () => {
    if (!caseData.draft) return;
    try {
      await navigator.clipboard.writeText(receipt);
      toast.success("Draft receipt copied.");
    } catch {
      toast.error("Could not copy the draft receipt. Try again.");
    }
  };

  return (
    <div className="view-panel packet-view" id="packet">
      <section className="packet-heading">
        <div><h1 id="view-packet-title" tabIndex={-1}>One letter. Two visibility levels.</h1><p>The tool returns a receipt. The browser keeps the draft and performs identity substitution locally.</p></div>
        <div className="packet-actions">
          {!caseData.draft ? <button className="button button-dark" onClick={onDraft} disabled={isBusy}>{busy === "draft" ? <LoaderCircle className="spin" size={17} /> : <FileCheck2 size={17} />}{busy === "draft" ? "Preparing packet…" : "Create demo draft"}</button> : null}
          <button className="button button-coral" disabled={!caseData.draft || isBusy} onClick={onExport}>{busy === "export" ? <LoaderCircle className="spin" size={17} /> : <FileDown size={17} />}{busy === "export" ? "Exporting packet…" : "Export locally"}</button>
        </div>
      </section>
      <div className="packet-grid">
        <section className="model-pane">
          <header><div><Shield size={17} /><span>Tool boundary</span></div><strong>What site tools may return</strong></header>
          <div className="receipt-card">
            <div><span>draft_appeal receipt</span><button className="model-copy" onClick={() => void copyReceipt()} disabled={!caseData.draft}><Copy size={13} /> Copy</button></div>
            <pre>{receipt}</pre>
          </div>
          <div className="token-preview"><span>Stored local draft</span><p>{modelView.slice(0, 440)}{modelView.length > 440 ? "…" : ""}</p></div>
          <div className="boundary-verdict"><CheckCircle2 size={18} /><span><strong>No packet prose returned.</strong> The agent receives only the receipt shown above.</span></div>
        </section>
        <section className="letter-pane">
          <header><div><span>Local packet preview</span><small>{revealLocal ? "identifiers visible in this tab" : "tokens visible"}</small></div><label className="reveal-toggle"><input type="checkbox" checked={revealLocal} onChange={(event) => setRevealLocal(event.target.checked)} /><span /><b>Reveal locally</b></label></header>
          <article className={`letter-paper ${revealLocal ? "revealed" : ""}`}>
            <div className="letter-watermark">PAPER<span>VEIL</span></div>
            <pre>{revealLocal ? localView : modelView}</pre>
          </article>
        </section>
      </div>
      <p className="packet-caveat"><CircleAlert size={15} /> Revealing identifiers changes what is visible on the page, but does not place them in a WebMCP tool result. Dates, codes, and amounts remain quasi-identifiers.</p>
    </div>
  );
}

function defaultGrounds(rules: RuleResult[]): AppealGround[] {
  return rules.filter((rule) => rule.status !== "pass").map((rule) => ({
    ruleId: rule.ruleId,
    heading: rule.title,
    argument: `${rule.because} ${rule.action}`,
    citation: rule.source,
  }));
}

function defectsRemain(rules: RuleResult[]) {
  return rules.some((rule) => rule.status !== "pass");
}

function defectSummary(defects: RuleResult[]) {
  const duplicate = defects.find((rule) => rule.amountAtIssue);
  const evidence = defects.filter((rule) => !rule.amountAtIssue).map((rule) => rule.title.toLowerCase());
  if (duplicate) return `The strongest financial defect is an unreconciled ${money(duplicate.amountAtIssue ?? 0)} charge. ${evidence.length ? `Also review: ${evidence.join("; ")}.` : ""}`;
  if (evidence.length) return `The open requirements are ${evidence.join("; ")}.`;
  return "No procedural defects remain in this synthetic case.";
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

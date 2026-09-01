"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
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
import { loadDemoCase, resetDemoCase, subscribeToState } from "@/lib/vault/store";
import { subscribeToHumanGate, type PendingGate } from "@/lib/webmcp/human-gate";
import { browserToolHandlers, registerPaperVeilTools, toolDefinitions } from "@/lib/webmcp/register";
import { GateDialog } from "@/components/GateDialog";
import { LedgerRail } from "@/components/LedgerRail";

type View = "desk" | "strategy" | "packet";
const demoPrompt = "Review this denied claim, identify fixable paperwork defects, compare my options, and prepare an appeal without requesting personal identifiers unless strictly necessary.";

export function PaperVeilDesk() {
  const [caseData, setCaseData] = useState<DemoCase>(structuredClone(fixture) as DemoCase);
  const [view, setView] = useState<View>("desk");
  const [gate, setGate] = useState<PendingGate | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toolCount, setToolCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [revealLocal, setRevealLocal] = useState(false);

  const refresh = useCallback(async () => setCaseData(await loadDemoCase()), []);
  const closeGate = useCallback(() => setGate(null), []);

  useEffect(() => {
    void refresh();
    return subscribeToState(() => void refresh());
  }, [refresh]);

  useEffect(() => subscribeToHumanGate(setGate), []);

  useEffect(() => {
    const controller = new AbortController();
    void registerPaperVeilTools(controller.signal).then(setToolCount).catch(() => setToolCount(0));
    return () => controller.abort();
  }, []);

  const rules = caseData.ruleResults.length ? caseData.ruleResults : evaluateRules(caseData);
  const defects = rules.filter((rule) => rule.status !== "pass");
  const readyRules = rules.filter((rule) => rule.status === "pass").length;
  const modelView = caseData.draft?.tokenizedText ?? "The draft receipt will appear here after the agent supplies appeal grounds.";
  const localView = caseData.draft ? rehydrateTokens(caseData.draft.tokenizedText, caseData.rawIdentifiers) : modelView;

  const runAction = async (name: string, action: () => Promise<unknown>, nextView?: View) => {
    setBusy(name);
    try {
      await action();
      await refresh();
      if (nextView) setView(nextView);
    } finally {
      setBusy(null);
    }
  };

  const analyze = () => runAction("analyze", () => browserToolHandlers.check_rules({}), "strategy");
  const simulate = () => {
    const scenarios: ScenarioInput[] = [
      { id: "now", label: "Appeal with current evidence", changes: [] },
      { id: "complete", label: "Complete the evidence packet", changes: ["add_itemized_bill", "add_signed_referral", "remove_duplicate"] },
    ];
    return runAction("simulate", () => browserToolHandlers.simulate_outcomes({ scenarios }), "strategy");
  };
  const draft = () => runAction("draft", () => browserToolHandlers.draft_appeal({ grounds: defaultGrounds(rules), tone: "formal" }), "packet");
  const disclosureDemo = () => runAction("disclose", () => browserToolHandlers.request_disclosure({
    field: "date_of_birth",
    reason: "Place the birth date in the appeal header. A placeholder also works.",
  }));
  const exportPacket = () => runAction("export", () => browserToolHandlers.export_packet({ format: "txt" }));

  const reset = async () => {
    await resetDemoCase();
    setView("desk");
    setRevealLocal(false);
    await refresh();
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(demoPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const nav = [
    { id: "desk" as const, label: "Case desk", icon: FileText },
    { id: "strategy" as const, label: "Strategy", icon: ScanSearch },
    { id: "packet" as const, label: "Packet", icon: FileCheck2 },
  ];

  return (
    <main className="app-shell">
      <aside className="side-nav">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <div><strong>PaperVeil</strong><small>local claim desk</small></div>
        </div>

        <nav aria-label="Case workflow">
          {nav.map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id === "packet" && caseData.draft ? <Check size={15} className="nav-check" /> : null}
            </button>
          ))}
        </nav>

        <div className="boundary-note">
          <LockKeyhole size={18} />
          <strong>Local vault</strong>
          <p>Raw identity stays in this browser until you approve one field.</p>
        </div>
        <button className="reset-button" onClick={reset}><RotateCcw size={15} /> Reset demo</button>
      </aside>

      <section className="workbench">
        <header className="topbar">
          <div className="case-crumb"><span>Case</span><ChevronRight size={14} /><strong>{caseData.id}</strong></div>
          <div className="topbar-actions">
            <span className={`tool-status ${toolCount ? "connected" : "preview"}`}>
              <span /> {toolCount ? `${toolCount} site tools connected` : `${toolDefinitions.length} tools ready · preview`}
            </span>
            <button className="button button-prompt" onClick={copyPrompt}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy demo prompt"}</button>
          </div>
        </header>

        <div className="notice-bar" role="note">
          <FlaskConical size={15} />
          <span><strong>Synthetic demonstration.</strong> Fictional policy and patient data; not medical or legal advice.</span>
        </div>

        {view === "desk" ? (
          <DeskView caseData={caseData} rules={rules} defects={defects} busy={busy} onAnalyze={analyze} onDisclosure={disclosureDemo} />
        ) : view === "strategy" ? (
          <StrategyView caseData={caseData} rules={rules} readyRules={readyRules} busy={busy} onSimulate={simulate} onDraft={draft} />
        ) : (
          <PacketView caseData={caseData} modelView={modelView} localView={localView} revealLocal={revealLocal} setRevealLocal={setRevealLocal} busy={busy} onDraft={draft} onExport={exportPacket} />
        )}
      </section>

      <LedgerRail caseData={caseData} />
      <GateDialog gate={gate} onClose={closeGate} />
    </main>
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
  return (
    <div className="view-panel desk-view">
      <section className="case-heading">
        <div>
          <div className="case-state"><span /> procedural review open</div>
          <h1>{caseData.title}</h1>
          <p>{caseData.insurer} denied the claim for <strong>{caseData.denialReason.toLowerCase()}</strong>. PaperVeil checks the evidence without returning raw identity.</p>
        </div>
        <div className="claim-total"><span>Claim face value</span><strong>{money(caseData.claimAmount)}</strong><small>{caseData.lineItems.length} line items · synthetic</small></div>
      </section>

      <section className="diagnostic-strip">
        <div className="diagnostic-icon"><TriangleAlert size={21} /></div>
        <div><strong>{defects.length} procedural issues need attention</strong><p>The strongest specific defect is an unreconciled <b>$850</b> technical component. An itemized bill is also missing.</p></div>
        <button className="button button-dark" onClick={onAnalyze} disabled={busy === "analyze"}>
          {busy === "analyze" ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} Run rule check
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
          <button className="disclosure-demo" onClick={onDisclosure} disabled={busy === "disclose"}>
            <KeyRound size={16} /><span><strong>Test the privacy gate</strong><small>Ask for DOB, then deny it</small></span><ArrowRight size={16} />
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
  return (
    <div className="view-panel strategy-view">
      <section className="strategy-heading">
        <div><h1>Build the appeal around checkable defects.</h1><p>The case is strongest when missing evidence and the duplicate charge are resolved before filing.</p></div>
        <div className="readiness"><span>{Math.round((readyRules / rules.length) * 100)}%</span><small>packet readiness</small></div>
      </section>
      <div className="strategy-grid">
        <section className="rule-list">
          <header className="section-heading"><div><h2>Policy checks</h2><p>Each result carries a source label the agent can cite.</p></div></header>
          {rules.map((rule) => <RuleRow key={rule.ruleId} rule={rule} />)}
        </section>
        <section className="scenario-panel">
          <header><h2>Scenario comparison</h2><p>Ask what changes before committing to an appeal strategy.</p></header>
          {caseData.scenarios.length ? (
            <div className="scenario-results">
              {caseData.scenarios.map((scenario, index) => (
                <div className={`scenario ${index === 1 ? "recommended" : ""}`} key={scenario.id}>
                  <div><strong>{scenario.label}</strong>{index === 1 ? <span>recommended</span> : null}</div>
                  <b>{scenario.readiness}%</b>
                  <div className="readiness-bar"><span style={{ width: `${scenario.readiness}%` }} /></div>
                  <p>{scenario.resolvedRules.length ? `${scenario.resolvedRules.length} defects resolved · ${money(scenario.amountClarified)} clarified` : "Current evidence; no defects resolved"}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="scenario-empty"><ClipboardCheck size={28} /><strong>No comparison yet</strong><p>Compare filing now with completing the evidence packet first.</p></div>
          )}
          <button className="button button-outline wide" onClick={onSimulate} disabled={busy === "simulate"}>{busy === "simulate" ? <LoaderCircle className="spin" size={17} /> : <ScanSearch size={17} />} Compare two paths</button>
          <button className="button button-coral wide" onClick={onDraft} disabled={busy === "draft"}>{busy === "draft" ? <LoaderCircle className="spin" size={17} /> : <FileCheck2 size={17} />} Prepare appeal packet</button>
        </section>
      </div>
    </div>
  );
}

function RuleRow({ rule }: { rule: RuleResult }) {
  return (
    <details className={`rule-row ${rule.status}`} open={rule.status !== "pass"}>
      <summary><span className="rule-status">{rule.status === "pass" ? <Check size={15} /> : rule.status === "fail" ? <TriangleAlert size={15} /> : <CircleAlert size={15} />}</span><span><small>{rule.ruleId}</small><strong>{rule.title}</strong></span>{rule.amountAtIssue ? <b>{money(rule.amountAtIssue)}</b> : <em>{rule.status.replace("_", " ")}</em>}</summary>
      <div><p>{rule.because}</p><span>{rule.action}</span><cite>{rule.source}</cite></div>
    </details>
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
  return (
    <div className="view-panel packet-view" id="packet">
      <section className="packet-heading">
        <div><h1>One letter. Two visibility levels.</h1><p>The tool returns a receipt. The browser keeps the draft and performs identity substitution locally.</p></div>
        <div className="packet-actions">
          {!caseData.draft ? <button className="button button-dark" onClick={onDraft}><FileCheck2 size={17} /> Create demo draft</button> : null}
          <button className="button button-coral" disabled={!caseData.draft || busy === "export"} onClick={onExport}><FileDown size={17} /> Export locally</button>
        </div>
      </section>
      <div className="packet-grid">
        <section className="model-pane">
          <header><div><Shield size={17} /><span>Tool boundary</span></div><strong>What site tools may return</strong></header>
          <div className="receipt-card"><span>draft_appeal receipt</span><pre>{caseData.draft ? JSON.stringify({ ok: true, grounds: caseData.draft.grounds.length, tokensUsed: ["[[NAME]]", "[[MEMBER_ID]]", "[[ADDRESS]]"], view: "/#packet" }, null, 2) : "Waiting for draft_appeal…"}</pre></div>
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

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { toast } from "sonner";
import { Braces, ChevronDown, Copy, Download, EyeOff, Fingerprint, Radio, ShieldAlert, ShieldCheck } from "lucide-react";
import type { DemoCase, InvocationEntry } from "@/lib/domain/types";
import { PaperTooltip } from "@/components/ui/PaperTooltip";

export function LedgerRail({ caseData, registeredToolCount }: { caseData: DemoCase; registeredToolCount: number }) {
  const invocations = caseData.ledger.filter((entry): entry is InvocationEntry => entry.kind === "invocation");
  const agentInvocations = invocations.filter((entry) => entry.origin === "webmcp");
  const released = new Set(agentInvocations.flatMap((entry) => entry.rawFieldsReleased));
  const quasi = new Set(agentInvocations.flatMap((entry) => entry.quasiFieldsExposed));
  const linkage = linkageRisk(quasi);
  const blocked = agentInvocations.filter((entry) => entry.outcome === "blocked").length;
  const visible = invocations.slice(-8).reverse();

  const exportLedger = () => {
    const blob = new Blob([JSON.stringify(caseData.ledger, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "paperveil-disclosure-log.json";
    anchor.click();
    URL.revokeObjectURL(href);
    toast.success("Disclosure log downloaded locally.");
  };

  const copyReceipt = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Exact tool result copied.");
    } catch {
      toast.error("Could not copy the tool result. Try again.");
    }
  };

  return (
    <aside className="ledger-rail" aria-label="Disclosure ledger">
      <header className="ledger-header">
        <div>
          <p>Disclosure ledger</p>
          <h2>Boundary activity</h2>
        </div>
        <span className="live-dot"><Radio size={14} /> live</span>
      </header>

      <div className="ledger-counters">
        <div className="ledger-counter primary">
          <EyeOff size={17} />
          <strong>{released.size}</strong>
          <span>of 4 raw identifiers released</span>
        </div>
        <div className="ledger-counter">
          <Fingerprint size={17} />
          <strong>{quasi.size}</strong>
          <span>quasi-identifier types exposed</span>
        </div>
      </div>

      <div className="ledger-proof">
        {blocked ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
        <p><strong>{blocked ? `${blocked} privacy block${blocked === 1 ? "" : "s"} observed.` : "The boundary is inspectable."}</strong> Successful and rejected calls remain separately visible in this browser.</p>
      </div>

      <div className={`linkage-assessment ${linkage.level}`}>
        <span>Cumulative linkage risk</span>
        <strong>{linkage.label}</strong>
        <small>{linkage.detail}</small>
      </div>

      <div className="registration-summary">
        <span><Braces size={14} /> Capabilities registered</span>
        <strong>{registeredToolCount ? `${registeredToolCount}/7` : "preview"}</strong>
      </div>

      <Accordion.Root className="ledger-list" type="multiple">
        {visible.length === 0 ? (
          <div className="ledger-empty">
            <Braces size={22} />
            <p>No tool activity yet.</p>
            <span>Run the analysis or ask your agent to review this case.</span>
          </div>
        ) : (
          visible.map((entry) => {
            const receipt = JSON.stringify(entry.result, null, 2);
            const args = JSON.stringify(entry.args, null, 2);
            const state = entry.outcome === "blocked"
              ? "BLOCKED"
              : entry.outcome === "error"
                ? "FAILED"
                : entry.decision
                  ? entry.decision.toUpperCase()
                  : entry.origin === "webmcp" ? "AGENT CALLED" : "HUMAN RAN";
            return (
            <Accordion.Item className="ledger-entry" key={entry.id} value={entry.id}>
              <Accordion.Header>
                <Accordion.Trigger>
                <span className={`entry-glyph ${entry.origin}`}><Braces size={13} /></span>
                <span>
                  <strong>{entry.tool}</strong>
                  <small>{entry.origin === "webmcp" ? "WebMCP agent" : "Human fallback"}</small>
                </span>
                <span className={`entry-state ${entry.outcome ?? entry.decision ?? entry.origin}`}>{state}</span>
                <time>{new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
                <ChevronDown className="accordion-chevron" size={14} aria-hidden="true" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="ledger-entry-content">
                <dl className="receipt-facts">
                  <div><dt>Returned</dt><dd>{entry.bytesOut} bytes</dd></div>
                  <div><dt>Raw fields</dt><dd>{entry.rawFieldsReleased.length ? entry.rawFieldsReleased.join(", ") : "none"}</dd></div>
                  <div><dt>Quasi types</dt><dd>{entry.quasiFieldsExposed.length || "none"}</dd></div>
                </dl>
                {entry.outcome === "blocked" && entry.error ? (
                  <div className="blocked-proof" role="note">
                    <ShieldAlert size={16} />
                    <div>
                      <strong>{entry.error.message}</strong>
                      {entry.error.offendingValue ? <p>Offending string: <mark>{entry.error.offendingValue}</mark></p> : null}
                    </div>
                  </div>
                ) : entry.outcome === "error" && entry.error ? (
                  <div className="failed-proof" role="note"><strong>Tool failed:</strong> {entry.error.message}</div>
                ) : null}
                <div className="receipt-toolbar"><span>Tool arguments</span></div>
                <pre>{args}</pre>
                <div className="receipt-toolbar">
                  <span>Exact tool result</span>
                  <button className="receipt-copy" onClick={() => void copyReceipt(receipt)} aria-label={`Copy result from ${entry.tool}`}>
                    <Copy size={13} /> Copy
                  </button>
                </div>
                <pre>{receipt}</pre>
              </Accordion.Content>
            </Accordion.Item>
            );
          })
        )}
      </Accordion.Root>

      <footer className="ledger-footer">
        <div><span>{invocations.filter((entry) => entry.origin === "webmcp").length}</span> agent calls</div>
        <div><span>{invocations.filter((entry) => entry.origin === "human-ui").length}</span> human actions</div>
        <PaperTooltip label="Download disclosure log" side="top">
          <button className="icon-button" onClick={exportLedger} aria-label="Download disclosure log">
            <Download size={17} />
          </button>
        </PaperTooltip>
      </footer>
    </aside>
  );
}

function linkageRisk(fields: Set<string>) {
  const count = fields.size;
  if (count >= 5) {
    return {
      level: "elevated",
      label: "Elevated",
      detail: `${count} quasi-identifier types accumulated. Dates, codes, and amounts can become identifying in combination.`,
    };
  }
  if (count >= 3) {
    return {
      level: "moderate",
      label: "Moderate",
      detail: `${count} quasi-identifier types accumulated across this session.`,
    };
  }
  return {
    level: "low",
    label: count ? "Low" : "Not observed",
    detail: count ? `${count} quasi-identifier type${count === 1 ? "" : "s"} observed so far.` : "No agent-visible quasi-identifiers have been recorded.",
  };
}

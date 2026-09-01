"use client";

import { Braces, Download, EyeOff, Fingerprint, Radio, ShieldCheck } from "lucide-react";
import type { DemoCase, InvocationEntry } from "@/lib/domain/types";

export function LedgerRail({ caseData }: { caseData: DemoCase }) {
  const invocations = caseData.ledger.filter((entry): entry is InvocationEntry => entry.kind === "invocation");
  const registrations = caseData.ledger.filter((entry) => entry.kind === "registration");
  const released = new Set(invocations.flatMap((entry) => entry.rawFieldsReleased));
  const quasi = new Set(invocations.flatMap((entry) => entry.quasiFieldsExposed));
  const visible = caseData.ledger.slice(-8).reverse();

  const exportLedger = () => {
    const blob = new Blob([JSON.stringify(caseData.ledger, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "paperveil-disclosure-log.json";
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <aside className="ledger-rail" aria-label="Disclosure ledger">
      <header className="ledger-header">
        <div>
          <p>Disclosure ledger</p>
          <h2>Agent-visible bytes</h2>
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
        <ShieldCheck size={18} />
        <p><strong>The boundary is inspectable.</strong> Every row below records the exact result and byte count returned through a site tool.</p>
      </div>

      <div className="ledger-list">
        {visible.length === 0 ? (
          <div className="ledger-empty">
            <Braces size={22} />
            <p>No tool activity yet.</p>
            <span>Run the analysis or ask your agent to review this case.</span>
          </div>
        ) : (
          visible.map((entry) => (
            <details className="ledger-entry" key={entry.id}>
              <summary>
                <span className={`entry-glyph ${entry.kind}`}><Braces size={13} /></span>
                <span>
                  <strong>{entry.tool}</strong>
                  <small>
                    {entry.kind === "registration"
                      ? entry.descriptionHash
                      : `${entry.bytesOut} bytes${entry.decision ? ` · ${entry.decision}` : ""}`}
                  </small>
                </span>
                <time>{new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
              </summary>
              <pre>{JSON.stringify(entry.kind === "registration" ? entry : entry.result, null, 2)}</pre>
            </details>
          ))
        )}
      </div>

      <footer className="ledger-footer">
        <div><span>{registrations.length}</span> tools registered</div>
        <div><span>{invocations.length}</span> calls recorded</div>
        <button className="icon-button" onClick={exportLedger} aria-label="Download disclosure log" title="Download disclosure log">
          <Download size={17} />
        </button>
      </footer>
    </aside>
  );
}

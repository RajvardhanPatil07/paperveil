"use client";

import { useEffect, useState } from "react";
import { Clock3, EyeOff, FileDown, ShieldCheck, X } from "lucide-react";
import type { PendingGate } from "@/lib/webmcp/human-gate";

export function GateDialog({ gate, onClose }: { gate: PendingGate | null; onClose: () => void }) {
  const [seconds, setSeconds] = useState(20);

  useEffect(() => {
    if (!gate) return;
    setSeconds(Math.max(0, Math.ceil((gate.expiresAt - Date.now()) / 1000)));
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((gate.expiresAt - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) onClose();
    }, 250);
    return () => window.clearInterval(timer);
  }, [gate, onClose]);

  useEffect(() => {
    if (!gate) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        gate.resolve("denied");
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gate, onClose]);

  if (!gate) return null;
  const disclosure = gate.kind === "disclosure";

  const decide = (decision: "approved" | "denied") => {
    gate.resolve(decision);
    onClose();
  };

  return (
    <div className="gate-backdrop" role="presentation">
      <section className="gate-dialog" role="dialog" aria-modal="true" aria-labelledby="gate-title">
        <button className="icon-button gate-close" onClick={() => decide("denied")} aria-label="Deny and close">
          <X size={18} />
        </button>
        <div className="gate-mark">{disclosure ? <EyeOff size={25} /> : <FileDown size={25} />}</div>
        <p className="gate-context">{disclosure ? "Identity disclosure requested" : "Local export requested"}</p>
        <h2 id="gate-title">{disclosure ? "The agent can continue without this." : "Create the personalized download?"}</h2>
        <p className="gate-reason">
          {disclosure
            ? `Requested field: ${gate.field.replaceAll("_", " ")}\nReason: ${gate.reason}`
            : gate.reason}
        </p>
        <div className="gate-boundary">
          <ShieldCheck size={18} />
          <span>
            {disclosure
              ? "Denying returns a placeholder token. Your workflow will not stop."
              : "Personalization happens in this tab. Packet contents are not returned to the agent."}
          </span>
        </div>
        <div className="gate-actions">
          <button className="button button-quiet" onClick={() => decide("denied")} autoFocus>
            {disclosure ? "Deny · use token" : "Cancel export"}
          </button>
          <button className="button button-dark" onClick={() => decide("approved")}>
            {disclosure ? "Allow once" : "Download locally"}
          </button>
        </div>
        <p className="gate-time"><Clock3 size={14} /> Auto-denies in {seconds}s</p>
      </section>
    </div>
  );
}

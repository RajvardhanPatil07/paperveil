"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Clock3, EyeOff, FileDown, ShieldCheck, X } from "lucide-react";
import type { Decision } from "@/lib/domain/types";
import type { PendingGate } from "@/lib/webmcp/human-gate";

export function GateDialog({ gate, onClose }: { gate: PendingGate | null; onClose: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const resolved = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    resolved.current = false;
    if (gate && document.activeElement instanceof HTMLElement) {
      returnFocus.current = document.activeElement;
    }
  }, [gate]);

  const decide = useCallback((decision: Decision) => {
    if (!gate || resolved.current) return;
    resolved.current = true;
    gate.resolve(decision);
    onClose();
    window.requestAnimationFrame(() => returnFocus.current?.focus());
  }, [gate, onClose]);

  useEffect(() => {
    if (!gate) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((gate.expiresAt - Date.now()) / 1000));
      setNow(Date.now());
      if (remaining === 0) {
        window.clearInterval(timer);
        decide("denied");
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [decide, gate]);

  const disclosure = gate?.kind === "disclosure";
  const seconds = gate ? Math.min(20, Math.max(0, Math.ceil((gate.expiresAt - now) / 1000))) : 20;

  return (
    <AlertDialog.Root open={Boolean(gate)} onOpenChange={(open) => { if (!open) decide("denied"); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="gate-backdrop" />
        {gate ? (
          <AlertDialog.Content
            className="gate-dialog"
            aria-describedby="gate-reason"
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              decide("denied");
            }}
          >
            <AlertDialog.Cancel asChild>
              <button className="icon-button gate-close" onClick={() => decide("denied")} aria-label="Deny and close">
                <X size={18} />
              </button>
            </AlertDialog.Cancel>
            <div className="gate-mark">{disclosure ? <EyeOff size={25} /> : <FileDown size={25} />}</div>
            <p className="gate-context">{disclosure ? "Identity disclosure requested" : "Local export requested"}</p>
            <AlertDialog.Title id="gate-title">
              {disclosure ? "The agent can continue without this." : "Create the personalized download?"}
            </AlertDialog.Title>
            <AlertDialog.Description className="gate-reason" id="gate-reason">
              {disclosure
                ? `Requested field: ${gate.field.replaceAll("_", " ")}\nReason: ${gate.reason}`
                : gate.reason}
            </AlertDialog.Description>
            <div className="gate-boundary">
              <ShieldCheck size={18} />
              <span>
                {disclosure
                  ? "Denying returns a placeholder token. Your workflow will not stop."
                  : "Personalization happens in this tab. Packet contents are not returned to the agent."}
              </span>
            </div>
            <div className="gate-actions">
              <AlertDialog.Cancel asChild>
                <button className="button button-quiet" onClick={() => decide("denied")}>
                  {disclosure ? "Deny · use token" : "Cancel export"}
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button className="button button-dark" onClick={() => decide("approved")}>
                  {disclosure ? "Allow once" : "Download locally"}
                </button>
              </AlertDialog.Action>
            </div>
            <p className="gate-time" aria-live="polite"><Clock3 size={14} /> Auto-denies in {seconds}s</p>
          </AlertDialog.Content>
        ) : null}
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

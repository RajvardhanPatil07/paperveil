"use client";

import type { Decision } from "@/lib/domain/types";
import type { GateRequest } from "@/lib/webmcp/handlers";

export type PendingGate = GateRequest & {
  id: string;
  expiresAt: number;
  resolve: (decision: Decision) => void;
};

export function requestHumanGate(request: GateRequest): Promise<Decision> {
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    let settled = false;
    const finish = (decision: Decision) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(decision);
    };
    const timeout = window.setTimeout(() => finish("timeout"), 20_000);
    const detail: PendingGate = { ...request, id, expiresAt: Date.now() + 20_000, resolve: finish };
    window.dispatchEvent(new CustomEvent("paperveil:gate", { detail }));
  });
}

export function subscribeToHumanGate(callback: (gate: PendingGate) => void) {
  const listener = (event: Event) => callback((event as CustomEvent<PendingGate>).detail);
  window.addEventListener("paperveil:gate", listener);
  return () => window.removeEventListener("paperveil:gate", listener);
}

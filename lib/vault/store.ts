"use client";

import { openDB } from "idb";
import fixture from "@/fixtures/demo-case.json";
import type { DemoCase, LedgerEntry } from "@/lib/domain/types";

const DB_NAME = "paperveil-vault";
const STORE_NAME = "cases";
const DEMO_ID = "PV-2026-042";

function freshFixture(): DemoCase {
  return structuredClone(fixture) as DemoCase;
}

async function database() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    },
  });
}

export async function loadDemoCase(): Promise<DemoCase> {
  if (typeof indexedDB === "undefined") return freshFixture();
  const db = await database();
  const existing = (await db.get(STORE_NAME, DEMO_ID)) as DemoCase | undefined;
  if (existing) return existing;
  const seeded = freshFixture();
  await db.put(STORE_NAME, seeded);
  return seeded;
}

export async function saveDemoCase(caseData: DemoCase) {
  if (typeof indexedDB === "undefined") return;
  const db = await database();
  await db.put(STORE_NAME, structuredClone(caseData));
}

export async function appendLedgerEntry(entry: LedgerEntry) {
  const caseData = await loadDemoCase();
  const duplicateRegistration =
    entry.kind === "registration" &&
    caseData.ledger.some(
      (item) =>
        item.kind === "registration" && item.tool === entry.tool && item.descriptionHash === entry.descriptionHash,
    );
  if (!duplicateRegistration) {
    caseData.ledger.push(entry);
    await saveDemoCase(caseData);
  }
}

export async function resetDemoCase() {
  const seeded = freshFixture();
  await saveDemoCase(seeded);
  announceStateChange();
  return seeded;
}

export function announceStateChange() {
  window.dispatchEvent(new CustomEvent("paperveil:state"));
}

export function subscribeToState(callback: () => void) {
  window.addEventListener("paperveil:state", callback);
  return () => window.removeEventListener("paperveil:state", callback);
}

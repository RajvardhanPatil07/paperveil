"use client";

import { openDB } from "idb";
import fixture from "@/fixtures/demo-case.json";
import therapyFixture from "@/fixtures/demo-case-therapy.json";
import type { DemoCase, LedgerEntry } from "@/lib/domain/types";

const DB_NAME = "paperveil-vault";
const STORE_NAME = "cases";
const DEFAULT_DEMO_ID = "PV-2026-042";
const ACTIVE_CASE_KEY = "paperveil-active-case";
const fixtures = {
  [fixture.id]: fixture,
  [therapyFixture.id]: therapyFixture,
} as const;
let fallbackActiveCaseId = DEFAULT_DEMO_ID;

function activeCaseId() {
  if (typeof window === "undefined") return fallbackActiveCaseId;
  try {
    const stored = window.localStorage?.getItem(ACTIVE_CASE_KEY);
    return stored && stored in fixtures ? stored : fallbackActiveCaseId;
  } catch {
    return fallbackActiveCaseId;
  }
}

function freshFixture(caseId = activeCaseId()): DemoCase {
  const source = fixtures[caseId as keyof typeof fixtures] ?? fixture;
  return structuredClone(source) as DemoCase;
}

export const demoCaseOptions = Object.values(fixtures).map(({ id, title }) => ({ id, title }));

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
  const caseId = activeCaseId();
  const existing = (await db.get(STORE_NAME, caseId)) as DemoCase | undefined;
  if (existing) {
    const normalized = { ...freshFixture(caseId), ...existing };
    if (!existing.asOfDate) await db.put(STORE_NAME, normalized);
    return normalized;
  }
  const seeded = freshFixture(caseId);
  await db.put(STORE_NAME, seeded);
  return seeded;
}

export async function selectDemoCase(caseId: string) {
  if (!(caseId in fixtures)) throw new Error("Unknown demo case.");
  fallbackActiveCaseId = caseId;
  try {
    window.localStorage?.setItem(ACTIVE_CASE_KEY, caseId);
  } catch {
    // The in-memory selection still works when browser storage is unavailable.
  }
  const selected = await loadDemoCase();
  announceStateChange();
  return selected;
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

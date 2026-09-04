import type { RawField } from "@/lib/domain/types";

const TOKEN_MAP_KEYS = new Set(["tokenmap", "token_map", "tokens", "rawidentifiers", "raw_identifiers"]);

export class PrivacyBoundaryError extends Error {
  readonly code = "privacy_boundary";

  constructor(
    readonly field: RawField,
    readonly offendingValue: string,
  ) {
    super(`Privacy boundary blocked raw identifier: ${field}.`);
    this.name = "PrivacyBoundaryError";
  }
}

function normalize(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function compact(value: string) {
  return normalize(value).replace(/[^\p{L}\p{N}]/gu, "");
}

function stringValues(value: unknown, seen = new WeakSet<object>()): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  return Object.values(value as Record<string, unknown>).flatMap((child) => stringValues(child, seen));
}

function containsIdentifier(payload: unknown, field: RawField, rawValue: string) {
  const normalizedRaw = normalize(rawValue);
  const compactRaw = compact(rawValue);
  const dateParts = field === "date_of_birth" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawValue) : null;
  const dateFingerprints = dateParts
    ? [`${dateParts[1]}${dateParts[2]}${dateParts[3]}`, `${dateParts[2]}${dateParts[3]}${dateParts[1]}`, `${dateParts[3]}${dateParts[2]}${dateParts[1]}`]
    : [];

  return stringValues(payload).some((value) => {
    if (normalize(value).includes(normalizedRaw)) return true;
    const compactValue = compact(value);
    if (compactRaw.length >= 6 && compactValue.includes(compactRaw)) return true;
    const digits = value.replace(/\D/g, "");
    return dateFingerprints.some((fingerprint) => digits.includes(fingerprint));
  });
}

function assertNoTokenMap(value: unknown, seen = new WeakSet<object>()): void {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (TOKEN_MAP_KEYS.has(key.toLocaleLowerCase())) {
      throw new Error("Privacy boundary blocked a token map from leaving the vault.");
    }
    assertNoTokenMap(child, seen);
  }
}

export function seal<T>(
  payload: T,
  allowRawFields: RawField[],
  rawIdentifiers: Record<RawField, string>,
): T {
  assertNoTokenMap(payload);
  const allowed = new Set(allowRawFields);

  for (const [field, rawValue] of Object.entries(rawIdentifiers) as Array<[RawField, string]>) {
    if (!rawValue || allowed.has(field)) continue;
    if (containsIdentifier(payload, field, rawValue)) {
      throw new PrivacyBoundaryError(field, rawValue);
    }
  }

  return structuredClone(payload);
}

export function tokensUsed(text: string): string[] {
  return Array.from(new Set(text.match(/\[\[[A-Z_]+\]\]/g) ?? []));
}

export function rehydrateTokens(text: string, replacements: Record<RawField, string>): string {
  const tokens: Record<RawField, string> = {
    patient_name: "NAME",
    date_of_birth: "DOB",
    member_id: "MEMBER_ID",
    address: "ADDRESS",
  };

  return (Object.entries(tokens) as Array<[RawField, string]>).reduce((current, [field, token]) => {
    const pattern = new RegExp(`\\[\\[\\s*${token.replace("_", "[_\\s]*")}\\s*\\]\\]`, "gi");
    return current.replace(pattern, replacements[field]);
  }, text);
}

export function byteSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

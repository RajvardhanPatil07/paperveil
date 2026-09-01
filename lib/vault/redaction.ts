import type { RawField } from "@/lib/domain/types";

const TOKEN_MAP_KEYS = new Set(["tokenmap", "token_map", "tokens", "rawidentifiers", "raw_identifiers"]);

function normalize(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
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
  const serialized = normalize(JSON.stringify(payload));
  const allowed = new Set(allowRawFields);

  for (const [field, rawValue] of Object.entries(rawIdentifiers) as Array<[RawField, string]>) {
    if (!rawValue || allowed.has(field)) continue;
    if (serialized.includes(normalize(rawValue))) {
      throw new Error(`Privacy boundary blocked raw identifier: ${field}.`);
    }
  }

  return structuredClone(payload);
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

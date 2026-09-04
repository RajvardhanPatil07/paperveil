import { beforeEach, describe, expect, it } from "vitest";
import { demoCaseOptions, loadDemoCase, selectDemoCase } from "@/lib/vault/store";

describe("demo case packs", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
  });

  it("offers two cases that share the same local vault surface", async () => {
    expect(demoCaseOptions).toHaveLength(2);

    await selectDemoCase("PV-2026-117");
    const selected = await loadDemoCase();

    expect(selected.title).toBe("Post-surgical therapy appeal");
    expect(selected.claimAmount).toBe(3150);
    expect(selected.asOfDate).toBe("2026-09-03");
  });
});

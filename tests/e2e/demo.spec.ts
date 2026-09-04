import { expect, test } from "@playwright/test";

test("completes the seeded privacy-first appeal workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Outpatient imaging appeal" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Judge walkthrough" })).toBeVisible();
  await expect(page.getByText("$850", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /run rule check/i }).click();
  await expect(page.getByRole("heading", { name: /Build the appeal/ })).toBeVisible();
  await expect(page.getByText("Duplicate technical charge is reconciled")).toBeVisible();

  await page.getByRole("button", { name: /compare two paths/i }).click();
  await expect(page.getByText("Complete the evidence packet", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /create draft with current gaps/i }).click();
  await expect(page.getByRole("heading", { name: /One letter/ })).toBeVisible();
  await expect(page.getByText(/No packet prose returned/)).toBeVisible();

  await page.getByRole("button", { name: "Case desk" }).click();
  await page.getByRole("button", { name: /test the privacy gate/i }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: /deny · use token/i }).click();
  await expect(page.locator(".ledger-counter.primary")).toContainText("0of 4 raw identifiers released");
  await expect(page.locator(".ledger-entry").first()).toContainText(/denied/i);
  await expect(page.locator(".ledger-entry").first()).toContainText("Human fallback");
});

test("switches between two case packs without changing the tool surface", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop-only case selector assertion");
  await page.goto("/");

  await page.getByRole("combobox", { name: "Demo case" }).selectOption("PV-2026-117");

  await expect(page.getByRole("heading", { name: "Post-surgical therapy appeal" })).toBeVisible();
  await expect(page.getByText("$3,150", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/7 site tools connected|7 tools ready/)).toBeVisible();
});

test("moves scroll and focus to the newly selected workflow view", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop-only focus assertion");
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await page.getByRole("button", { name: "Packet" }).click();

  const heading = page.getByRole("heading", { name: /One letter/ });
  await expect(heading).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(20);
});

test("requires confirmation before resetting demo state", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "reset control is hidden in compact navigation layouts");
  await page.goto("/");
  await page.getByRole("button", { name: /run rule check/i }).click();
  await expect(page.locator(".ledger-footer")).toContainText("1 human actions");

  const resetButton = page.getByRole("button", { name: /Reset demo/i });
  await resetButton.click();
  await expect(page.getByRole("button", { name: /Confirm reset/i })).toBeVisible();

  // Leaving the armed state without confirming keeps the recorded state.
  await page.getByRole("button", { name: "Strategy" }).click();
  await expect(page.getByRole("button", { name: /Reset demo/i })).toBeVisible();
  await expect(page.locator(".ledger-footer")).toContainText("1 human actions");

  await resetButton.click();
  await page.getByRole("button", { name: /Confirm reset/i }).click();
  await expect(page.locator(".ledger-footer")).toContainText("0 human actions");
});

test("remains usable on a narrow viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only layout assertion");
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Case workflow" })).toBeVisible();
  await page.getByRole("button", { name: "Strategy" }).click();
  await expect(page.getByRole("heading", { name: /Build the appeal/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("exposes compact navigation labels through accessible tooltips", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "compact", "compact-only interaction assertion");
  await page.goto("/");

  await page.getByRole("button", { name: "Strategy" }).hover();
  await expect(page.getByRole("tooltip", { name: "Strategy" })).toBeVisible();
});

test("keeps the disclosure decision keyboard-safe and deny-by-default", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop-only interaction assertion");
  await page.goto("/");
  const trigger = page.getByRole("button", { name: /test the privacy gate/i });

  await trigger.click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByRole("button", { name: /deny · use token/i })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator(".ledger-counter.primary")).toContainText("0of 4 raw identifiers released");

  await trigger.click();
  await page.getByRole("button", { name: /allow once/i }).click();
  await expect(page.locator(".ledger-counter.primary")).toContainText("0of 4 raw identifiers released");
  await expect(page.locator(".ledger-entry").first()).toContainText("Human fallback");
  await expect(page.locator(".ledger-entry").first()).toContainText("APPROVED");
});

test("announces copy and local-download feedback without echoing contents", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop-only feedback assertion");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");

  await page.getByRole("button", { name: /copy red-team prompt/i }).click();
  await expect(page.getByText("Demo prompt copied.")).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /download disclosure log/i }).click();
  await download;
  const toast = page.getByText("Disclosure log downloaded locally.");
  await expect(toast).toBeVisible();
  await expect(toast).not.toContainText("Maya Chen");
});

test("auto-denies an unanswered disclosure after twenty seconds", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop-only timeout assertion");
  await page.clock.install();
  await page.goto("/");

  await page.getByRole("button", { name: /test the privacy gate/i }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.clock.fastForward(20_500);

  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.locator(".ledger-counter.primary")).toContainText("0of 4 raw identifiers released");
  await expect(page.locator(".ledger-entry").first()).toContainText(/timeout/i);
});

test("operates policy disclosures from the keyboard", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop-only accordion assertion");
  await page.goto("/");
  await page.getByRole("button", { name: "Strategy" }).click();

  const rule = page.getByRole("button", { name: /MB-014/i });
  await expect(rule).toHaveAttribute("aria-expanded", "true");
  await rule.focus();
  await page.keyboard.press("Enter");
  await expect(rule).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Space");
  await expect(rule).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/no itemized provider bill/i)).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("completes the seeded privacy-first appeal workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Outpatient imaging appeal" })).toBeVisible();
  await expect(page.getByText("$850", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /run rule check/i }).click();
  await expect(page.getByRole("heading", { name: /Build the appeal/ })).toBeVisible();
  await expect(page.getByText("Duplicate technical charge is reconciled")).toBeVisible();

  await page.getByRole("button", { name: /compare two paths/i }).click();
  await expect(page.getByText("Complete the evidence packet", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /prepare appeal packet/i }).click();
  await expect(page.getByRole("heading", { name: /One letter/ })).toBeVisible();
  await expect(page.getByText(/No packet prose returned/)).toBeVisible();

  await page.getByRole("button", { name: "Case desk" }).click();
  await page.getByRole("button", { name: /test the privacy gate/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: /deny · use token/i }).click();
  await expect(page.locator(".ledger-counter.primary")).toContainText("0of 4 raw identifiers released");
  await expect(page.locator(".ledger-entry").first()).toContainText("denied");
});

test("remains usable on a narrow viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only layout assertion");
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Case workflow" })).toBeVisible();
  await page.getByRole("button", { name: "Strategy" }).click();
  await expect(page.getByRole("heading", { name: /Build the appeal/ })).toBeVisible();
});

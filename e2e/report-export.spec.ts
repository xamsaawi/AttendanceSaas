import { expect, test } from "@playwright/test";

import { login, readSeed } from "./helpers";

test("admin can export the student roster from the reports page", async ({ page }) => {
  const seed = readSeed();
  await login(page, seed.orgA.ownerEmail, seed.orgA.ownerPassword);

  await page.goto("/dashboard/reports");
  await page.getByRole("tab", { name: "Reports" }).click();

  const rosterRow = page.locator("div").filter({ hasText: "Student roster" }).last();
  const downloadPromise = page.waitForEvent("download");
  await rosterRow.getByRole("button", { name: "CSV" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});

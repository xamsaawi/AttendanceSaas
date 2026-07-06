import { expect, test } from "@playwright/test";

import { login, readSeed } from "./helpers";

test("homeroom teacher can mark and save attendance", async ({ page }) => {
  const seed = readSeed();
  await login(page, seed.orgA.ownerEmail, seed.orgA.ownerPassword);

  await page.goto("/dashboard/attendance");
  await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible();

  // The seeded owner is both the school owner and the class homeroom teacher,
  // so the page defaults to the admin overview tab — switch to the teacher's
  // marking tab explicitly.
  await page.getByRole("tab", { name: "Mark Attendance" }).click();
  await page.getByRole("button", { name: "Mark all present" }).click();
  await page.getByRole("button", { name: "Save attendance" }).click();

  await expect(page.getByText("Attendance saved")).toBeVisible({ timeout: 15_000 });
});

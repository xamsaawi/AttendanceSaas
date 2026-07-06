import { expect, test } from "@playwright/test";

import { login, readSeed } from "./helpers";

test("one school's owner cannot see another school's students", async ({ page }) => {
  const seed = readSeed();

  await login(page, seed.orgB.ownerEmail, seed.orgB.ownerPassword);
  await page.goto("/dashboard/students");

  // Org A's seeded students must not leak into org B's view, and org B's
  // request for org A's class roster must be rejected rather than returning data.
  await expect(page.getByText("Alex Smith")).toHaveCount(0);
  await expect(page.getByText("Jamie Lee")).toHaveCount(0);

  const rosterResponse = await page.request.get(
    `/api/attendance/roster?classId=${seed.orgA.classId}&sessionDate=${new Date().toISOString().slice(0, 10)}&sessionType=before_break`,
  );
  expect(rosterResponse.status()).toBe(403);
});

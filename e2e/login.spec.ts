import { expect, test } from "@playwright/test";

import { login, readSeed } from "./helpers";

test("owner can sign in and sign out", async ({ page }) => {
  const seed = readSeed();

  await login(page, seed.orgA.ownerEmail, seed.orgA.ownerPassword);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("wrong password shows an error instead of signing in", async ({ page }) => {
  const seed = readSeed();

  await page.goto("/login");
  await page.getByLabel("Email").fill(seed.orgA.ownerEmail);
  await page.getByLabel("Password").fill("definitely-not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/invalid/i)).toBeVisible();
});

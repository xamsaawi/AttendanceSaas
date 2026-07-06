import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

export type SeedOutput = {
  orgA: {
    ownerEmail: string;
    ownerPassword: string;
    organizationId: string;
    classId: string;
    studentIds: string[];
  };
  orgB: {
    ownerEmail: string;
    ownerPassword: string;
    organizationId: string;
    classId: string;
  };
};

export function readSeed(): SeedOutput {
  const seedPath = path.join(__dirname, ".seed-output.json");
  try {
    return JSON.parse(readFileSync(seedPath, "utf-8"));
  } catch {
    throw new Error(`Missing ${seedPath} — run \`pnpm seed:e2e\` before the e2e suite.`);
  }
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  // The first server action call in a freshly started `pnpm dev` process pays
  // Next's on-demand compile cost for /login's action bundle, which has been
  // observed to make the very first sign-in of a run fail outright rather
  // than just be slow — retry once before treating it as a real failure.
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    try {
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
      return;
    } catch (err) {
      if (attempt === 2) throw err;
    }
  }
}
import { test, expect, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel(/e-?mail/i).fill("e2e@plein.test");
  await page.getByRole("button", { name: /Stuur code|Send code/i }).click();
  const { code } = await (await page.request.get("http://localhost:5175/api/auth/debug-last-code")).json();
  await page.getByLabel(/Code/i).fill(code);
  await page.getByRole("button", { name: /Inloggen|Sign in/i }).click();
}

test("volledige flow: login → lijstje → permissies → betaling (mock)", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Plein" })).toBeVisible();

  await page.getByRole("button", { name: /Lijstje/ }).click();
  await page.getByRole("button", { name: /Toestaan|Allow/ }).click(); // identity
  await page.getByRole("button", { name: /Toestaan|Allow/ }).click(); // storage
  const frame = page.frameLocator("iframe");
  await expect(frame.getByText("Lijstje van e2e@plein.test")).toBeVisible();

  await page.getByRole("button", { name: /Sluiten|Close/ }).click();
  await page.getByRole("button", { name: /Betaal-demo/ }).click();
  const frame2 = page.frameLocator("iframe");
  await frame2.getByRole("button", { name: /2,50/ }).click();
  await page.getByRole("button", { name: /Toestaan|Allow/ }).click(); // payments
  await expect(frame2.getByText(/Bedankt voor je steun/)).toBeVisible({ timeout: 15_000 });
});

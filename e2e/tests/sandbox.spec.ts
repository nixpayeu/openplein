import { test, expect } from "@playwright/test";

test("mini-app-iframe heeft geen allow-same-origin en kan niet bij de shell", async ({ page }) => {
  // login-helper hergebruiken zoals in shell.spec.ts
  await page.goto("/");
  await page.getByLabel(/e-?mail/i).fill("e2e@plein.test");
  await page.getByRole("button", { name: /Stuur code|Send code/i }).click();
  const { code } = await (await page.request.get("http://localhost:5175/api/auth/debug-last-code")).json();
  await page.getByLabel(/Code/i).fill(code);
  await page.getByRole("button", { name: /Inloggen|Sign in/i }).click();
  await page.getByRole("button", { name: /Lijstje/ }).click();

  const sandbox = await page.locator("iframe").getAttribute("sandbox");
  expect(sandbox).toContain("allow-scripts");
  expect(sandbox).not.toContain("allow-same-origin");

  // een mini-app die parent-DOM probeert te lezen moet een SecurityError krijgen
  const escaped = await page.frameLocator("iframe").locator("body").evaluate(() => {
    try { return window.parent.document.title; } catch { return "GEBLOKKEERD"; }
  });
  expect(escaped).toBe("GEBLOKKEERD");

  // localStorage van de shell is onbereikbaar (opaque origin gooit bij toegang)
  const storage = await page.frameLocator("iframe").locator("body").evaluate(() => {
    try { return localStorage.getItem("plein.session") ?? "LEEG"; } catch { return "GEBLOKKEERD"; }
  });
  expect(storage).toBe("GEBLOKKEERD");
});

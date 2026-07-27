import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  // Beide specs loggen in met hetzelfde e2e-adres tegen dezelfde demo-server-instance
  // (debugLastCode/codes-map is proces-breed); parallelle workers laten die state botsen.
  workers: 1,
  use: { baseURL: "http://localhost:5173" },
  webServer: [
    { command: "PAYMENTS_MOCK=1 AUTH_SECRET=e2e pnpm --filter @openplein/demo-server start", port: 5175, reuseExistingServer: true },
    { command: "pnpm --filter @openplein/demo-miniapps dev:lijstje", port: 5180, reuseExistingServer: true },
    { command: "pnpm --filter @openplein/demo-miniapps dev:betalen", port: 5181, reuseExistingServer: true },
    { command: "pnpm --filter @openplein/runtime dev", port: 5173, reuseExistingServer: true },
  ],
});

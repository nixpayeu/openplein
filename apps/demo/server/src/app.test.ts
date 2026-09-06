import { describe, it, expect, beforeAll } from "vitest";
import { createApp } from "./app";

const app = createApp({
  authSecret: "test-secret",
  paymentsMock: true,
  tenantConfig: { hostname: "localhost", name: "Plein", catalog: [] },
});
let token = "";

beforeAll(async () => {
  await app.request("/api/auth/request-code", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nick@example.nl" }),
  });
  const code = app.debugLastCode!; // test-only accessor, zie implementatie
  const res = await app.request("/api/auth/verify", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nick@example.nl", code }),
  });
  token = ((await res.json()) as { token: string }).token;
});

describe("auth", () => {
  it("weigert verify met fout code", async () => {
    const res = await app.request("/api/auth/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nick@example.nl", code: "000000" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("demo-modus (demoShowCode)", () => {
  it("geeft de code in de response terug en die code verifieert", async () => {
    const demoApp = createApp({
      authSecret: "test-secret",
      paymentsMock: true,
      demoShowCode: true,
      tenantConfig: { hostname: "localhost", name: "Plein", catalog: [] },
    });
    const res = await demoApp.request("/api/auth/request-code", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@example.nl" }),
    });
    expect(res.status).toBe(200);
    const { demoCode } = (await res.json()) as { demoCode: string };
    expect(demoCode).toMatch(/^\d{6}$/);
    const verify = await demoApp.request("/api/auth/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@example.nl", code: demoCode }),
    });
    expect(verify.status).toBe(200);
  });
  it("blijft 204 zonder body als demoShowCode uit staat", async () => {
    const res = await app.request("/api/auth/request-code", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "stil@example.nl" }),
    });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });
});

describe("payments (mock)", () => {
  it("weigert zonder token", async () => {
    const res = await app.request("/api/payments", { method: "POST" });
    expect(res.status).toBe(401);
  });
  it("maakt een mock-betaling en zet hem op paid na één poll", async () => {
    const create = await app.request("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: "2.50", currency: "EUR", description: "test", appId: "nl.nixpay.betalen" }),
    });
    expect(create.status).toBe(200);
    const { id, checkoutUrl } = (await create.json()) as { id: string; checkoutUrl: string };
    expect(checkoutUrl).toContain(id);
    const poll = await app.request(`/api/payments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(((await poll.json()) as { status: string }).status).toBe("paid");
  });
});

describe("brute-force-guard", () => {
  it("blokkeert na 5 foute pogingen", async () => {
    const guardApp = createApp({
      authSecret: "test-secret",
      paymentsMock: true,
      tenantConfig: { hostname: "localhost", name: "Plein", catalog: [] },
    });
    await guardApp.request("/api/auth/request-code", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "brute@example.nl" }),
    });
    const correctCode = guardApp.debugLastCode!;
    for (let i = 0; i < 5; i++) {
      const res = await guardApp.request("/api/auth/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "brute@example.nl", code: "000000" }),
      });
      expect(res.status).toBe(401);
    }
    const res = await guardApp.request("/api/auth/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "brute@example.nl", code: correctCode }),
    });
    expect(res.status).toBe(401);
  });
});

describe("token-TTL", () => {
  it("weigert een verlopen token", async () => {
    const expiredApp = createApp({
      authSecret: "test-secret",
      paymentsMock: true,
      tokenTtlMs: -1,
      tenantConfig: { hostname: "localhost", name: "Plein", catalog: [] },
    });
    await expiredApp.request("/api/auth/request-code", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nick@example.nl" }),
    });
    const code = expiredApp.debugLastCode!;
    const verifyRes = await expiredApp.request("/api/auth/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nick@example.nl", code }),
    });
    const expiredToken = ((await verifyRes.json()) as { token: string }).token;
    const res = await expiredApp.request("/api/payments/x", {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/tenant", () => {
  it("geeft de tenantconfiguratie terug", async () => {
    const app = createApp({
      authSecret: "test",
      paymentsMock: true,
      tenantConfig: { hostname: "localhost", name: "Digitale Autonomie", catalog: [] },
    });
    const res = await app.request("/api/tenant");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "Digitale Autonomie" });
  });

  it("vereist geen inlog", async () => {
    const app = createApp({
      authSecret: "test",
      paymentsMock: true,
      tenantConfig: { hostname: "localhost", name: "Plein", catalog: [] },
    });
    expect((await app.request("/api/tenant")).status).toBe(200);
  });
});

describe("GET /api/manifest.webmanifest", () => {
  const tenantConfig = {
    hostname: "localhost", name: "Digitale Autonomie", catalog: [],
    colors: { "navy-1": "#101820" },
  };

  it("gebruikt de naam van de tenant", async () => {
    const app = createApp({ authSecret: "test", paymentsMock: true, tenantConfig });
    const res = await app.request("/api/manifest.webmanifest");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      name: "Digitale Autonomie", short_name: "Digitale Autonomie",
    });
  });

  it("serveert het juiste content-type", async () => {
    const app = createApp({ authSecret: "test", paymentsMock: true, tenantConfig });
    const res = await app.request("/api/manifest.webmanifest");
    expect(res.headers.get("content-type")).toContain("application/manifest+json");
  });

  it("neemt de achtergrondkleur van de tenant over", async () => {
    const app = createApp({ authSecret: "test", paymentsMock: true, tenantConfig });
    const m = (await (await app.request("/api/manifest.webmanifest")).json()) as Record<string, string>;
    expect(m.theme_color).toBe("#101820");
    expect(m.background_color).toBe("#101820");
  });

  it("valt terug op de standaardkleur zonder tenantkleuren", async () => {
    const app = createApp({
      authSecret: "test", paymentsMock: true,
      tenantConfig: { hostname: "localhost", name: "Kaal", catalog: [] },
    });
    const m = (await (await app.request("/api/manifest.webmanifest")).json()) as Record<string, string>;
    expect(m.theme_color).toBe("#070F1C");
  });

  it("gebruikt image/svg+xml en sizes 'any' voor een SVG-tenantlogo", async () => {
    const app = createApp({
      authSecret: "test", paymentsMock: true,
      tenantConfig: { ...tenantConfig, logoUrl: "https://example.org/logo.svg" },
    });
    const m = (await (await app.request("/api/manifest.webmanifest")).json()) as {
      icons: Array<{ src: string; sizes: string; type?: string }>;
    };
    expect(m.icons).toEqual([
      { src: "https://example.org/logo.svg", sizes: "any", type: "image/svg+xml" },
    ]);
  });

  it("gebruikt het standaardicoon zonder tenantlogo", async () => {
    const app = createApp({
      authSecret: "test", paymentsMock: true,
      tenantConfig: { hostname: "localhost", name: "Kaal", catalog: [] },
    });
    const m = (await (await app.request("/api/manifest.webmanifest")).json()) as {
      icons: Array<{ src: string; sizes: string; type?: string }>;
    };
    expect(m.icons).toEqual([{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }]);
  });
});

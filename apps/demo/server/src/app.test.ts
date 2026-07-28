import { describe, it, expect, beforeAll } from "vitest";
import { createApp } from "./app";

const app = createApp({ authSecret: "test-secret", paymentsMock: true });
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
    const demoApp = createApp({ authSecret: "test-secret", paymentsMock: true, demoShowCode: true });
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
    const guardApp = createApp({ authSecret: "test-secret", paymentsMock: true });
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
    const expiredApp = createApp({ authSecret: "test-secret", paymentsMock: true, tokenTtlMs: -1 });
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

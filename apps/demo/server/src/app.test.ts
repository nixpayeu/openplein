import { describe, it, expect, beforeAll } from "vitest";
import { createApp } from "./app";
import { openDb } from "./db";

const app = createApp({
  authSecret: "test-secret",
  paymentsMock: true,
  db: openDb(":memory:"),
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
      db: openDb(":memory:"),
      tenantConfig: { hostname: "localhost", name: "Plein", catalog: [] },
    });
    const res = await demoApp.request("/api/auth/request-code", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@example.nl" }),
    });
    expect(res.status).toBe(200);
    const { demoCode } = (await res.json()) as { demoCode: string };
    expect(demoCode).toMatch(/^\d{9}$/);
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

function guardApp() {
  return createApp({
    authSecret: "test-secret", paymentsMock: true, db: openDb(":memory:"),
    tenantConfig: { hostname: "localhost", name: "Plein", catalog: [] },
    // Klein gehouden zodat de tests geen 20 aanvragen hoeven te doen; het
    // gedrag dat getest wordt (de teller overleeft een nieuwe aanvraag) is
    // onafhankelijk van de gekozen grens.
    maxVerifyAttempts: 5, verifyBlockDurationMs: 60_000,
  });
}

// Zelfde opzet, maar met een blokkadeduur van enkele milliseconden, zodat de
// opschoning van oude tellers waarneembaar is zonder de test traag te maken.
function kortstondigeGuardApp() {
  return createApp({
    authSecret: "test-secret", paymentsMock: true, db: openDb(":memory:"),
    tenantConfig: { hostname: "localhost", name: "Plein", catalog: [] },
    maxVerifyAttempts: 2, verifyBlockDurationMs: 20,
  });
}

async function vraagCode(app: ReturnType<typeof createApp>, email: string): Promise<void> {
  await app.request("/api/auth/request-code", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

async function verifieer(app: ReturnType<typeof createApp>, email: string, code: string) {
  return app.request("/api/auth/verify", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
}

describe("brute-force-guard", () => {
  it("blokkeert na 5 foute pogingen, ook met de juiste code daarna", async () => {
    const app = guardApp();
    await vraagCode(app, "brute@example.nl");
    const correctCode = app.debugLastCode!;
    for (let i = 0; i < 5; i++) {
      expect((await verifieer(app, "brute@example.nl", "000000")).status).toBe(401);
    }
    // "000000" kan nooit de echte code zijn (die is negen cijfers lang), dus
    // dit bewijst dat de blokkade actief is, niet dat de code toevallig fout is.
    expect((await verifieer(app, "brute@example.nl", correctCode)).status).toBe(401);
  });

  it("blokkeert ook een andere spelling van hetzelfde adres (hoofdletters, spaties)", async () => {
    const app = guardApp();
    // Pogingenteller opbranden met één spelling van een beheerdersadres.
    for (let i = 0; i < 5; i++) {
      await vraagCode(app, "bestuur@example.org");
      expect((await verifieer(app, "bestuur@example.org", "000000")).status).toBe(401);
    }
    // Zelfde spelling, juiste code: de blokkade werkt.
    await vraagCode(app, "bestuur@example.org");
    expect((await verifieer(app, "bestuur@example.org", app.debugLastCode!)).status).toBe(401);
    // Andere hoofdletters, juiste code voor díe aanvraag: zonder normalisatie
    // is dit voor de teller een vers adres en zou dit inloggen (200) — dat
    // was het lek.
    await vraagCode(app, "BeStUuR@Example.ORG");
    expect((await verifieer(app, "BeStUuR@Example.ORG", app.debugLastCode!)).status).toBe(401);
    // Spaties eromheen, juiste code voor díe aanvraag: zelfde adres, dus ook
    // geblokkeerd.
    await vraagCode(app, "   bestuur@example.org  ");
    const res = await verifieer(app, "   bestuur@example.org  ", app.debugLastCode!);
    expect(res.status).toBe(401);
  });

  it("ruimt een teller op die langer dan de blokkadeduur onaangeroerd is", async () => {
    const app = kortstondigeGuardApp();
    const adres = "vergeetachtig@example.org";
    await vraagCode(app, adres);
    // Eén misser: de teller staat nu op 1 van de 2, dus nog niet geblokkeerd.
    expect((await verifieer(app, adres, "000000000")).status).toBe(401);

    // Wachten tot de teller verlopen is, daarna een nieuwe aanvraag die de
    // opschoning uitvoert. De volgende misser hoort weer bij 1 te beginnen en
    // dus niet meteen te blokkeren.
    await new Promise((r) => setTimeout(r, 40));
    await vraagCode(app, adres);
    expect((await verifieer(app, adres, "000000000")).status).toBe(401);

    // Als de teller níét was opgeruimd, stond hij nu op 2 en was het adres
    // geblokkeerd; de juiste code zou dan ook falen.
    const code = app.debugLastCode!;
    expect((await verifieer(app, adres, code)).status).toBe(200);
  });

  it("geeft 400 en geen 500 als het adres geen tekst is", async () => {
    const res = await guardApp().request("/api/auth/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: null, code: "1" }),
    });
    expect(res.status).toBe(400);
  });

  it("een nieuwe code aanvragen zet de pogingenteller niet terug", async () => {
    const app = guardApp();
    const email = "opnieuw@example.nl";
    // Vier foute pogingen, elk na een eigen nieuwe code-aanvraag: als het
    // aanvragen van een nieuwe code de teller zou terugzetten (het lek),
    // zou het adres hierna nooit geblokkeerd raken.
    for (let i = 0; i < 4; i++) {
      await vraagCode(app, email);
      expect((await verifieer(app, email, "000000")).status).toBe(401);
    }
    await vraagCode(app, email);
    const correctCode = app.debugLastCode!;
    // Vijfde foute poging: dit moet de grens raken en blokkeren, wat alleen
    // klopt als de vier eerdere pogingen zijn blijven meetellen.
    expect((await verifieer(app, email, "000000")).status).toBe(401);
    expect((await verifieer(app, email, correctCode)).status).toBe(401);
  });
});

describe("token-TTL", () => {
  it("weigert een verlopen token", async () => {
    const expiredApp = createApp({
      authSecret: "test-secret",
      paymentsMock: true,
      tokenTtlMs: -1,
      db: openDb(":memory:"),
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
      db: openDb(":memory:"),
      tenantConfig: { hostname: "localhost", name: "Digitale Autonomie", catalog: [] },
    });
    const res = await app.request("/api/tenant");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "Digitale Autonomie" });
  });

  it("lekt geen e-mailadressen van bestuursleden", async () => {
    const app = createApp({
      authSecret: "test", paymentsMock: true, db: openDb(":memory:"),
      tenantConfig: {
        hostname: "localhost", name: "Vereniging", catalog: [],
        admins: ["bestuur@example.org"],
      },
    });
    const res = await app.request("/api/tenant");
    expect((await res.json()) as Record<string, unknown>).not.toHaveProperty("admins");
  });

  it("vereist geen inlog", async () => {
    const app = createApp({
      authSecret: "test",
      paymentsMock: true,
      db: openDb(":memory:"),
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
    const app = createApp({ authSecret: "test", paymentsMock: true, db: openDb(":memory:"), tenantConfig });
    const res = await app.request("/api/manifest.webmanifest");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      name: "Digitale Autonomie", short_name: "Digitale Autonomie",
    });
  });

  it("serveert het juiste content-type", async () => {
    const app = createApp({ authSecret: "test", paymentsMock: true, db: openDb(":memory:"), tenantConfig });
    const res = await app.request("/api/manifest.webmanifest");
    expect(res.headers.get("content-type")).toContain("application/manifest+json");
  });

  it("neemt de achtergrondkleur van de tenant over", async () => {
    const app = createApp({ authSecret: "test", paymentsMock: true, db: openDb(":memory:"), tenantConfig });
    const m = (await (await app.request("/api/manifest.webmanifest")).json()) as Record<string, string>;
    expect(m.theme_color).toBe("#101820");
    expect(m.background_color).toBe("#101820");
  });

  it("valt terug op de standaardkleur zonder tenantkleuren", async () => {
    const app = createApp({
      authSecret: "test", paymentsMock: true, db: openDb(":memory:"),
      tenantConfig: { hostname: "localhost", name: "Kaal", catalog: [] },
    });
    const m = (await (await app.request("/api/manifest.webmanifest")).json()) as Record<string, string>;
    expect(m.theme_color).toBe("#070F1C");
  });

  it("gebruikt image/svg+xml en sizes 'any' voor een SVG-tenantlogo", async () => {
    const app = createApp({
      authSecret: "test", paymentsMock: true, db: openDb(":memory:"),
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
      authSecret: "test", paymentsMock: true, db: openDb(":memory:"),
      tenantConfig: { hostname: "localhost", name: "Kaal", catalog: [] },
    });
    const m = (await (await app.request("/api/manifest.webmanifest")).json()) as {
      icons: Array<{ src: string; sizes: string; type?: string }>;
    };
    expect(m.icons).toEqual([{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }]);
  });
});

describe("demomodus en beheerders sluiten elkaar uit", () => {
  it("weigert een configuratie met beheerders én demomodus", () => {
    expect(() =>
      createApp({
        authSecret: "test", paymentsMock: true, demoShowCode: true,
        db: openDb(":memory:"),
        tenantConfig: {
          hostname: "localhost", name: "Plein", catalog: [],
          admins: ["tim@example.org"],
        },
      }),
    ).toThrow(/demo/i);
  });

  // AUTH_SECRET=e2e opent /api/auth/debug-last-code zonder authenticatie: een
  // tweede deur naar dezelfde inlogcode als demomodus, dus dezelfde weigering.
  it("weigert een configuratie met beheerders én AUTH_SECRET=e2e", () => {
    expect(() =>
      createApp({
        authSecret: "e2e", paymentsMock: true,
        db: openDb(":memory:"),
        tenantConfig: {
          hostname: "localhost", name: "Plein", catalog: [],
          admins: ["tim@example.org"],
        },
      }),
    ).toThrow(/e2e/i);
  });
});

const ledenTenant = {
  hostname: "localhost", name: "Vereniging", catalog: [],
  admins: ["bestuur@example.org"], ledenregister: true,
};

function ledenApp() {
  return createApp({
    authSecret: "test-secret", paymentsMock: true,
    db: openDb(":memory:"), tenantConfig: ledenTenant,
  });
}

async function tokenVoor(app: ReturnType<typeof createApp>, email: string): Promise<string> {
  await app.request("/api/auth/request-code", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const res = await app.request("/api/auth/verify", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code: app.debugLastCode! }),
  });
  return ((await res.json()) as { token: string }).token;
}

const met = (token: string) => ({
  "Content-Type": "application/json", Authorization: `Bearer ${token}`,
});

describe("ledenroutes", () => {
  it("weigert aanmelden zonder inlog", async () => {
    const app = ledenApp();
    const res = await app.request("/api/leden", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ naam: "Tim" }),
    });
    expect(res.status).toBe(401);
  });

  it("meldt een ingelogd bezoeker aan als lid", async () => {
    const app = ledenApp();
    const token = await tokenVoor(app, "lid@example.org");
    const res = await app.request("/api/leden", {
      method: "POST", headers: met(token), body: JSON.stringify({ naam: "Tim" }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ naam: "Tim", status: "aangemeld" });
  });

  it("weigert een tweede aanmelding met hetzelfde adres", async () => {
    const app = ledenApp();
    const token = await tokenVoor(app, "lid@example.org");
    const body = JSON.stringify({ naam: "Tim" });
    await app.request("/api/leden", { method: "POST", headers: met(token), body });
    const res = await app.request("/api/leden", { method: "POST", headers: met(token), body });
    expect(res.status).toBe(409);
  });

  it("weigert een lege naam", async () => {
    const app = ledenApp();
    const token = await tokenVoor(app, "lid@example.org");
    const res = await app.request("/api/leden", {
      method: "POST", headers: met(token), body: JSON.stringify({ naam: "   " }),
    });
    expect(res.status).toBe(400);
  });

  it("geeft 404 op /api/leden/mij voor wie nog geen lid is", async () => {
    const app = ledenApp();
    const token = await tokenVoor(app, "lid@example.org");
    const res = await app.request("/api/leden/mij", { headers: met(token) });
    expect(res.status).toBe(404);
  });

  it("geeft het eigen ledenrecord na aanmelden", async () => {
    const app = ledenApp();
    const token = await tokenVoor(app, "lid@example.org");
    await app.request("/api/leden", {
      method: "POST", headers: met(token), body: JSON.stringify({ naam: "Tim" }),
    });
    const res = await app.request("/api/leden/mij", { headers: met(token) });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ naam: "Tim" });
  });

  it("weigert de ledenlijst voor een gewoon lid", async () => {
    const app = ledenApp();
    const token = await tokenVoor(app, "lid@example.org");
    const res = await app.request("/api/leden", { headers: met(token) });
    expect(res.status).toBe(403);
  });

  it("weigert de ledenlijst zonder inlog", async () => {
    const res = await ledenApp().request("/api/leden");
    expect(res.status).toBe(401);
  });

  it("geeft de ledenlijst aan een beheerder", async () => {
    const app = ledenApp();
    const lidToken = await tokenVoor(app, "lid@example.org");
    await app.request("/api/leden", {
      method: "POST", headers: met(lidToken), body: JSON.stringify({ naam: "Tim" }),
    });
    const bestuur = await tokenVoor(app, "bestuur@example.org");
    const res = await app.request("/api/leden", { headers: met(bestuur) });
    expect(res.status).toBe(200);
    expect((await res.json()) as unknown[]).toHaveLength(1);
  });

  it("herkent een beheerder ongeacht hoofdletters", async () => {
    const app = ledenApp();
    const bestuur = await tokenVoor(app, "Bestuur@Example.org");
    expect((await app.request("/api/leden", { headers: met(bestuur) })).status).toBe(200);
  });

  it("geeft de csv aan een beheerder met het juiste content-type", async () => {
    const app = ledenApp();
    const bestuur = await tokenVoor(app, "bestuur@example.org");
    const res = await app.request("/api/leden.csv", { headers: met(bestuur) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
  });

  it("weigert de csv zonder inlog", async () => {
    expect((await ledenApp().request("/api/leden.csv")).status).toBe(401);
  });

  it("weigert een naam die geen tekst is", async () => {
    const app = ledenApp();
    const token = await tokenVoor(app, "lid@example.org");
    const res = await app.request("/api/leden", {
      method: "POST", headers: met(token), body: JSON.stringify({ naam: 42 }),
    });
    expect(res.status).toBe(400);
  });

  it("weigert een naam boven de 200 tekens", async () => {
    const app = ledenApp();
    const token = await tokenVoor(app, "lid@example.org");
    const res = await app.request("/api/leden", {
      method: "POST", headers: met(token), body: JSON.stringify({ naam: "a".repeat(201) }),
    });
    expect(res.status).toBe(400);
  });

  it("weigert een naam die na verwijdering van onzichtbare tekens leeg is", async () => {
    const app = ledenApp();
    const token = await tokenVoor(app, "lid@example.org");
    // Zero-width spaces: onzichtbaar, maar niet leeg voor trim(). Via
    // fromCharCode geschreven zodat het teken niet als onzichtbare
    // brontekst in dit bestand hoeft te staan.
    const alleenZeroWidthSpaces = String.fromCharCode(0x200b, 0x200b, 0x200b);
    const res = await app.request("/api/leden", {
      method: "POST", headers: met(token), body: JSON.stringify({ naam: alleenZeroWidthSpaces }),
    });
    expect(res.status).toBe(400);
  });

  it("weigert de csv voor een gewoon lid", async () => {
    const app = ledenApp();
    const token = await tokenVoor(app, "lid@example.org");
    expect((await app.request("/api/leden.csv", { headers: met(token) })).status).toBe(403);
  });

  it("weigert /api/leden/beheerder zonder inlog", async () => {
    expect((await ledenApp().request("/api/leden/beheerder")).status).toBe(401);
  });

  it("zegt nee tegen een gewoon lid op /api/leden/beheerder", async () => {
    const app = ledenApp();
    const token = await tokenVoor(app, "lid@example.org");
    const res = await app.request("/api/leden/beheerder", { headers: met(token) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ beheerder: false });
  });

  it("zegt ja tegen een beheerder op /api/leden/beheerder, ook zonder lidmaatschap", async () => {
    const app = ledenApp();
    const token = await tokenVoor(app, "bestuur@example.org");
    const res = await app.request("/api/leden/beheerder", { headers: met(token) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ beheerder: true });
  });
});

// Beide meegeleverde tenantconfiguraties (apps/demo/server/tenant.json en
// deploy/tenant.saig.json) hebben géén ledenregister: dit is dus het
// standaardgedrag voor elke bestaande installatie, niet een uitzondering.
// De shell verbergen is geen beveiliging, dus dit moet ook zonder shell
// (rechtstreeks op de route) een 403 geven — met een geldig token.
describe("geen ledenregister zonder ledenregister: true in de tenantconfiguratie", () => {
  function appZonderRegister(admins?: string[]) {
    return createApp({
      authSecret: "test-secret", paymentsMock: true, db: openDb(":memory:"),
      tenantConfig: { hostname: "localhost", name: "Vereniging", catalog: [], admins },
    });
  }

  it("weigert POST /api/leden met 403, ook met een geldig token", async () => {
    const app = appZonderRegister();
    const token = await tokenVoor(app, "lid@example.org");
    const res = await app.request("/api/leden", {
      method: "POST", headers: met(token), body: JSON.stringify({ naam: "Tim" }),
    });
    expect(res.status).toBe(403);
  });

  it("weigert GET /api/leden met 403, zelfs voor een beheerder", async () => {
    const app = appZonderRegister(["bestuur@example.org"]);
    const token = await tokenVoor(app, "bestuur@example.org");
    expect((await app.request("/api/leden", { headers: met(token) })).status).toBe(403);
  });

  it("weigert GET /api/leden.csv met 403, zelfs voor een beheerder", async () => {
    const app = appZonderRegister(["bestuur@example.org"]);
    const token = await tokenVoor(app, "bestuur@example.org");
    expect((await app.request("/api/leden.csv", { headers: met(token) })).status).toBe(403);
  });

  it("weigert GET /api/leden/mij met 403", async () => {
    const app = appZonderRegister();
    const token = await tokenVoor(app, "lid@example.org");
    expect((await app.request("/api/leden/mij", { headers: met(token) })).status).toBe(403);
  });

  it("weigert GET /api/leden/beheerder met 403", async () => {
    const app = appZonderRegister(["bestuur@example.org"]);
    const token = await tokenVoor(app, "bestuur@example.org");
    expect((await app.request("/api/leden/beheerder", { headers: met(token) })).status).toBe(403);
  });

  it("weigert ook zonder inlog (403 vóór 401, want de route bestaat functioneel niet)", async () => {
    expect((await appZonderRegister().request("/api/leden")).status).toBe(403);
  });
});

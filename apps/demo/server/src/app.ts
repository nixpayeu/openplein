import { Hono, type Context } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { TenantConfig } from "@openplein/tenant";
import { isAdmin } from "@openplein/tenant";
import { meldAan, vindOpEmail, alleLeden, alsCsv } from "./leden";

interface Options {
  tenantConfig: TenantConfig;
  db: DatabaseSync;
  authSecret: string; paymentsMock: boolean; mollieApiKey?: string; publicUrl?: string;
  tokenTtlMs?: number;
  /** Testhaak, zoals tokenTtlMs: standaard 20, over aanvragen heen (zie verifyFailures). */
  maxVerifyAttempts?: number;
  /** Testhaak: hoe lang een adres geblokkeerd blijft na te veel foute pogingen. */
  verifyBlockDurationMs?: number;
  /**
   * Productie-only: serveert de gebouwde runtime-dist op "/" en de twee
   * mini-apps op /miniapps/lijstje en /miniapps/betalen (paden relatief aan
   * de cwd waarmee `pnpm --filter @openplein/demo-server start` draait,
   * d.w.z. `apps/demo/server`). Staat standaard uit zodat dev (`pnpm dev`,
   * losse mini-app-servers op :5180/:5181) en de tests (dist/ bestaat daar
   * niet) ongewijzigd blijven; in het Docker-image staat SERVE_STATIC=1.
   */
  serveStaticAssets?: boolean;
  /**
   * Demo-modus zonder SMTP: request-code geeft de inlogcode in de response
   * terug zodat de bezoeker hem op het scherm ziet. Identiteit is dan bewust
   * betekenisloos (iedereen kan elk e-mailadres "zijn") — acceptabel zolang
   * betalingen in de Mollie-TESTomgeving lopen. Nooit combineren met een
   * live-mode Mollie-key.
   */
  demoShowCode?: boolean;
}

type App = Hono & { debugLastCode?: string };

const DEFAULT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const MIME_BY_EXT: Record<string, string> = { svg: "image/svg+xml", png: "image/png" };

const MAX_NAAM_LENGTE = 200;
// Zero-width tekens en een BOM zijn onzichtbaar maar niet leeg voor trim():
// zonder deze filtering kan een naam die alleen uit zulke tekens bestaat
// langs de lege-naamcontrole glippen.
const ONZICHTBARE_TEKENS = /[\u200B-\u200D\uFEFF]/g;

/** Weigert een naam die geen tekst is, te lang is, of onzichtbaar leeg is. */
function naamIsGeldig(naam: unknown): naam is string {
  if (typeof naam !== "string" || naam.length > MAX_NAAM_LENGTE) return false;
  return naam.replace(ONZICHTBARE_TEKENS, "").trim() !== "";
}

/**
 * Zonder tenant-logo blijft het standaardicoon staan. Mét logo is het formaat
 * onbekend (kan een SVG-woordmerk of een PNG zijn) — vandaar `sizes: "any"`
 * en een `type` afgeleid uit de bestandsextensie, weggelaten bij een
 * onbekende extensie in plaats van een gok als "image/png" op te dringen.
 */
function iconFor(logoUrl: string | undefined): { src: string; sizes: string; type?: string } {
  if (!logoUrl) return { src: "/icon-512.png", sizes: "512x512", type: "image/png" };
  const ext = logoUrl.split(".").pop()?.toLowerCase();
  const type = ext ? MIME_BY_EXT[ext] : undefined;
  return type ? { src: logoUrl, sizes: "any", type } : { src: logoUrl, sizes: "any" };
}

export function createApp(opts: Options): App {
  // In demomodus staat de inlogcode op het scherm, en met AUTH_SECRET=e2e
  // ligt dezelfde code op straat via /api/auth/debug-last-code hieronder: in
  // beide gevallen is identiteit betekenisloos. Met beheerders erbij zou
  // iedere bezoeker het ledenregister kunnen lezen. Die combinatie weigeren we.
  if ((opts.demoShowCode || opts.authSecret === "e2e") && opts.tenantConfig.admins?.length) {
    throw new Error(
      "Demomodus (DEMO_SHOW_CODE) of AUTH_SECRET=e2e kan niet samen met beheerders: " +
        "in beide gevallen kan iedereen elk e-mailadres zijn.",
    );
  }

  const app = new Hono() as App;
  const tokenTtlMs = opts.tokenTtlMs ?? DEFAULT_TOKEN_TTL_MS;
  const codes = new Map<string, { code: string; expires: number }>();
  const mockPayments = new Map<string, { polls: number }>();
  // Foute pogingen tellen per e-mailadres, over aanvragen heen: een nieuwe
  // code aanvragen zet deze teller niet terug (dat was het lek — zie
  // verify hieronder). Bij te veel pogingen wordt het adres tijdelijk
  // geblokkeerd in plaats van dat de teller weer op nul begint, zodat een
  // gebruiker die zich verschrijft niet voorgoed vastloopt.
  const verifyFailures = new Map<string, { attempts: number; blockedUntil: number }>();
  const MAX_VERIFY_ATTEMPTS = opts.maxVerifyAttempts ?? 20;
  const VERIFY_BLOCK_DURATION_MS = opts.verifyBlockDurationMs ?? 15 * 60_000;
  const MAX_MOCK_PAYMENTS = 1000;

  const isGeblokkeerd = (email: string): boolean => {
    const s = verifyFailures.get(email);
    if (!s || s.blockedUntil === 0) return false; // nog niet geblokkeerd: teller loopt door
    if (s.blockedUntil > Date.now()) return true;
    verifyFailures.delete(email); // blokkade verlopen: fris beginnen
    return false;
  };

  const registreerFouteCode = (email: string): void => {
    const s = verifyFailures.get(email) ?? { attempts: 0, blockedUntil: 0 };
    s.attempts++;
    if (s.attempts >= MAX_VERIFY_ATTEMPTS) {
      s.blockedUntil = Date.now() + VERIFY_BLOCK_DURATION_MS;
      s.attempts = 0;
    }
    verifyFailures.set(email, s);
  };

  // Publiek: de shell heeft naam, kleuren en catalogus nodig vóór de inlog.
  // `admins` (e-mailadressen van bestuursleden) is geen publieke informatie.
  app.get("/api/tenant", (c) => {
    const { admins: _admins, ...publiek } = opts.tenantConfig;
    return c.json(publiek);
  });

  // Het webmanifest hoort bij de tenant, niet bij de build: het image is
  // tenant-neutraal (zie Dockerfile/docker-compose.yml), de tenantconfiguratie
  // wordt bij het opstarten gemount, dus de naam op het beginscherm komt
  // hiervandaan.
  app.get("/api/manifest.webmanifest", (c) => {
    const kleur = opts.tenantConfig.colors?.["navy-1"] ?? "#070F1C";
    return c.json({
      name: opts.tenantConfig.name, short_name: opts.tenantConfig.name,
      start_url: "/", display: "standalone",
      theme_color: kleur, background_color: kleur,
      icons: [iconFor(opts.tenantConfig.logoUrl)],
    }, 200, { "Content-Type": "application/manifest+json" });
  });

  const sign = (email: string, ts: number) => {
    const payload = Buffer.from(`${email}|${ts}`).toString("base64url");
    const mac = createHmac("sha256", opts.authSecret).update(payload).digest("base64url");
    return `${payload}.${mac}`;
  };
  const verifyToken = (token: string | undefined): boolean => {
    if (!token) return false;
    const [payload, mac] = token.split(".");
    if (!payload || !mac) return false;
    const expected = createHmac("sha256", opts.authSecret).update(payload).digest("base64url");
    let valid: boolean;
    try { valid = timingSafeEqual(Buffer.from(mac), Buffer.from(expected)); }
    catch { return false; }
    if (!valid) return false;
    const decoded = Buffer.from(payload, "base64url").toString();
    const ts = Number(decoded.slice(decoded.lastIndexOf("|") + 1));
    if (!Number.isFinite(ts) || Date.now() - ts > tokenTtlMs) return false;
    return true;
  };
  // Hergebruikt verifyToken voor de HMAC-/TTL-controle; leest daarna alleen
  // het al-gevalideerde e-mailadres uit de payload. Zo bestaat er maar één
  // plek die bepaalt of een token geldig is.
  const emailUitToken = (token: string | undefined): string | null => {
    if (!verifyToken(token)) return null;
    const payload = token!.split(".")[0];
    const decoded = Buffer.from(payload, "base64url").toString();
    return decoded.slice(0, decoded.lastIndexOf("|"));
  };
  const emailVanRequest = (c: Context): string | null =>
    emailUitToken(c.req.header("Authorization")?.replace(/^Bearer /, ""));

  app.post("/api/auth/request-code", async (c) => {
    const { email } = await c.req.json<{ email: string }>();
    if (!email?.includes("@")) return c.body(null, 400);
    const now = Date.now();
    // Ruim vervallen codes op vóór het zetten van een nieuwe (goedkope,
    // opportunistische opschoning i.p.v. een aparte cron/timer).
    for (const [key, entry] of codes) if (entry.expires < now) codes.delete(key);
    const code = String(randomInt(100000, 1000000));
    // Bewust geen `attempts` hier: de pogingenteller leeft in verifyFailures
    // en blijft bestaan zolang het adres niet geblokkeerd raakt of inlogt,
    // juist zodat een nieuwe aanvraag geen frisse reeks gokpogingen geeft.
    codes.set(email, { code, expires: now + 10 * 60_000 });
    app.debugLastCode = code;
    console.log(`[plein-auth] code voor ${email}: ${code}`);
    // optioneel: SMTP_URL → nodemailer.sendMail; stdout blijft de primaire MVP-flow
    if (opts.demoShowCode) return c.json({ demoCode: code });
    return c.body(null, 204);
  });

  if (opts.authSecret === "e2e") {
    app.get("/api/auth/debug-last-code", (c) => c.json({ code: app.debugLastCode ?? "" }));
  }

  app.post("/api/auth/verify", async (c) => {
    const { email, code } = await c.req.json<{ email: string; code: string }>();
    // Vóór de codecontrole: een nieuwe code aanvragen mag een blokkade niet
    // omzeilen. Zonder deze regel kost brute-force op de 6-cijferige code
    // hooguit MAX_VERIFY_ATTEMPTS gokken per aanvraag, met onbeperkt veel
    // aanvragen — dat was het lek. De teller in verifyFailures loopt nu over
    // aanvragen heen door.
    if (isGeblokkeerd(email)) return c.body(null, 401);
    const entry = codes.get(email);
    if (!entry || entry.expires < Date.now()) return c.body(null, 401);
    if (entry.code !== code) {
      registreerFouteCode(email);
      return c.body(null, 401);
    }
    codes.delete(email);
    verifyFailures.delete(email);
    return c.json({ token: sign(email, Date.now()) });
  });

  app.use("/api/payments/*", async (c, next) => {
    const auth = c.req.header("Authorization");
    if (!verifyToken(auth?.replace(/^Bearer /, ""))) return c.body(null, 401);
    await next();
  });

  app.post("/api/payments", async (c) => {
    const body = await c.req.json<{ amount: string; description: string; appId: string }>();
    if (opts.paymentsMock) {
      const id = `mock_${Date.now()}`;
      mockPayments.set(id, { polls: 0 });
      // Simpele cap i.p.v. TTL-opschoning: mock-betalingen zijn alleen voor
      // demo/dev, dus oudste entries laten vallen boven de grens volstaat.
      if (mockPayments.size > MAX_MOCK_PAYMENTS) {
        const oldest = mockPayments.keys().next().value;
        if (oldest !== undefined) mockPayments.delete(oldest);
      }
      return c.json({ id, checkoutUrl: `/mock-checkout?id=${id}` });
    }
    const { createMollieClient } = await import("@mollie/api-client");
    const mollie = createMollieClient({ apiKey: opts.mollieApiKey! });
    const payment = await mollie.payments.create({
      amount: { currency: "EUR", value: body.amount },
      description: body.description,
      redirectUrl: opts.publicUrl ?? "http://localhost:5173",
      metadata: { appId: body.appId },
    });
    return c.json({ id: payment.id, checkoutUrl: payment.getCheckoutUrl() });
  });

  app.get("/api/payments/:id", async (c) => {
    const id = c.req.param("id");
    if (opts.paymentsMock) {
      const p = mockPayments.get(id);
      if (!p) return c.body(null, 404);
      p.polls++;
      return c.json({ status: p.polls >= 1 ? "paid" : "open" });
    }
    const { createMollieClient } = await import("@mollie/api-client");
    const mollie = createMollieClient({ apiKey: opts.mollieApiKey! });
    const payment = await mollie.payments.get(id);
    return c.json({ status: payment.status });
  });

  // Ledenregister is opt-in per tenant (`ledenregister: true`), standaard
  // uit. De shell verbergen is geen beveiliging: zonder deze poort zou een
  // installatie zonder register alsnog ledenrecords kunnen aanmaken en
  // teruggeven zodra iemand de routes rechtstreeks aanroept.
  const ledenregisterPoort = async (c: Context, next: () => Promise<void>) => {
    if (!opts.tenantConfig.ledenregister) return c.body(null, 403);
    await next();
  };
  app.use("/api/leden", ledenregisterPoort);
  app.use("/api/leden/*", ledenregisterPoort);
  app.use("/api/leden.csv", ledenregisterPoort);

  app.get("/api/leden/mij", (c) => {
    const email = emailVanRequest(c);
    if (!email) return c.body(null, 401);
    const lid = vindOpEmail(opts.db, email);
    return lid ? c.json(lid) : c.body(null, 404);
  });

  // Losse route i.p.v. een veld op /api/leden/mij: die route gaat over het
  // eigen lidmaatschap en geeft 404 zonder record, terwijl een bestuurslid
  // geen lid hoeft te zijn. Eén route, één betekenis; de shell gebruikt dit
  // alleen om de knop naar het ledenregister te tonen, niet als beveiliging
  // (die zit op /api/leden en /api/leden.csv zelf).
  app.get("/api/leden/beheerder", (c) => {
    const email = emailVanRequest(c);
    if (!email) return c.body(null, 401);
    return c.json({ beheerder: isAdmin(opts.tenantConfig, email) });
  });

  app.post("/api/leden", async (c) => {
    const email = emailVanRequest(c);
    if (!email) return c.body(null, 401);
    const { naam } = await c.req.json<{ naam: unknown }>();
    if (!naamIsGeldig(naam)) return c.body(null, 400);
    if (vindOpEmail(opts.db, email)) return c.body(null, 409);
    return c.json(meldAan(opts.db, email, naam), 201);
  });

  // Ledenlijst en -export zijn alleen voor beheerders: e-mailadres uit het
  // token moet voorkomen in `tenantConfig.admins`.
  app.get("/api/leden", (c) => {
    const email = emailVanRequest(c);
    if (!email) return c.body(null, 401);
    if (!isAdmin(opts.tenantConfig, email)) return c.body(null, 403);
    return c.json(alleLeden(opts.db));
  });

  app.get("/api/leden.csv", (c) => {
    const email = emailVanRequest(c);
    if (!email) return c.body(null, 401);
    if (!isAdmin(opts.tenantConfig, email)) return c.body(null, 403);
    return c.body(alsCsv(alleLeden(opts.db)), 200, { "Content-Type": "text/csv" });
  });

  if (opts.serveStaticAssets) {
    // CSP op /miniapps/*: de demo mini-apps gebruiken alleen een inline
    // <style>-blok en lokale scripts (plein-client.js, app.js) — geen
    // externe requests, geen eval. style-src staat 'unsafe-inline' toe voor
    // dat <style>-blok; img-src staat data: toe (iconen kunnen als data-URI
    // ingeladen worden). Technische handhaving van de "eigen origin"-regel
    // uit §4 van docs/miniapp-spec.md; volledige mini-app-registry-
    // handhaving is fase 2.
    app.use("/miniapps/*", async (c, next) => {
      await next();
      c.header(
        "Content-Security-Policy",
        "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
      );
    });
    app.use(
      "/miniapps/lijstje/*",
      serveStatic({
        root: "../miniapps/lijstje",
        rewriteRequestPath: (path) => path.replace(/^\/miniapps\/lijstje/, ""),
      }),
    );
    app.use(
      "/miniapps/betalen/*",
      serveStatic({
        root: "../miniapps/betalen",
        rewriteRequestPath: (path) => path.replace(/^\/miniapps\/betalen/, ""),
      }),
    );
    // Vangt alles wat niet door /api of /miniapps is afgehandeld: runtime-dist op "/".
    app.use("/*", serveStatic({ root: "../../../packages/runtime/dist" }));
  }

  return app;
}

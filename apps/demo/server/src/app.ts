import { Hono } from "hono";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

interface Options {
  authSecret: string; paymentsMock: boolean; mollieApiKey?: string; publicUrl?: string;
  tokenTtlMs?: number;
}

type App = Hono & { debugLastCode?: string };

const DEFAULT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function createApp(opts: Options): App {
  const app = new Hono() as App;
  const tokenTtlMs = opts.tokenTtlMs ?? DEFAULT_TOKEN_TTL_MS;
  const codes = new Map<string, { code: string; expires: number }>();
  const mockPayments = new Map<string, { polls: number }>();

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

  app.post("/api/auth/request-code", async (c) => {
    const { email } = await c.req.json<{ email: string }>();
    if (!email?.includes("@")) return c.body(null, 400);
    const code = String(randomInt(100000, 1000000));
    codes.set(email, { code, expires: Date.now() + 10 * 60_000 });
    app.debugLastCode = code;
    console.log(`[plein-auth] code voor ${email}: ${code}`);
    // optioneel: SMTP_URL → nodemailer.sendMail; stdout blijft de primaire MVP-flow
    return c.body(null, 204);
  });

  if (opts.authSecret === "e2e") {
    app.get("/api/auth/debug-last-code", (c) => c.json({ code: app.debugLastCode ?? "" }));
  }

  app.post("/api/auth/verify", async (c) => {
    const { email, code } = await c.req.json<{ email: string; code: string }>();
    const entry = codes.get(email);
    if (!entry || entry.expires < Date.now() || entry.code !== code) return c.body(null, 401);
    codes.delete(email);
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

  return app;
}

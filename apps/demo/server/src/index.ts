import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadTenantConfig } from "./tenant";
import { openDb } from "./db";

// process.env.AUTH_SECRET ?? "dev..." vangt alleen "ontbreekt helemaal" af.
// docker-compose geeft bij een missende .env een lege string ("") door, wat
// een falsy-maar-gedefinieerde waarde is — ?? laat die ongemoeid door en de
// server zou dan met een lege HMAC-sleutel draaien. Onderscheid daarom
// expliciet tussen "ontbreekt" (undefined → dev-fallback, prima voor lokale
// dev) en "leeg" (weiger te starten).
const rawAuthSecret = process.env.AUTH_SECRET;
let authSecret: string;
if (rawAuthSecret === undefined) {
  authSecret = "dev-secret-verander-mij";
} else if (rawAuthSecret.trim() === "") {
  console.error(
    "[plein-demo-server] AUTH_SECRET is leeg — zet een geheime waarde in .env " +
      "(bijv. `openssl rand -hex 32`). Server start niet met een lege sleutel.",
  );
  process.exit(1);
} else {
  authSecret = rawAuthSecret;
}

// Elke weigering om te starten (ontbrekende of verkeerde tenantconfiguratie,
// demomodus samen met beheerders) hoort als leesbare regel in de logs te staan
// en niet als ruwe stacktrace, net als de AUTH_SECRET-controle hierboven.
function bouwApp() {
  return createApp({
    tenantConfig: loadTenantConfig(
      process.env.TENANT_CONFIG ?? "./tenant.json",
      process.env.TENANT_HOSTNAME ?? "localhost",
    ),
    db: openDb(process.env.DB_PATH ?? "./plein.db"),
    authSecret,
    paymentsMock: process.env.PAYMENTS_MOCK === "1",
    mollieApiKey: process.env.MOLLIE_API_KEY,
    publicUrl: process.env.PUBLIC_URL,
    serveStaticAssets: process.env.SERVE_STATIC === "1",
    demoShowCode: process.env.DEMO_SHOW_CODE === "1",
  });
}

let app: ReturnType<typeof createApp>;
try {
  app = bouwApp();
} catch (e) {
  console.error(`[plein-demo-server] ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}

serve({ fetch: app.fetch, port: 5175 });
console.log("[plein-demo-server] http://localhost:5175");

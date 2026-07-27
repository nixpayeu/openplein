import { serve } from "@hono/node-server";
import { createApp } from "./app";

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

const app = createApp({
  authSecret,
  paymentsMock: process.env.PAYMENTS_MOCK === "1",
  mollieApiKey: process.env.MOLLIE_API_KEY,
  publicUrl: process.env.PUBLIC_URL,
  serveStaticAssets: process.env.SERVE_STATIC === "1",
});
serve({ fetch: app.fetch, port: 5175 });
console.log("[plein-demo-server] http://localhost:5175");

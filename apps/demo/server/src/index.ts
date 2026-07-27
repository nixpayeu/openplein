import { serve } from "@hono/node-server";
import { createApp } from "./app";

const app = createApp({
  authSecret: process.env.AUTH_SECRET ?? "dev-secret-verander-mij",
  paymentsMock: process.env.PAYMENTS_MOCK === "1",
  mollieApiKey: process.env.MOLLIE_API_KEY,
  publicUrl: process.env.PUBLIC_URL,
});
serve({ fetch: app.fetch, port: 5175 });
console.log("[plein-demo-server] http://localhost:5175");

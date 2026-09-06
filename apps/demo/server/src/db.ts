import { createRequire } from "node:module";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";

// Vite/vitest (de versie in de lockfile) herkent `node:sqlite` niet als
// ingebouwde Node-module: hun lijst met builtins is hier niet op aangepast,
// op zowel Node 22 als Node 24. Een gewone
// `import { DatabaseSync } from "node:sqlite"` laat vitest daardoor breken
// met "Failed to load url sqlite". `createRequire` haalt nog steeds gewoon
// `node:sqlite` op, maar via een CommonJS-require die niet door Vite's
// import-analyse loopt.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

/**
 * Eén databasebestand per installatie, net als één tenantconfiguratie per
 * installatie. `node:sqlite` zit in Node ingebouwd, dus dit voegt geen
 * afhankelijkheid toe. Het schema wordt bij elke start klaargezet; dat is
 * goedkoop en scheelt een migratiestap zolang er één tabel bij komt.
 */
export function openDb(path: string): DatabaseSyncType {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  return db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS leden (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  naam TEXT NOT NULL,
  status TEXT NOT NULL,
  aangemeld_op TEXT NOT NULL,
  mollie_klant_id TEXT,
  mollie_abonnement_id TEXT
);
CREATE TABLE IF NOT EXISTS webhook_gezien (
  id TEXT PRIMARY KEY,
  gezien_op TEXT NOT NULL
);
`;

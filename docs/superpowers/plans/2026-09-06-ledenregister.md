# Ledenregister, implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een vereniging kan leden inschrijven en het bestuur kan het ledenregister inzien en exporteren, zonder dat de shell daarvoor een rollenmodel of een tweede inlogweg nodig heeft.

**Architecture:** De server krijgt persistente opslag via `node:sqlite`, dat in Node ingebouwd zit en dus geen afhankelijkheid toevoegt. Eén databasebestand per installatie, net als één tenantconfiguratie per installatie. De ledenmodule kent alleen ledenrecords en statusovergangen; wie het register mag zien wordt bepaald door een lijst e-mailadressen in de tenantconfiguratie, vergeleken met het adres in het bestaande inlogtoken. Er komt geen rollenmodel en geen tweede inlogweg bij.

**Tech Stack:** TypeScript, pnpm-workspace, vitest, Hono op Node 24, `node:sqlite`, React 18 met Vite, ajv voor schemavalidatie.

## Global Constraints

- Node `>=24.0.0`, pnpm `11.5.0`.
- **Geen nieuwe externe afhankelijkheden.** Opslag gaat via `node:sqlite` uit de standaardbibliotheek.
- Nederlandstalige code-commentaren, foutmeldingen en gebruikersteksten, in lijn met de bestaande code.
- Functies onder de 10 regels waar dat kan.
- `packages/tenant` mag géén afhankelijkheid op `@openplein/sdk` krijgen.
- De sleutelverzamelingen van `nl.json` en `en.json` moeten identiek blijven; er is een test die daarop controleert.
- Runtime-tests die de DOM of localStorage nodig hebben, beginnen met `// @vitest-environment jsdom`.
- Testen: `pnpm test`. Typecheck: `pnpm typecheck`. E2e: `pnpm --filter @openplein/e2e test`.
- Persoonsgegevens blijven op de server. Een mini-app krijgt nooit een naam of een e-mailadres via `identity.request()`; dat contract verandert niet.

## Let op: de machine draait Node 22, de repo vraagt Node 24

De ontwikkelmachine heeft Node 22 in het `PATH` terwijl `engines` Node 24 vraagt. Daardoor zie je twee dingen die verwacht zijn en die je moet negeren:

1. `[WARN] Unsupported engine` bij elk pnpm-commando.
2. `ExperimentalWarning: SQLite is an experimental feature` zodra `node:sqlite` geladen wordt.

Gemeten: `node:sqlite` werkt op Node 22.22 gewoon, zonder vlag. Op Node 24, wat de Dockerfile en CI gebruiken, verdwijnt de tweede waarschuwing. Ga die waarschuwing dus niet onderdrukken en pas er geen testconfiguratie op aan: hij hoort bij deze machine, niet bij het product.

## Ontwerpbeslissingen

Vastgesteld met de eigenaar voordat dit plan geschreven werd:

| Vraag | Keuze |
|---|---|
| Wie mag het register zien | Een lijst e-mailadressen in de tenantconfiguratie, vergeleken met het adres uit het inlogtoken |
| Naam van het lid | Wordt gevraagd bij het aanmelden en staat op het ledenrecord; gaat nooit naar een mini-app |
| Opslag | `node:sqlite`, één databasebestand per installatie |

## De valkuil die dit plan expliciet afvangt

De server kent een demomodus (`DEMO_SHOW_CODE=1`) waarin de inlogcode op het scherm verschijnt in plaats van per e-mail. In die modus is identiteit bewust betekenisloos: iedereen kan elk e-mailadres "zijn".

Zodra er beheerders in de tenantconfiguratie staan, is die combinatie een lek: iedere bezoeker logt dan in als een beheerder en leest het volledige ledenregister met namen en adressen. De server weigert daarom te starten als beide tegelijk aanstaan. Dat is geen extraatje maar de kern van taak 4.

## Wat dit plan bewust niet doet

Contributie-inning krijgt een eigen plan, inclusief de Mollie-klant, de incassomachtiging, het abonnement, de idempotente webhook en het verplichte webhookgeheim. Dit plan levert het register; het veld waarin een Mollie-klantnummer straks landt, wordt hier alvast aangemaakt zodat die ronde geen migratie nodig heeft.

Ook niet in dit plan: de datumprikker-mini-app en `HANDVEST.md`.

---

### Task 1: Beheerders in de tenantconfiguratie

**Files:**
- Modify: `packages/tenant/src/schema.json`
- Modify: `packages/tenant/src/tenant.ts`
- Modify: `packages/tenant/src/tenant.test.ts`

**Interfaces:**
- Consumes: niets uit eerdere taken.
- Produces: `TenantConfig` krijgt het optionele veld `admins?: string[]`, en `isAdmin(config: TenantConfig, email: string): boolean` die hoofdletterongevoelig vergelijkt en `false` teruggeeft als er geen `admins` is.

Hoofdletterongevoelig vergelijken is geen detail: e-mailadressen worden door gebruikers ingetypt, en `Tim@Example.org` hoort dezelfde beheerder te zijn als `tim@example.org`.

- [ ] **Step 1: Schrijf de falende test**

Voeg toe aan `packages/tenant/src/tenant.test.ts`:

```ts
import { validateTenantConfig, isAdmin } from "./tenant";

const metBeheerders = {
  hostname: "plein.example.org",
  name: "Voorbeeld",
  catalog: [],
  admins: ["tim@example.org", "bestuur@example.org"],
};

describe("admins in de tenantconfiguratie", () => {
  it("accepteert een lijst beheerders", () => {
    expect(validateTenantConfig(metBeheerders).valid).toBe(true);
  });

  it("weigert een lege lijst", () => {
    expect(validateTenantConfig({ ...metBeheerders, admins: [] }).valid).toBe(false);
  });

  it("weigert een leeg adres in de lijst", () => {
    expect(validateTenantConfig({ ...metBeheerders, admins: [""] }).valid).toBe(false);
  });
});

describe("isAdmin", () => {
  const config = (() => {
    const r = validateTenantConfig(metBeheerders);
    if (!r.valid) throw new Error("configuratie zou geldig moeten zijn");
    return r.config;
  })();

  it("herkent een beheerder", () => {
    expect(isAdmin(config, "tim@example.org")).toBe(true);
  });

  it("vergelijkt hoofdletterongevoelig", () => {
    expect(isAdmin(config, "Tim@Example.org")).toBe(true);
  });

  it("wijst een gewoon lid af", () => {
    expect(isAdmin(config, "lid@example.org")).toBe(false);
  });

  it("wijst iedereen af als er geen beheerders zijn", () => {
    const r = validateTenantConfig({ hostname: "localhost", name: "Plein", catalog: [] });
    if (!r.valid) throw new Error("configuratie zou geldig moeten zijn");
    expect(isAdmin(r.config, "tim@example.org")).toBe(false);
  });
});
```

Een lege `admins`-lijst wordt geweigerd omdat hij twee dingen kan betekenen: "niemand is beheerder" en "ik ben vergeten dit in te vullen". Die twee horen niet op elkaar te lijken. Wie geen beheerders wil, laat het veld weg.

- [ ] **Step 2: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run packages/tenant`
Expected: FAIL, `isAdmin` bestaat niet en het schema weigert `admins` als onbekend veld.

- [ ] **Step 3: Breid het schema uit**

Voeg in `packages/tenant/src/schema.json` binnen `properties` toe:

```json
    "admins": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string", "minLength": 1 }
    }
```

- [ ] **Step 4: Breid het type en de hulpfunctie uit**

Voeg in `packages/tenant/src/tenant.ts` aan de interface `TenantConfig` toe:

```ts
  admins?: string[];
```

En voeg onderaan het bestand toe:

```ts
/**
 * Bestuursleden staan als e-mailadres in de tenantconfiguratie, niet als rol
 * in de database: een vereniging beheert ze dan in hetzelfde bestand als de
 * rest. Hoofdletterongevoelig, want adressen worden met de hand ingetypt.
 */
export function isAdmin(config: TenantConfig, email: string): boolean {
  const gezocht = email.trim().toLowerCase();
  return (config.admins ?? []).some((a) => a.trim().toLowerCase() === gezocht);
}
```

- [ ] **Step 5: Draai de test en controleer dat hij slaagt**

Run: `pnpm vitest run packages/tenant`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/tenant
git commit -m "feat(tenant): beheerders als e-mailadressen in de tenantconfiguratie"
```

---

### Task 2: Opslag met `node:sqlite`

**Files:**
- Create: `apps/demo/server/src/db.ts`
- Create: `apps/demo/server/src/db.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: niets uit eerdere taken.
- Produces: `openDb(path: string): DatabaseSync` uit `apps/demo/server/src/db.ts`. De functie opent het bestand, zet de schema-tabellen klaar als die er nog niet zijn, en geeft de verbinding terug. `path` mag `":memory:"` zijn; dat is wat de tests gebruiken.

- [ ] **Step 1: Schrijf de falende test**

`apps/demo/server/src/db.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { openDb } from "./db";

describe("openDb", () => {
  it("maakt de ledentabel aan", () => {
    const db = openDb(":memory:");
    const rijen = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const namen = rijen.map((r) => (r as { name: string }).name);
    expect(namen).toContain("leden");
    expect(namen).toContain("webhook_gezien");
    db.close();
  });

  it("is idempotent: tweemaal openen gaat goed", () => {
    const db = openDb(":memory:");
    expect(() => openDb(":memory:")).not.toThrow();
    db.close();
  });

  it("dwingt af dat een e-mailadres maar één keer voorkomt", () => {
    const db = openDb(":memory:");
    const invoegen = db.prepare(
      "INSERT INTO leden (id, email, naam, status, aangemeld_op) VALUES (?, ?, ?, ?, ?)",
    );
    invoegen.run("1", "a@example.org", "Aap", "aangemeld", "2026-09-06T00:00:00.000Z");
    expect(() =>
      invoegen.run("2", "a@example.org", "Noot", "aangemeld", "2026-09-06T00:00:00.000Z"),
    ).toThrow();
    db.close();
  });
});
```

- [ ] **Step 2: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run apps/demo/server/src/db.test.ts`
Expected: FAIL, `./db` bestaat niet.

- [ ] **Step 3: Schrijf de implementatie**

`apps/demo/server/src/db.ts`:

```ts
import { DatabaseSync } from "node:sqlite";

/**
 * Eén databasebestand per installatie, net als één tenantconfiguratie per
 * installatie. `node:sqlite` zit in Node ingebouwd, dus dit voegt geen
 * afhankelijkheid toe. Het schema wordt bij elke start klaargezet; dat is
 * goedkoop en scheelt een migratiestap zolang er één tabel bij komt.
 */
export function openDb(path: string): DatabaseSync {
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
```

De twee `mollie_`-kolommen worden in dit plan nergens gebruikt. Ze staan er zodat de contributieronde geen migratie nodig heeft. Vul ze niet en lees ze niet.

- [ ] **Step 4: Draai de test en controleer dat hij slaagt**

Run: `pnpm vitest run apps/demo/server/src/db.test.ts`
Expected: PASS, 3 tests. Je ziet een `ExperimentalWarning` over SQLite; die hoort bij Node 22 op deze machine en is geen bevinding.

- [ ] **Step 5: Houd databasebestanden uit git**

Voeg toe aan `.gitignore`:

```
*.db
*.db-journal
```

Run: `git status --porcelain`
Expected: geen databasebestanden als ongetrackt bestand.

- [ ] **Step 6: Commit**

```bash
git add apps/demo/server/src/db.ts apps/demo/server/src/db.test.ts .gitignore
git commit -m "feat(server): opslag met node:sqlite, schema voor leden"
```

---

### Task 3: De ledenmodule

**Files:**
- Create: `apps/demo/server/src/leden.ts`
- Create: `apps/demo/server/src/leden.test.ts`

**Interfaces:**
- Consumes: `openDb` uit `./db` (Task 2).
- Produces, allemaal uit `apps/demo/server/src/leden.ts`:
  - `type LidStatus = "aangemeld" | "lid" | "opgezegd"`
  - `interface Lid { id: string; email: string; naam: string; status: LidStatus; aangemeldOp: string }`
  - `meldAan(db, email: string, naam: string): Lid`: maakt een lid met status `aangemeld`; gooit als het adres al bestaat
  - `vindOpEmail(db, email: string): Lid | null`
  - `zetStatus(db, id: string, status: LidStatus): void`: gooit bij een onbekend id
  - `alleLeden(db): Lid[]`: gesorteerd op aanmelddatum, oudste eerst
  - `alsCsv(leden: Lid[]): string`

De module weet niets van betalen. De contributieronde zet straks de status via `zetStatus` en kent van een lid alleen het id.

- [ ] **Step 1: Schrijf de falende test**

`apps/demo/server/src/leden.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { openDb } from "./db";
import { meldAan, vindOpEmail, zetStatus, alleLeden, alsCsv } from "./leden";
import type { DatabaseSync } from "node:sqlite";

let db: DatabaseSync;
beforeEach(() => { db = openDb(":memory:"); });

describe("meldAan", () => {
  it("maakt een lid met status aangemeld", () => {
    const lid = meldAan(db, "tim@example.org", "Tim");
    expect(lid.status).toBe("aangemeld");
    expect(lid.naam).toBe("Tim");
    expect(lid.id).toBeTruthy();
  });

  it("bewaart het adres in kleine letters", () => {
    expect(meldAan(db, "Tim@Example.org", "Tim").email).toBe("tim@example.org");
  });

  it("weigert een tweede aanmelding met hetzelfde adres", () => {
    meldAan(db, "tim@example.org", "Tim");
    expect(() => meldAan(db, "Tim@example.org", "Tim opnieuw")).toThrow();
  });

  it("weigert een lege naam", () => {
    expect(() => meldAan(db, "tim@example.org", "  ")).toThrow();
  });
});

describe("vindOpEmail", () => {
  it("vindt een lid, hoofdletterongevoelig", () => {
    meldAan(db, "tim@example.org", "Tim");
    expect(vindOpEmail(db, "TIM@EXAMPLE.ORG")?.naam).toBe("Tim");
  });

  it("geeft null voor een onbekend adres", () => {
    expect(vindOpEmail(db, "niemand@example.org")).toBeNull();
  });
});

describe("zetStatus", () => {
  it("wijzigt de status", () => {
    const lid = meldAan(db, "tim@example.org", "Tim");
    zetStatus(db, lid.id, "lid");
    expect(vindOpEmail(db, "tim@example.org")?.status).toBe("lid");
  });

  it("gooit bij een onbekend id", () => {
    expect(() => zetStatus(db, "bestaat-niet", "lid")).toThrow();
  });
});

describe("alleLeden", () => {
  it("geeft de leden terug, oudste aanmelding eerst", () => {
    meldAan(db, "een@example.org", "Een");
    meldAan(db, "twee@example.org", "Twee");
    expect(alleLeden(db).map((l) => l.naam)).toEqual(["Een", "Twee"]);
  });

  it("geeft een lege lijst zonder leden", () => {
    expect(alleLeden(db)).toEqual([]);
  });
});

describe("alsCsv", () => {
  it("begint met een kopregel", () => {
    expect(alsCsv([]).split("\n")[0]).toBe("naam,email,status,aangemeld_op");
  });

  it("zet een naam met een komma tussen aanhalingstekens", () => {
    meldAan(db, "tim@example.org", 'Tim, de "echte"');
    const regel = alsCsv(alleLeden(db)).split("\n")[1];
    expect(regel).toContain('"Tim, de ""echte"""');
  });
});
```

De laatste test is er niet voor de vorm. Een ledenlijst bevat namen van echte mensen, en een naam met een komma of een aanhalingsteken erin hoort geen kolom op te schuiven in het bestand dat het bestuur in een spreadsheet opent.

- [ ] **Step 2: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run apps/demo/server/src/leden.test.ts`
Expected: FAIL, `./leden` bestaat niet.

- [ ] **Step 3: Schrijf de implementatie**

`apps/demo/server/src/leden.ts`:

```ts
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export type LidStatus = "aangemeld" | "lid" | "opgezegd";

export interface Lid {
  id: string; email: string; naam: string; status: LidStatus; aangemeldOp: string;
}

interface Rij {
  id: string; email: string; naam: string; status: string; aangemeld_op: string;
}

const naarLid = (r: Rij): Lid => ({
  id: r.id, email: r.email, naam: r.naam,
  status: r.status as LidStatus, aangemeldOp: r.aangemeld_op,
});

export function meldAan(db: DatabaseSync, email: string, naam: string): Lid {
  if (naam.trim() === "") throw new Error("Naam mag niet leeg zijn");
  const lid: Lid = {
    id: randomUUID(), email: email.trim().toLowerCase(), naam: naam.trim(),
    status: "aangemeld", aangemeldOp: new Date().toISOString(),
  };
  db.prepare("INSERT INTO leden (id, email, naam, status, aangemeld_op) VALUES (?, ?, ?, ?, ?)")
    .run(lid.id, lid.email, lid.naam, lid.status, lid.aangemeldOp);
  return lid;
}

export function vindOpEmail(db: DatabaseSync, email: string): Lid | null {
  const r = db.prepare("SELECT * FROM leden WHERE email = ?").get(email.trim().toLowerCase());
  return r ? naarLid(r as Rij) : null;
}

export function zetStatus(db: DatabaseSync, id: string, status: LidStatus): void {
  const r = db.prepare("UPDATE leden SET status = ? WHERE id = ?").run(status, id);
  if (r.changes === 0) throw new Error(`Onbekend lid: ${id}`);
}

export function alleLeden(db: DatabaseSync): Lid[] {
  const rijen = db.prepare("SELECT * FROM leden ORDER BY aangemeld_op ASC").all();
  return (rijen as Rij[]).map(naarLid);
}

/** Een naam mag komma's en aanhalingstekens bevatten; die mogen geen kolom opschuiven. */
const veld = (w: string): string => `"${w.replace(/"/g, '""')}"`;

export function alsCsv(leden: Lid[]): string {
  const kop = "naam,email,status,aangemeld_op";
  const regels = leden.map((l) => [l.naam, l.email, l.status, l.aangemeldOp].map(veld).join(","));
  return [kop, ...regels].join("\n");
}
```

- [ ] **Step 4: Draai de test en controleer dat hij slaagt**

Run: `pnpm vitest run apps/demo/server/src/leden.test.ts`
Expected: PASS, 11 tests.

Faalt de test over de aanmeldvolgorde omdat twee aanmeldingen in dezelfde milliseconde vallen, meld dat dan in plaats van er een wachtlus in te bouwen: de sortering moet dan op iets stabielers dan de tijdstempel, en dat is een ontwerpwijziging die niet in dit plan staat.

- [ ] **Step 5: Commit**

```bash
git add apps/demo/server/src/leden.ts apps/demo/server/src/leden.test.ts
git commit -m "feat(server): ledenmodule met status, sortering en csv-export"
```

---

### Task 4: Routes en de beheerderspoort

**Files:**
- Modify: `apps/demo/server/src/app.ts`
- Modify: `apps/demo/server/src/app.test.ts`
- Modify: `apps/demo/server/src/index.ts`

**Interfaces:**
- Consumes: `isAdmin` uit `@openplein/tenant` (Task 1), `openDb` (Task 2), de ledenmodule (Task 3).
- Produces:
  - `Options` krijgt `db: DatabaseSync`
  - `GET /api/leden/mij`: het eigen ledenrecord of 404, inloggen vereist
  - `POST /api/leden`: `{ naam }`, adres komt uit het token, maakt een lid aan
  - `GET /api/leden`: de volledige lijst, alleen voor beheerders
  - `GET /api/leden.csv`: dezelfde lijst als CSV, alleen voor beheerders
  - een hulpfunctie die het e-mailadres uit een geldig token leest

Het bestaande `verifyToken` geeft alleen `true` of `false` terug. Er is een variant nodig die het adres teruggeeft, want zonder adres kan de beheerderscontrole niet.

- [ ] **Step 1: Schrijf de falende test voor de demomodus-weigering**

Voeg toe aan `apps/demo/server/src/app.test.ts`:

```ts
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
});
```

In de demomodus verschijnt de inlogcode op het scherm, dus kan iedereen elk adres "zijn". Met beheerders in de configuratie betekent dat: iedere bezoeker leest het volledige ledenregister. Die combinatie mag niet kunnen bestaan.

- [ ] **Step 2: Schrijf de falende tests voor de routes**

De bestaande tests in dit bestand loggen in via `/api/auth/request-code` gevolgd door `/api/auth/verify`, met `app.debugLastCode` als test-only toegang tot de code. Hergebruik dat patroon; fabriceer geen token met de hand.

Voeg toe aan hetzelfde bestand:

```ts
const ledenTenant = {
  hostname: "localhost", name: "Vereniging", catalog: [],
  admins: ["bestuur@example.org"],
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

  it("weigert de csv voor een gewoon lid", async () => {
    const app = ledenApp();
    const token = await tokenVoor(app, "lid@example.org");
    expect((await app.request("/api/leden.csv", { headers: met(token) })).status).toBe(403);
  });
});
```

Let op de test die een beheerder met hoofdletters herkent: het adres komt uit een inlogformulier waar iemand zijn eigen adres intypt, en die typt niet altijd hetzelfde als degene die de configuratie schreef.

- [ ] **Step 3: Draai de tests en controleer dat ze falen**

Run: `pnpm vitest run apps/demo/server`
Expected: FAIL, de routes bestaan niet en `createApp` accepteert `db` niet.

- [ ] **Step 4: Voeg de weigering en de routes toe**

In `apps/demo/server/src/app.ts`:

Voeg aan `Options` toe:

```ts
  db: DatabaseSync;
```

met de bijbehorende imports:

```ts
import type { DatabaseSync } from "node:sqlite";
import { isAdmin } from "@openplein/tenant";
import { meldAan, vindOpEmail, alleLeden, alsCsv } from "./leden";
```

Voeg bovenin `createApp`, vóór de routes, toe:

```ts
  // In demomodus staat de inlogcode op het scherm, dus is identiteit
  // betekenisloos. Met beheerders erbij zou iedere bezoeker het ledenregister
  // kunnen lezen. Die combinatie weigeren we.
  if (opts.demoShowCode && opts.tenantConfig.admins?.length) {
    throw new Error(
      "Demomodus en beheerders kunnen niet samen: in demomodus kan iedereen elk e-mailadres zijn.",
    );
  }
```

Voeg naast het bestaande `verifyToken` een variant toe die het adres teruggeeft. Hergebruik de bestaande controlelogica in plaats van hem te kopiëren; als dat betekent dat `verifyToken` intern deze nieuwe functie gaat gebruiken, is dat de nette oplossing:

```ts
  const emailUitToken = (token: string | undefined): string | null => {
    if (!verifyToken(token)) return null;
    const payload = token!.split(".")[0];
    const decoded = Buffer.from(payload, "base64url").toString();
    return decoded.slice(0, decoded.lastIndexOf("|"));
  };
```

Voeg daarna de vier routes toe. Haal het adres uit de `Authorization`-header op dezelfde manier als de bestaande betaalmiddleware dat doet. Geef 401 zonder geldig token, 403 als een niet-beheerder de lijst opvraagt, 201 bij een geslaagde aanmelding en 409 als het adres al lid is.

- [ ] **Step 5: Draai de tests en controleer dat ze slagen**

Run: `pnpm vitest run apps/demo/server`
Expected: PASS.

- [ ] **Step 6: Open de database bij het opstarten**

In `apps/demo/server/src/index.ts`, voeg de import toe en geef de verbinding mee aan `createApp`:

```ts
import { openDb } from "./db";
```

```ts
  db: openDb(process.env.DB_PATH ?? "./plein.db"),
```

Net als bij de tenantconfiguratie is het pad relatief aan de werkmap, en `pnpm --filter @openplein/demo-server start` draait in `apps/demo/server`.

- [ ] **Step 7: Werk de deploydocumentatie bij**

Voeg in `deploy.md` bij de omgevingsvariabelen een regel toe over `DB_PATH`, en schrijf erbij dat dit bestand de ledenadministratie bevat en dus in de back-up hoort. Voeg aan `docker-compose.yml` een volume toe zodat de database een herstart van de container overleeft; zonder dat is elk lid weg bij de eerstvolgende deploy.

Dit is de belangrijkste regel van deze taak voor de eigenaar: een database in een container zonder volume is een database die je één keer gebruikt.

- [ ] **Step 8: Draai alles**

Run: `pnpm test && pnpm typecheck`
Expected: alles slaagt.

Run: `pnpm --filter @openplein/e2e test`
Expected: 3/3 groen.

- [ ] **Step 9: Commit**

```bash
git add apps/demo/server deploy.md docker-compose.yml
git commit -m "feat(server): ledenroutes met beheerderspoort, weigert demomodus met beheerders"
```

---

### Task 5: Lid worden in de shell

**Files:**
- Create: `packages/runtime/src/components/LidWordenView.tsx`
- Create: `packages/runtime/src/components/LidWordenView.test.tsx`
- Modify: `packages/runtime/src/App.tsx`
- Modify: `packages/runtime/src/i18n/nl.json`
- Modify: `packages/runtime/src/i18n/en.json`

**Interfaces:**
- Consumes: `POST /api/leden` en `GET /api/leden/mij` (Task 4).
- Produces: `LidWordenView`, een formulier dat om een naam vraagt en het lidmaatschap aanmaakt.

- [ ] **Step 1: Schrijf de falende test**

`packages/runtime/src/components/LidWordenView.test.tsx`, met dezelfde opzet als `WelcomeView.test.tsx` (jsdom, `IS_REACT_ACT_ENVIRONMENT`, `createRoot` en `act`). Test:

- het formulier toont een naamveld en een knop
- een lege naam levert geen aanroep op
- bij een geslaagde aanroep wordt de meegegeven terugmeldfunctie aangeroepen met het nieuwe lid
- bij een mislukte aanroep verschijnt een foutmelding en blijft het formulier staan

Gebruik `vi.stubGlobal("fetch", ...)` zoals `tenant.test.ts` dat doet.

- [ ] **Step 2: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run packages/runtime/src/components/LidWordenView.test.tsx`
Expected: FAIL, het bestand bestaat niet.

- [ ] **Step 3: Schrijf het component**

Volg de opzet van `LoginView.tsx`: een formulier met een label, een invoerveld, een knop met een bezig-toestand, en een foutregel. Stuur `POST /api/leden` met het token uit de sessie in de `Authorization`-header, net zoals de betaalprovider dat doet.

Nieuwe vertaalsleutels in beide bestanden, met dezelfde sleutelverzameling:

- `lid.title`: nl `"Word lid"`, en `"Become a member"`
- `lid.naam`: nl `"Je naam"`, en `"Your name"`
- `lid.verstuur`: nl `"Aanmelden"`, en `"Sign up"`
- `lid.busy`: nl `"Bezig…"`, en `"Working…"`
- `lid.error`: nl `"Aanmelden mislukt"`, en `"Sign-up failed"`

- [ ] **Step 4: Toon het in de shell**

In `App.tsx`: haal na het inloggen `GET /api/leden/mij` op. Is het antwoord 404, dan is de bezoeker nog geen lid en toont de shell `LidWordenView` boven het home-scherm. Is het 200, dan gebeurt er niets bijzonders.

Een mislukte aanroep mag het home-scherm niet blokkeren: vang hem af zoals de tenantfetch dat doet, met een `console.warn`, en behandel de bezoeker dan als "nog geen lid".

- [ ] **Step 5: Draai alles en controleer het handmatig**

Run: `pnpm test && pnpm typecheck && pnpm --filter @openplein/e2e test`
Expected: alles slaagt.

Start daarna de server en de runtime, log in en meld je aan als lid. Controleer dat je na een herstart van de server nog steeds lid bent; dat is de eigenlijke proef op de opslag. Rapporteer wat je ziet.

- [ ] **Step 6: Commit**

```bash
git add packages/runtime
git commit -m "feat(runtime): lid worden met naam, status opgehaald bij de server"
```

---

### Task 6: Het ledenregister voor het bestuur

**Files:**
- Create: `packages/runtime/src/components/LedenView.tsx`
- Create: `packages/runtime/src/components/LedenView.test.tsx`
- Modify: `packages/runtime/src/App.tsx`
- Modify: `packages/runtime/src/components/HomeScreen.tsx`
- Modify: `packages/runtime/src/i18n/nl.json`
- Modify: `packages/runtime/src/i18n/en.json`
- Modify: `packages/runtime/src/styles.css`

**Interfaces:**
- Consumes: `GET /api/leden` en `GET /api/leden.csv` (Task 4).
- Produces: `LedenView`, een tabel met de leden en een downloadknop voor de CSV.

- [ ] **Step 1: Schrijf de falende test**

`packages/runtime/src/components/LedenView.test.tsx`, dezelfde opzet als de andere componenttests. Test:

- de tabel toont naam, adres en status van elk lid
- bij een lege lijst staat er een regel dat er nog geen leden zijn
- bij een 403 verschijnt een melding dat je hier geen toegang toe hebt, en geen lege tabel

Die laatste is de belangrijkste: een beheerderspoort die bij weigering een leeg scherm toont in plaats van een weigering, laat een bestuurslid denken dat de vereniging geen leden heeft.

- [ ] **Step 2: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run packages/runtime/src/components/LedenView.test.tsx`
Expected: FAIL, het bestand bestaat niet.

- [ ] **Step 3: Schrijf het component**

Een eenvoudige tabel. De downloadknop wijst naar `/api/leden.csv`; omdat die route een token in de header vereist, moet de knop het bestand ophalen met `fetch` en het resultaat als download aanbieden via een blob-URL, niet als een gewone link.

Nieuwe vertaalsleutels in beide bestanden:

- `leden.title`: nl `"Leden"`, en `"Members"`
- `leden.naam`: nl `"Naam"`, en `"Name"`
- `leden.email`: nl `"E-mailadres"`, en `"Email address"`
- `leden.status`: nl `"Status"`, en `"Status"`
- `leden.leeg`: nl `"Er zijn nog geen leden."`, en `"There are no members yet."`
- `leden.geenToegang`: nl `"Je hebt geen toegang tot het ledenregister."`, en `"You do not have access to the member register."`
- `leden.download`: nl `"Download als csv"`, en `"Download as csv"`

- [ ] **Step 4: Ontsluit het vanaf het home-scherm**

`HomeScreen` krijgt een optionele knop die naar het ledenregister leidt. Toon die alleen als de shell weet dat de ingelogde bezoeker beheerder is.

De shell weet dat niet uit zichzelf: de tenantconfiguratie is publiek en mag de lijst met beheerdersadressen **niet** bevatten in wat `GET /api/tenant` teruggeeft. Controleer dat. Blijkt `admins` daar wel in te staan, dan is dat een bevinding die je meldt en oplost: het adres van een bestuurslid hoort geen publieke informatie te zijn.

Gebruik in plaats daarvan de uitkomst van de bestaande aanroep: laat `GET /api/leden/mij` een veld `beheerder: boolean` teruggeven, of voeg een aparte route toe die alleen zegt of de ingelogde bezoeker beheerder is. Kies er één, doe het consequent, en schrijf op waarom.

- [ ] **Step 5: Draai alles en controleer het handmatig**

Run: `pnpm test && pnpm typecheck && pnpm --filter @openplein/e2e test`
Expected: alles slaagt.

Start daarna de server met een tenantconfiguratie waarin jouw testadres als beheerder staat, log in met dat adres, en controleer dat je het ledenregister ziet. Log daarna in met een ander adres en controleer dat je het niet ziet en een weigering krijgt in plaats van een lege lijst. Rapporteer beide uitkomsten.

- [ ] **Step 6: Commit**

```bash
git add packages/runtime
git commit -m "feat(runtime): ledenregister voor beheerders, met csv-download"
```

---

## Na dit plan

- Contributie via Mollie: klant, incassomachtiging, abonnement, idempotente webhook en een verplicht webhookgeheim. De kolommen `mollie_klant_id` en `mollie_abonnement_id` staan al klaar.
- De datumprikker als eerste mini-app van derden.
- `HANDVEST.md` in de repo en op de site.

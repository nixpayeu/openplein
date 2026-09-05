# Fundament: tenantlaag en bridge-privacy, implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OpenPlein per tenant configureerbaar maken en de `identity`-permissie zo veranderen dat een mini-app een pseudoniem krijgt in plaats van het e-mailadres van het lid.

**Architecture:** Een nieuw pakket `@openplein/tenant` bevat het contract voor tenantconfiguratie (type, JSON-schema, validatie), precies zoals `@openplein/sdk` dat voor manifests doet. De server leest bij het opstarten één configuratiebestand, weigert te starten als het ontbreekt of niet bij de hostnaam hoort, en serveert het op `GET /api/tenant`. De runtime haalt het daar op en past naam, kleuren en catalogus toe. Los daarvan wordt het bridge-contract voor identiteit gesplitst: `identity.request` geeft een per-mini-app verschillend pseudoniem, en het e-mailadres komt achter een nieuwe permissie `email`.

**Tech Stack:** TypeScript, pnpm-workspace, vitest (jsdom voor runtime-tests), Hono op Node 22, React 18 met Vite, Playwright voor e2e, ajv voor schemavalidatie.

## Global Constraints

- Node `>=22.13`, pnpm `11.5.0` (`package.json`). Niet wijzigen.
- Geen nieuwe externe afhankelijkheden buiten `ajv`, dat al in de workspace zit via `@openplein/sdk`.
- Nederlandstalige code-commentaren en foutmeldingen, in lijn met de bestaande code.
- Functies onder de 10 regels waar dat kan.
- `packages/runtime` en `packages/bridge` zijn AGPL-3.0, `packages/sdk` is MIT. Het nieuwe `packages/tenant` wordt AGPL-3.0, want het is onderdeel van de shell en niet van het bouwerscontract.
- Testen draaien vanuit de repo-root met `pnpm test` (vitest workspace: `packages/*` en `apps/demo/server`).
- Typecheck draait met `pnpm typecheck`. Nieuwe pakketten moeten daar aan toegevoegd worden.
- Runtime-tests die de DOM of localStorage nodig hebben, beginnen met `// @vitest-environment jsdom`.

## Wat dit plan bewust niet doet

Ledenregister, contributie-inning, de datumprikker-mini-app en `HANDVEST.md` staan in de spec maar niet in dit plan. Die hangen af van het gesprek met Tim (zie "Open punten" in de spec) en krijgen een eigen plan. Dit plan levert de twee onderdelen die daar niet van afhangen en die alles daarna dragen.

---

### Task 1: `packages/tenant`, het contract voor tenantconfiguratie

**Files:**
- Create: `packages/tenant/package.json`
- Create: `packages/tenant/tsconfig.json`
- Create: `packages/tenant/src/schema.json`
- Create: `packages/tenant/src/tenant.ts`
- Create: `packages/tenant/src/index.ts`
- Test: `packages/tenant/src/tenant.test.ts`
- Modify: `package.json` (script `typecheck`, regel 9)

**Interfaces:**
- Consumes: niets uit eerdere taken.
- Produces: `TenantConfig` (interface met velden `hostname: string`, `name: string`, `logoUrl?: string`, `colors?: Partial<Record<TenantColor, string>>`, `catalog: unknown[]`), `TENANT_COLORS` (readonly tuple), `TenantColor` (union-type) en `validateTenantConfig(data: unknown): { valid: true; config: TenantConfig } | { valid: false; errors: string[] }`.

`catalog` is bewust `unknown[]` en niet `PleinManifest[]`: de manifests worden al gevalideerd door `validateManifest` uit `@openplein/sdk`. Het tenantschema controleert alleen dat het een lijst objecten is, zodat het manifestschema op één plek staat.

- [ ] **Step 1: Maak het pakket aan met zijn configuratie**

`packages/tenant/package.json`:

```json
{
  "name": "@openplein/tenant",
  "version": "0.1.0",
  "type": "module",
  "license": "AGPL-3.0-only",
  "main": "src/index.ts",
  "files": ["src"],
  "dependencies": { "ajv": "^8.16.0" }
}
```

`packages/tenant/tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

`packages/tenant/src/index.ts`:

```ts
export * from "./tenant";
```

- [ ] **Step 2: Schrijf de falende test**

`packages/tenant/src/tenant.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateTenantConfig } from "./tenant";

const geldig = {
  hostname: "plein.digitaleautonomie.org",
  name: "Digitale Autonomie",
  colors: { mint: "#06D6A0" },
  catalog: [],
};

describe("validateTenantConfig", () => {
  it("accepteert een geldige configuratie", () => {
    const r = validateTenantConfig(geldig);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.config.name).toBe("Digitale Autonomie");
  });

  it("accepteert een configuratie zonder kleuren en zonder logo", () => {
    const r = validateTenantConfig({ hostname: "localhost", name: "Plein", catalog: [] });
    expect(r.valid).toBe(true);
  });

  it("weigert een ontbrekende naam", () => {
    const { name, ...rest } = geldig;
    const r = validateTenantConfig(rest);
    expect(r.valid).toBe(false);
  });

  it("weigert een onbekend veld", () => {
    const r = validateTenantConfig({ ...geldig, tracking: "ga4" });
    expect(r.valid).toBe(false);
  });

  it("weigert een kleur die geen hexwaarde is", () => {
    const r = validateTenantConfig({ ...geldig, colors: { mint: "groen" } });
    expect(r.valid).toBe(false);
  });

  it("weigert een onbekende kleurnaam", () => {
    const r = validateTenantConfig({ ...geldig, colors: { paars: "#800080" } });
    expect(r.valid).toBe(false);
  });

  it("geeft leesbare fouten terug", () => {
    const r = validateTenantConfig({ hostname: "x" });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run packages/tenant`
Expected: FAIL, met een foutmelding dat `./tenant` niet gevonden kan worden.

- [ ] **Step 4: Schrijf het schema**

`packages/tenant/src/schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["hostname", "name", "catalog"],
  "additionalProperties": false,
  "properties": {
    "hostname": { "type": "string", "minLength": 1 },
    "name": { "type": "string", "minLength": 1 },
    "logoUrl": { "type": "string", "minLength": 1 },
    "colors": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "navy-1": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "navy-2": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "steel": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "mint": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "ijs": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "wit": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" }
      }
    },
    "catalog": { "type": "array", "items": { "type": "object" } }
  }
}
```

- [ ] **Step 5: Schrijf de implementatie**

`packages/tenant/src/tenant.ts`:

```ts
import Ajv from "ajv/dist/2020";
import schema from "./schema.json" with { type: "json" };

export const TENANT_COLORS = ["navy-1", "navy-2", "steel", "mint", "ijs", "wit"] as const;
export type TenantColor = (typeof TENANT_COLORS)[number];

export interface TenantConfig {
  hostname: string;
  name: string;
  logoUrl?: string;
  colors?: Partial<Record<TenantColor, string>>;
  catalog: unknown[];
}

const ajv = new Ajv({ allErrors: true });
const check = ajv.compile(schema);

export function validateTenantConfig(
  data: unknown,
): { valid: true; config: TenantConfig } | { valid: false; errors: string[] } {
  if (check(data)) return { valid: true, config: data as unknown as TenantConfig };
  return {
    valid: false,
    errors: (check.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message}`),
  };
}
```

- [ ] **Step 6: Installeer en draai de test**

Run: `pnpm install && pnpm vitest run packages/tenant`
Expected: PASS, 7 tests.

- [ ] **Step 7: Voeg het pakket toe aan de typecheck**

In `package.json`, vervang de regel `"typecheck"` door:

```json
    "typecheck": "pnpm --filter @openplein/sdk --filter @openplein/tenant --filter @openplein/bridge --filter @openplein/runtime --filter @openplein/demo-server exec tsc --noEmit -p ."
```

Run: `pnpm typecheck`
Expected: geen uitvoer, exitcode 0.

- [ ] **Step 8: Commit**

```bash
git add packages/tenant package.json pnpm-lock.yaml
git commit -m "feat(tenant): contract en validatie voor tenantconfiguratie"
```

---

### Task 2: De server laadt en serveert de tenantconfiguratie

**Files:**
- Create: `apps/demo/server/src/tenant.ts`
- Create: `apps/demo/server/src/tenant.test.ts`
- Create: `apps/demo/server/tenant.json`
- Modify: `apps/demo/server/src/app.ts:5-25` (interface `Options`) en het toevoegen van een route
- Modify: `apps/demo/server/src/index.ts`
- Modify: `apps/demo/server/package.json` (afhankelijkheid toevoegen)
- Modify: `apps/demo/server/src/app.test.ts`
- Test: bovenstaande testbestanden

**Interfaces:**
- Consumes: `validateTenantConfig` en `TenantConfig` uit `@openplein/tenant` (Task 1).
- Produces: `loadTenantConfig(path: string, expectedHostname: string): TenantConfig` uit `apps/demo/server/src/tenant.ts`, en een HTTP-route `GET /api/tenant` die de configuratie als JSON teruggeeft. `createApp` krijgt een verplicht veld `tenantConfig: TenantConfig` in zijn `Options`.

- [ ] **Step 1: Voeg de afhankelijkheid toe**

In `apps/demo/server/package.json`, voeg aan `dependencies` toe:

```json
    "@openplein/tenant": "workspace:*"
```

Run: `pnpm install`
Expected: installatie slaagt, `@openplein/tenant` is gelinkt.

- [ ] **Step 2: Schrijf de falende test voor het laden**

`apps/demo/server/src/tenant.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadTenantConfig } from "./tenant";

const dir = mkdtempSync(join(tmpdir(), "plein-tenant-"));

function schrijf(naam: string, inhoud: unknown): string {
  const pad = join(dir, naam);
  writeFileSync(pad, JSON.stringify(inhoud), "utf8");
  return pad;
}

describe("loadTenantConfig", () => {
  it("laadt een geldige configuratie", () => {
    const pad = schrijf("goed.json", { hostname: "localhost", name: "Plein", catalog: [] });
    expect(loadTenantConfig(pad, "localhost").name).toBe("Plein");
  });

  it("stopt bij een ontbrekend bestand", () => {
    expect(() => loadTenantConfig(join(dir, "bestaat-niet.json"), "localhost")).toThrow();
  });

  it("stopt bij een ongeldige configuratie en noemt het pad", () => {
    const pad = schrijf("fout.json", { hostname: "localhost" });
    expect(() => loadTenantConfig(pad, "localhost")).toThrow(/fout\.json/);
  });

  it("stopt als de hostnaam niet overeenkomt", () => {
    const pad = schrijf("ander.json", { hostname: "plein.example.org", name: "X", catalog: [] });
    expect(() => loadTenantConfig(pad, "localhost")).toThrow(/plein\.example\.org/);
  });
});
```

- [ ] **Step 3: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run apps/demo/server/src/tenant.test.ts`
Expected: FAIL, `./tenant` kan niet gevonden worden.

- [ ] **Step 4: Schrijf de implementatie**

`apps/demo/server/src/tenant.ts`:

```ts
import { readFileSync } from "node:fs";
import { validateTenantConfig, type TenantConfig } from "@openplein/tenant";

/**
 * Laadt de tenantconfiguratie van deze installatie. Er draait één installatie
 * per tenant, dus de hostnaam in het bestand is een controle en geen sleutel:
 * hij vangt de fout waarbij de verkeerde configuratie aan de verkeerde
 * container hangt. Gooit bij elke afwijking, zodat de server niet half
 * geconfigureerd opstart.
 */
export function loadTenantConfig(path: string, expectedHostname: string): TenantConfig {
  const r = validateTenantConfig(JSON.parse(readFileSync(path, "utf8")));
  if (!r.valid) throw new Error(`Ongeldige tenantconfiguratie in ${path}: ${r.errors.join("; ")}`);
  if (r.config.hostname !== expectedHostname) {
    throw new Error(
      `Tenantconfiguratie in ${path} is van ${r.config.hostname}, deze installatie draait op ${expectedHostname}`,
    );
  }
  return r.config;
}
```

- [ ] **Step 5: Draai de test en controleer dat hij slaagt**

Run: `pnpm vitest run apps/demo/server/src/tenant.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Schrijf de falende test voor de route**

Voeg toe aan `apps/demo/server/src/app.test.ts`. Zoek eerst op hoe bestaande tests `createApp` aanroepen en voeg aan elke bestaande aanroep het nieuwe verplichte veld toe:

```ts
tenantConfig: { hostname: "localhost", name: "Plein", catalog: [] },
```

Voeg daarna dit testblok toe:

```ts
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
```

- [ ] **Step 7: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run apps/demo/server`
Expected: FAIL, 404 op `/api/tenant` en typefouten over `tenantConfig`.

- [ ] **Step 8: Voeg het veld en de route toe**

In `apps/demo/server/src/app.ts`, voeg bovenaan de import toe:

```ts
import type { TenantConfig } from "@openplein/tenant";
```

Voeg aan de interface `Options` (regel 5) als eerste veld toe:

```ts
  tenantConfig: TenantConfig;
```

Voeg direct na `const MAX_MOCK_PAYMENTS = 1000;` (regel 37) toe:

```ts
  // Publiek: de shell heeft naam, kleuren en catalogus nodig vóór de inlog.
  app.get("/api/tenant", (c) => c.json(opts.tenantConfig));
```

- [ ] **Step 9: Draai de tests**

Run: `pnpm vitest run apps/demo/server`
Expected: PASS, alle bestaande tests plus de 2 nieuwe.

- [ ] **Step 10: Laat de server hard stoppen zonder configuratie**

In `apps/demo/server/src/index.ts`, voeg de import toe:

```ts
import { loadTenantConfig } from "./tenant";
```

en voeg aan het optie-object dat aan `createApp` wordt meegegeven toe:

```ts
  tenantConfig: loadTenantConfig(
    process.env.TENANT_CONFIG ?? "./tenant.json",
    process.env.TENANT_HOSTNAME ?? "localhost",
  ),
```

Er is geen extra foutafhandeling nodig: `loadTenantConfig` gooit, en een niet-afgevangen fout tijdens het opstarten stopt het proces met exitcode 1. Dat is precies het gewenste gedrag uit de spec.

- [ ] **Step 11: Maak de standaardconfiguratie voor de demo**

`apps/demo/server/tenant.json`. Dit is de **ontwikkel- en e2e-configuratie**, dus de catalogus komt uit `packages/runtime/public/catalog.json` met de localhost-adressen, niet uit `catalog.prod.json`. De e2e-opzet draait de mini-apps op poort 5180 en 5181 (`e2e/playwright.config.ts`); met de productie-URL's zou die suite breken.

```json
{
  "hostname": "localhost",
  "name": "Plein",
  "catalog": []
}
```

Run: `cat packages/runtime/public/catalog.json`
Vervang daarna de lege `catalog`-lijst hierboven door precies die inhoud, ongewijzigd.

Let op: `loadTenantConfig` krijgt standaard het pad `./tenant.json`, relatief aan de werkmap. `pnpm --filter @openplein/demo-server start` draait in `apps/demo/server`, dus dat pad klopt. Dat is dezelfde aanname als de bestaande `serveStatic`-paden in `app.ts`.

- [ ] **Step 12: Controleer dat de server start**

Run: `pnpm --filter @openplein/demo-server start`
Expected: de server start op poort 5175. Stop hem daarna.

Run: `TENANT_CONFIG=./bestaat-niet.json pnpm --filter @openplein/demo-server start`
Expected: het proces stopt meteen met een foutmelding over het ontbrekende bestand.

- [ ] **Step 13: Commit**

```bash
git add apps/demo/server packages/tenant pnpm-lock.yaml
git commit -m "feat(server): tenantconfiguratie laden bij opstarten en serveren op /api/tenant"
```

---

### Task 3: De runtime gebruikt de tenantconfiguratie

**Files:**
- Modify: `packages/runtime/src/catalog.ts` (volledig herschreven)
- Create: `packages/runtime/src/tenant.test.ts`
- Modify: `packages/runtime/src/App.tsx:19-35` (state en het laden)
- Modify: `packages/runtime/package.json` (afhankelijkheid toevoegen)
- Modify: `Dockerfile:9`
- Modify: `deploy.md`

**Interfaces:**
- Consumes: `TenantConfig` en `validateTenantConfig` uit `@openplein/tenant` (Task 1), en de route `GET /api/tenant` (Task 2).
- Produces: `loadTenant(): Promise<{ tenant: TenantConfig; catalog: PleinManifest[] }>` uit `packages/runtime/src/catalog.ts`, en `applyTenantBranding(tenant: TenantConfig): void` uit hetzelfde bestand.

- [ ] **Step 1: Voeg de afhankelijkheid toe**

In `packages/runtime/package.json`, voeg aan `dependencies` toe:

```json
    "@openplein/tenant": "workspace:*"
```

Run: `pnpm install`
Expected: installatie slaagt.

- [ ] **Step 2: Schrijf de falende test**

`packages/runtime/src/tenant.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadTenant, applyTenantBranding } from "./catalog";

const manifest = {
  id: "nl.example.lijstje",
  name: "Lijstje",
  version: "0.1.0",
  icon: "/icon.svg",
  entry: "https://example.org/lijstje/",
  provider: { name: "Example", url: "https://example.org" },
  permissions: ["storage"],
};

function antwoord(body: unknown) {
  return { json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  document.documentElement.style.cssText = "";
});
afterEach(() => vi.unstubAllGlobals());

describe("loadTenant", () => {
  it("geeft de configuratie en de geldige manifests terug", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve(antwoord({ hostname: "localhost", name: "Plein", catalog: [manifest] })),
    ));
    const { tenant, catalog } = await loadTenant();
    expect(tenant.name).toBe("Plein");
    expect(catalog).toHaveLength(1);
  });

  it("slaat een ongeldig manifest over zonder te stoppen", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve(antwoord({ hostname: "localhost", name: "Plein", catalog: [manifest, { id: "kapot" }] })),
    ));
    const { catalog } = await loadTenant();
    expect(catalog).toHaveLength(1);
  });

  it("gooit bij een ongeldige tenantconfiguratie", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(antwoord({ hostname: "localhost" }))));
    await expect(loadTenant()).rejects.toThrow();
  });
});

describe("applyTenantBranding", () => {
  it("zet de titel en de opgegeven kleuren", () => {
    applyTenantBranding({
      hostname: "localhost",
      name: "Digitale Autonomie",
      colors: { mint: "#123456" },
      catalog: [],
    });
    expect(document.title).toBe("Digitale Autonomie");
    expect(document.documentElement.style.getPropertyValue("--mint")).toBe("#123456");
  });

  it("laat kleuren die niet opgegeven zijn ongemoeid", () => {
    applyTenantBranding({ hostname: "localhost", name: "Plein", catalog: [] });
    expect(document.documentElement.style.getPropertyValue("--mint")).toBe("");
  });
});
```

- [ ] **Step 3: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run packages/runtime/src/tenant.test.ts`
Expected: FAIL, `loadTenant` en `applyTenantBranding` bestaan niet.

- [ ] **Step 4: Herschrijf `catalog.ts`**

`packages/runtime/src/catalog.ts`, volledige nieuwe inhoud:

```ts
import { validateManifest, type PleinManifest } from "@openplein/sdk";
import { validateTenantConfig, type TenantConfig } from "@openplein/tenant";

export async function loadTenant(): Promise<{ tenant: TenantConfig; catalog: PleinManifest[] }> {
  const res = await fetch("/api/tenant");
  const r = validateTenantConfig(await res.json());
  if (!r.valid) throw new Error(`Ongeldige tenantconfiguratie: ${r.errors.join("; ")}`);
  return { tenant: r.config, catalog: geldigeManifests(r.config.catalog) };
}

function geldigeManifests(items: unknown[]): PleinManifest[] {
  const out: PleinManifest[] = [];
  for (const item of items) {
    const r = validateManifest(item);
    if (r.valid) out.push(r.manifest);
    else console.warn("Ongeldig manifest overgeslagen:", r.errors);
  }
  return out;
}

export function applyTenantBranding(tenant: TenantConfig): void {
  document.title = tenant.name;
  for (const [naam, waarde] of Object.entries(tenant.colors ?? {})) {
    document.documentElement.style.setProperty(`--${naam}`, waarde);
  }
}
```

- [ ] **Step 5: Draai de test en controleer dat hij slaagt**

Run: `pnpm vitest run packages/runtime/src/tenant.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Gebruik het in de shell**

In `packages/runtime/src/App.tsx`, vervang de import op regel 3:

```ts
import { loadTenant, applyTenantBranding } from "./catalog";
```

Voeg naast de bestaande `catalog`-state (regel 19) toe:

```ts
  const [tenantName, setTenantName] = useState("Plein");
```

Vervang het `useEffect` dat de catalogus laadt (regel 33 tot en met 35) door:

```ts
  useEffect(() => {
    void loadTenant()
      .then(({ tenant, catalog }) => {
        applyTenantBranding(tenant);
        setTenantName(tenant.name);
        setCatalog(catalog);
      })
      .catch((e) => console.warn("Tenant laden mislukt:", e));
  }, []);
```

Zoek in hetzelfde bestand de plek waar `HomeScreen` gerenderd wordt en voeg de prop toe:

```tsx
        <HomeScreen catalog={catalog} onOpen={setActive} title={tenantName} />
```

Neem daarbij de bestaande props over zoals ze er staan; alleen `title` is nieuw.

In `packages/runtime/src/components/HomeScreen.tsx`, vervang de signatuur (regel 4 tot en met 6) en de kop:

```tsx
export function HomeScreen(props: {
  catalog: PleinManifest[]; onOpen: (app: PleinManifest) => void; title: string;
}) {
```

en vervang `<h1>{t("home.title")}</h1>` door:

```tsx
      <h1>{props.title}</h1>
```

De vertaalsleutel `home.title` blijft in `nl.json` en `en.json` staan als terugvalwaarde voor `tenantName` in `App.tsx`; verwijder hem niet.

- [ ] **Step 7: Draai alle tests en de typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: alles slaagt.

- [ ] **Step 8: Controleer het handmatig**

Run in twee terminals: `pnpm --filter @openplein/demo-server start` en `pnpm --filter @openplein/runtime dev`
Open `http://localhost:5173`.
Expected: de mini-apps uit `apps/demo/server/tenant.json` staan op het home-scherm en het tabblad heet "Plein".

Wijzig daarna tijdelijk in `apps/demo/server/tenant.json` de `name` naar `"Digitale Autonomie"` en voeg `"colors": { "mint": "#C2410C" }` toe. Herstart de server en ververs de pagina.
Expected: de titel en de accentkleur veranderen. Draai de wijziging daarna terug.

- [ ] **Step 9: Werk de build en de deploy-documentatie bij**

In `Dockerfile`, vervang regel 9:

```
 && cp packages/runtime/catalog.prod.json packages/runtime/dist/catalog.json
```

door:

```
 && cp deploy/tenant.saig.json apps/demo/server/tenant.json
```

Voeg in `Dockerfile` bij de tweede stage, naast `ENV SERVE_STATIC=1`, toe:

```
ENV TENANT_HOSTNAME=plein.sovereignaigrid.nl
```

Zonder die regel start de container niet: `deploy/tenant.saig.json` heeft `hostname` `plein.sovereignaigrid.nl` en de standaardwaarde van `TENANT_HOSTNAME` is `localhost`, dus de hostnaamcontrole slaat aan. Dat is precies het bedoelde gedrag, maar het moet in het image goed staan.

Verplaats `packages/runtime/catalog.prod.json` naar `deploy/tenant.saig.json` en wikkel de inhoud in het tenantformaat:

```bash
mkdir -p deploy
git mv packages/runtime/catalog.prod.json deploy/tenant.saig.json
```

Bewerk `deploy/tenant.saig.json` zodat het de vorm `{ "hostname": "plein.sovereignaigrid.nl", "name": "Plein", "catalog": [ ... ] }` heeft, met de oorspronkelijke lijst als `catalog`.

Verwijder `packages/runtime/public/catalog.json`, die wordt niet meer opgehaald:

```bash
git rm packages/runtime/public/catalog.json
```

Voeg in `deploy.md` bij de omgevingsvariabelen twee regels toe:

```
- `TENANT_CONFIG` (standaard `./tenant.json`): pad naar de tenantconfiguratie.
- `TENANT_HOSTNAME` (standaard `localhost`): de hostnaam waarop deze installatie draait. Komt hij niet overeen met de `hostname` in de configuratie, dan start de server niet.
```

Run: `docker build -t openplein-test .`
Expected: de build slaagt.

- [ ] **Step 10: Commit**

```bash
git add packages/runtime deploy Dockerfile deploy.md pnpm-lock.yaml
git commit -m "feat(runtime): naam, kleuren en catalogus uit de tenantconfiguratie"
```

---

### Task 4: `email` als aparte permissie in de sdk

**Files:**
- Modify: `packages/sdk/src/manifest.ts:5`
- Modify: `packages/sdk/src/schema.json` (het `enum` bij `permissions`)
- Modify: `packages/sdk/src/manifest.test.ts`

**Interfaces:**
- Consumes: niets uit eerdere taken.
- Produces: `PERMISSIONS` bevat voortaan `"email"`, dus `Permission` is de union `"payments" | "identity" | "storage" | "notifications" | "email"`. Task 5 en 6 leunen hierop.

- [ ] **Step 1: Schrijf de falende test**

Voeg toe aan `packages/sdk/src/manifest.test.ts`:

```ts
  it("accepteert de email-permissie", () => {
    const r = validateManifest({ ...valid, permissions: ["identity", "email"] });
    expect(r.valid).toBe(true);
  });

  it("weigert een onbekende permissie", () => {
    const r = validateManifest({ ...valid, permissions: ["telepathie"] });
    expect(r.valid).toBe(false);
  });
```

- [ ] **Step 2: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run packages/sdk`
Expected: FAIL op "accepteert de email-permissie", omdat `email` niet in het enum staat.

- [ ] **Step 3: Voeg de permissie toe**

In `packages/sdk/src/manifest.ts`, vervang regel 5:

```ts
export const PERMISSIONS = ["payments", "identity", "storage", "notifications", "email"] as const;
```

In `packages/sdk/src/schema.json`, vervang de regel met het enum door:

```json
      "items": { "enum": ["payments", "identity", "storage", "notifications", "email"] }
```

- [ ] **Step 4: Draai de test en controleer dat hij slaagt**

Run: `pnpm vitest run packages/sdk`
Expected: PASS.

- [ ] **Step 5: Documenteer de permissie**

In `docs/miniapp-spec.md`, voeg bij de tabel met permissies een regel toe:

```
| `email` | Het e-mailadres van het ingelogde lid. Apart van `identity`, met een eigen toestemmingsdialoog: een mini-app met alleen `identity` krijgt een pseudoniem en komt het adres nooit te weten. |
```

- [ ] **Step 6: Commit**

```bash
git add packages/sdk docs/miniapp-spec.md
git commit -m "feat(sdk): email als aparte permissie naast identity"
```

---

### Task 5: De bridge scheidt pseudoniem van e-mailadres

**Files:**
- Modify: `packages/bridge/src/protocol.ts:18-23`
- Modify: `packages/bridge/src/host.ts:8-13` en `:76-78`
- Modify: `packages/bridge/src/client.ts:9-14` en `:55-61`
- Modify: `packages/bridge/src/host.test.ts`
- Modify: `packages/bridge/src/protocol.test.ts`

**Interfaces:**
- Consumes: `Permission` uit `@openplein/sdk` inclusief `"email"` (Task 4).
- Produces:
  - `Providers.identityRequest(appId: string): Promise<{ subject: string; displayName: string }>`
  - `Providers.identityEmail(appId: string): Promise<{ email: string }>`
  - `PleinClient.identity.request(): Promise<{ subject: string; displayName: string }>`
  - `PleinClient.identity.email(): Promise<{ email: string }>`
  - De methode `identity.email` vereist de permissie `email`; `identity.request` blijft op `identity`.

Dit is een breaking change op `@openplein/bridge`. Task 6 en 7 volgen erop.

- [ ] **Step 1: Schrijf de falende test voor de methodetoewijzing**

Voeg toe aan `packages/bridge/src/protocol.test.ts`:

```ts
  it("koppelt identity.email aan de email-permissie", () => {
    expect(methodPermission("identity.email")).toBe("email");
  });

  it("laat identity.request op identity staan", () => {
    expect(methodPermission("identity.request")).toBe("identity");
  });
```

Controleer dat `methodPermission` bovenin dit bestand geïmporteerd is; zo niet, voeg hem toe aan de bestaande import uit `./protocol`.

- [ ] **Step 2: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run packages/bridge`
Expected: FAIL, `methodPermission("identity.email")` geeft `null`.

- [ ] **Step 3: Breid de methodetoewijzing uit**

In `packages/bridge/src/protocol.ts`, vervang het blok op regel 18 tot en met 23:

```ts
const METHOD_PERMISSIONS: Record<string, Permission> = {
  pay: "payments",
  "identity.request": "identity",
  "identity.email": "email",
  "storage.get": "storage",
  "storage.set": "storage",
};
```

- [ ] **Step 4: Draai de test en controleer dat hij slaagt**

Run: `pnpm vitest run packages/bridge/src/protocol.test.ts`
Expected: PASS.

- [ ] **Step 5: Schrijf de falende test voor de host**

In `packages/bridge/src/host.test.ts` staat een hulpfunctie `makeHost` (regel 13 tot en met 25) die het manifest met vaste permissies `["storage"]` gebruikt. Om permissies per test te kunnen variëren krijgt hij een derde parameter. Vervang de hele functie door:

```ts
function makeHost(
  gateAnswer: boolean,
  providers: Partial<Record<string, unknown>> = {},
  permissions: PleinManifest["permissions"] = ["storage"],
) {
  const sent: BridgeResponse[] = [];
  const source = { postMessage: (m: BridgeResponse) => sent.push(m) } as unknown as Window;
  const host = new PleinHost({
    manifest: { ...manifest, permissions }, source, gate: async () => gateAnswer,
    providers: {
      pay: vi.fn(), identityRequest: vi.fn(),
      identityEmail: vi.fn(async () => ({ email: "jan@example.org" })),
      storageGet: vi.fn(async () => "melk"), storageSet: vi.fn(async () => {}),
      ...providers,
    } as never,
  });
  host.start();
  return { sent, source };
}
```

Voeg daarna binnen `describe("PleinHost", ...)` deze twee tests toe:

```ts
  it("weigert identity.email zonder de email-permissie", async () => {
    const { sent, source } = makeHost(true, {}, ["identity"]);
    deliver(source, { plein: "0.1", id: "e", method: "identity.email" });
    await flush();
    expect(sent[0]).toMatchObject({ ok: false, error: { code: "PERMISSION_DENIED" } });
  });

  it("geeft het e-mailadres met de email-permissie", async () => {
    const { sent, source } = makeHost(true, {}, ["identity", "email"]);
    deliver(source, { plein: "0.1", id: "f", method: "identity.email" });
    await flush();
    expect(sent[0]).toEqual({
      plein: "0.1", id: "f", ok: true, result: { email: "jan@example.org" },
    });
  });
```

- [ ] **Step 6: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run packages/bridge/src/host.test.ts`
Expected: FAIL, `identity.email` geeft `UNKNOWN_METHOD` en TypeScript klaagt over `identityEmail`.

- [ ] **Step 7: Breid de host uit**

In `packages/bridge/src/host.ts`, vervang de interface `Providers` (regel 8 tot en met 13):

```ts
export interface Providers {
  pay(appId: string, params: unknown): Promise<unknown>;
  identityRequest(appId: string): Promise<{ subject: string; displayName: string }>;
  identityEmail(appId: string): Promise<{ email: string }>;
  storageGet(appId: string, key: string): Promise<string | null>;
  storageSet(appId: string, key: string, value: string): Promise<void>;
}
```

Voeg in de `switch` direct na het blok `case "identity.request":` (regel 76 tot en met 78) toe:

```ts
        case "identity.email":
          result = await providers.identityEmail(manifest.id);
          break;
```

- [ ] **Step 8: Draai de test en controleer dat hij slaagt**

Run: `pnpm vitest run packages/bridge`
Expected: PASS.

- [ ] **Step 9: Werk het clientcontract bij**

In `packages/bridge/src/client.ts`, vervang regel 11:

```ts
  identity: {
    request(): Promise<{ subject: string; displayName: string }>;
    email(): Promise<{ email: string }>;
  };
```

en vervang regel 57:

```ts
    identity: {
      request: () => call("identity.request") as Promise<{ subject: string; displayName: string }>,
      email: () => call("identity.email") as Promise<{ email: string }>,
    },
```

- [ ] **Step 10: Draai alles en commit**

Run: `pnpm test && pnpm typecheck`
Expected: `packages/runtime` faalt nu op de typecheck, omdat de identity-provider het oude contract heeft. Dat is verwacht en wordt in Task 6 opgelost. Alle bridge- en sdk-tests slagen.

```bash
git add packages/bridge
git commit -m "feat(bridge)!: identity.request geeft een pseudoniem, e-mailadres achter identity.email"
```

---

### Task 6: De runtime geeft een gesalt pseudoniem per mini-app

**Files:**
- Modify: `packages/runtime/src/providers/identity.ts` (volledig herschreven)
- Create: `packages/runtime/src/providers/identity.test.ts`
- Modify: het bestand waar `identityProvider` aan `PleinHost` wordt meegegeven (zoek met `grep -rn "identityRequest" packages/runtime/src`)

**Interfaces:**
- Consumes: `Providers` uit `@openplein/bridge` met `identityRequest` en `identityEmail` (Task 5).
- Produces: `identityProvider(getSession)` geeft een object met `request(appId): Promise<{ subject: string; displayName: string }>` en `email(appId): Promise<{ email: string }>`.

Het pseudoniem is `SHA-256(salt | appId | email)`, hex. De salt is één willekeurige waarde per browserinstallatie, bewaard in `localStorage` onder `plein.identity.salt`.

**Waarom een salt.** Zonder salt kan een mini-app die het e-mailadres van een lid vermoedt, het pseudoniem narekenen en zo bevestigen met wie hij te maken heeft. Met een salt die de mini-app niet kent, kan dat niet. De salt staat in dezelfde `localStorage` als de opslag van de mini-apps zelf, dus hij verdwijnt samen met hun gegevens. Dat is de bewuste grens: dit beschermt tegen correlatie tussen mini-apps, niet tegen een gebruiker die zijn browseropslag wist.

- [ ] **Step 1: Schrijf de falende test**

`packages/runtime/src/providers/identity.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { identityProvider } from "./identity";

// jsdom levert geen crypto.subtle; de webcrypto van Node wel.
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  localStorage.clear();
});

const sessie = () => ({ email: "jan@example.org" });

describe("identityProvider", () => {
  it("geeft geen e-mailadres bij request", async () => {
    const r = await identityProvider(sessie).request("nl.example.a");
    expect(JSON.stringify(r)).not.toContain("jan@example.org");
  });

  it("geeft twee mini-apps een verschillend pseudoniem voor hetzelfde lid", async () => {
    const p = identityProvider(sessie);
    const a = await p.request("nl.example.a");
    const b = await p.request("nl.example.b");
    expect(a.subject).not.toBe(b.subject);
  });

  it("geeft dezelfde mini-app steeds hetzelfde pseudoniem", async () => {
    const p = identityProvider(sessie);
    expect((await p.request("nl.example.a")).subject).toBe((await p.request("nl.example.a")).subject);
  });

  it("geeft twee leden een verschillend pseudoniem in dezelfde mini-app", async () => {
    const a = await identityProvider(() => ({ email: "jan@example.org" })).request("nl.example.a");
    const b = await identityProvider(() => ({ email: "piet@example.org" })).request("nl.example.a");
    expect(a.subject).not.toBe(b.subject);
  });

  it("geeft het e-mailadres alleen via email()", async () => {
    expect(await identityProvider(sessie).email("nl.example.a")).toEqual({ email: "jan@example.org" });
  });

  it("weigert zonder sessie", async () => {
    await expect(identityProvider(() => null).request("nl.example.a")).rejects.toThrow();
    await expect(identityProvider(() => null).email("nl.example.a")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run packages/runtime/src/providers/identity.test.ts`
Expected: FAIL, `request` geeft `{ email }` terug en `email` bestaat niet.

- [ ] **Step 3: Herschrijf de provider**

`packages/runtime/src/providers/identity.ts`, volledige nieuwe inhoud:

```ts
import { PleinError } from "@openplein/bridge";

const SALT_KEY = "plein.identity.salt";

function salt(): string {
  const bestaand = localStorage.getItem(SALT_KEY);
  if (bestaand) return bestaand;
  const nieuw = crypto.randomUUID();
  localStorage.setItem(SALT_KEY, nieuw);
  return nieuw;
}

async function pseudoniem(appId: string, email: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt()}|${appId}|${email}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function identityProvider(getSession: () => { email: string } | null) {
  const sessie = () => {
    const s = getSession();
    if (!s) throw new PleinError("NOT_AUTHENTICATED", "Niet ingelogd in Plein");
    return s;
  };
  return {
    async request(appId: string): Promise<{ subject: string; displayName: string }> {
      const { email } = sessie();
      return { subject: await pseudoniem(appId, email), displayName: email.split("@")[0] };
    },
    async email(_appId: string): Promise<{ email: string }> {
      return { email: sessie().email };
    },
  };
}
```

- [ ] **Step 4: Draai de test en controleer dat hij slaagt**

Run: `pnpm vitest run packages/runtime/src/providers/identity.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Koppel de nieuwe methode aan de host**

In `packages/runtime/src/components/MiniAppView.tsx`, voeg direct na regel 29 toe:

```ts
        identityEmail: (appId) => identity.email(appId),
```

De omliggende regels zien er dan zo uit:

```ts
        identityRequest: (appId) => identity.request(appId),
        identityEmail: (appId) => identity.email(appId),
        storageGet: (appId, key) => storageProvider.get(appId, key),
```

- [ ] **Step 6: Draai alles**

Run: `pnpm test && pnpm typecheck`
Expected: alles slaagt.

- [ ] **Step 7: Commit**

```bash
git add packages/runtime/src/providers packages/runtime/src
git commit -m "feat(runtime): gesalt pseudoniem per mini-app, e-mailadres achter aparte permissie"
```

---

### Task 7: Demo-mini-apps bijwerken en het lek dichttesten

**Files:**
- Modify: `apps/demo/miniapps/lijstje/plein-client.js:71`
- Modify: `apps/demo/miniapps/betalen/plein-client.js:71`
- Modify: `apps/demo/miniapps/lijstje/app.js:47`
- Modify: `e2e/tests/shell.spec.ts`

**Interfaces:**
- Consumes: het bridge-contract uit Task 5 en de provider uit Task 6.
- Produces: geen nieuwe API. Levert het bewijs onder de belofte uit de spec.

De twee `plein-client.js`-bestanden zijn **build-artefacten**, geen handwerk: `packages/bridge/package.json` bouwt ze met `build:client` uit `packages/bridge/src/client.ts`, en `Dockerfile:7-8` kopieert het resultaat naar beide mini-apps. Ze worden dus opnieuw gegenereerd, niet met de hand aangepast. De bron is in Task 5 al gewijzigd.

De bestaande e2e-test in `e2e/tests/shell.spec.ts:22` controleert nu letterlijk `frame.getByText("Lijstje van e2e@plein.test")`. Het lek dat deze taak dicht, staat daar dus als verwacht gedrag in de test. Die regel moet mee veranderen, en die verandering **is** het bewijs.

- [ ] **Step 1: Genereer de clientkopieën opnieuw**

```bash
pnpm --filter @openplein/bridge build:client
cp packages/bridge/dist/plein-client.js apps/demo/miniapps/lijstje/
cp packages/bridge/dist/plein-client.js apps/demo/miniapps/betalen/
```

Run: `grep -c "identity.email" apps/demo/miniapps/lijstje/plein-client.js`
Expected: `1` of hoger. Is het `0`, dan is Task 5 stap 9 niet doorgevoerd.

- [ ] **Step 2: Werk de lijstje-mini-app bij**

Na de reviewronde op Task 6 geeft `identity.request()` **alleen** `{ subject }` terug. Er is geen weergavenaam meer, want die was voor elke mini-app identiek en ondermijnde daarmee precies de onkoppelbaarheid die het pseudoniem moest leveren. De mini-app heeft dus niets om de gebruiker mee aan te spreken, en dat is de bedoeling: wie dat wil, vraagt de `email`-permissie aan.

In `apps/demo/miniapps/lijstje/app.js`, vervang regel 47:

```js
    await plein.identity.request();
```

De aanroep blijft staan omdat hij de permissiedialoog uitlokt en aantoont dat de mini-app is ingelogd, maar het resultaat wordt niet meer gebruikt.

Run: `grep -n "email" apps/demo/miniapps/lijstje/app.js`
Verwacht: treffers op de plek waar de variabele daarna gebruikt werd, bijvoorbeeld in een kop als `Lijstje van ${email}`. Vervang die kop door de vaste tekst `Jouw lijstje`.

Run opnieuw: `grep -n "email" apps/demo/miniapps/lijstje/app.js`
Expected: geen treffers.

- [ ] **Step 3: Pas de bestaande e2e-verwachting aan**

Vervang in `e2e/tests/shell.spec.ts` regel 22:

```ts
  await expect(frame.getByText("Jouw lijstje")).toBeVisible();
```

- [ ] **Step 4: Voeg de test toe die het lek dichthoudt**

Voeg onder de bestaande test in `e2e/tests/shell.spec.ts` toe:

```ts
test("een mini-app met alleen identity ziet het e-mailadres niet", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: /Lijstje/ }).click();
  await page.getByRole("button", { name: /Toestaan|Allow/ }).click(); // identity
  await page.getByRole("button", { name: /Toestaan|Allow/ }).click(); // storage
  const frame = page.frameLocator("iframe");
  await expect(frame.getByText("Jouw lijstje")).toBeVisible();
  await expect(frame.locator("body")).not.toContainText("e2e@plein.test");
  await expect(frame.locator("body")).not.toContainText("e2e");
});
```

De laatste regel is scherper dan hij lijkt: `e2e` is het deel vóór de apenstaart van het testadres. Zou een latere wijziging alsnog een van het e-mailadres afgeleide naam doorgeven, dan valt deze test om.

Dit is de test die faalt op de oude code en slaagt op de nieuwe. Draai hem daarom bewust twee keer: eerst met `git stash` over de wijzigingen van Task 6 en 7 om te zien dat hij faalt, daarna zonder.

- [ ] **Step 5: Draai alles**

Start eerst de server en de gebouwde runtime zoals de e2e-opzet dat verwacht (zie `e2e/playwright.config.ts` voor de `webServer`-instelling), en draai dan:

Run: `pnpm test && pnpm typecheck && pnpm --filter @openplein/e2e test`
Expected: alles slaagt, inclusief de twee e2e-tests.

- [ ] **Step 6: Werk de mini-app-specificatie bij**

In `docs/miniapp-spec.md` staat rond regel 85 tot 91 nog dat `plein.identity.request()` een `{ email: string }` teruggeeft. Dat is achterhaald en misleidt iedere mini-app-bouwer die alleen de spec leest.

Pas het aan naar het werkelijke contract:

- `identity.request()` geeft `{ subject: string }`. De `subject` is een pseudoniem dat per mini-app verschilt, zodat twee mini-apps niet kunnen vaststellen dat ze hetzelfde lid bedienen. Er zit bewust geen naam of adres in.
- `identity.email()` geeft `{ email: string }` en hangt aan de aparte permissie `email`, met een eigen toestemmingsdialoog.

Noem daarbij ook de grens eerlijk: het pseudoniem wordt afgeleid met een salt die in de browser van de gebruiker staat, dus hij verandert als de gebruiker zijn browseropslag wist.

- [ ] **Step 7: Corrigeer de README over Nixpay**

In `README.md` regel 6, vervang:

```
on European building blocks (Nixpay for payments today; Matrix and an EUDI
```

door:

```
on European building blocks (payments run on Mollie in the current demo, with
Nixpay as the intended first European provider behind the same swappable
contract; Matrix and an EUDI
```

In `README.md` regel 26, vervang:

```
componeert bestaande Europese bouwstenen (Nixpay voor betalen, straks Matrix
```

door:

```
componeert bestaande Europese bouwstenen (betalen loopt in de demo via Mollie,
met Nixpay als beoogde eerste Europese provider achter hetzelfde verwisselbare
contract; straks Matrix
```

In `docs/funding/README.md` regel 29, vervang:

```
> blocks — starting with Nixpay for payments, with Matrix (messaging) and
```

door:

```
> blocks, starting with payments (Mollie today, Nixpay as the intended
> European provider behind the same contract), with Matrix (messaging) and
```

Dit staat in de abstract, die een limiet van 1200 tekens heeft. Controleer daarna de lengte van dat blok en kort de omliggende zinnen in als het eroverheen gaat.

Run: `grep -rn "Nixpay for payments today\|Nixpay voor betalen" . --include="*.md" | grep -v node_modules`
Expected: geen treffers.

- [ ] **Step 8: Commit**

```bash
git add apps/demo/miniapps e2e docs README.md
git commit -m "feat(demo): mini-apps op het nieuwe identiteitscontract + e2e-test tegen e-maillek"
```

---

## Na dit plan

De tenantlaag staat en het identiteitscontract klopt. Wat daarna volgt en een eigen plan krijgt, zodra het gesprek met Tim is geweest:

- Ledenregister met status en export.
- Contributie via het bestaande providercontract, met idempotente webhook en verplicht webhook-secret.
- De datumprikker als eerste mini-app van derden, gebouwd met `create-plein-app`.
- `HANDVEST.md` in de repo en op de site.

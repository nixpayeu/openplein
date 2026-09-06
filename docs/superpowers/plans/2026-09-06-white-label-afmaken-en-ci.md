# White-label afmaken en CI, implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een tweede tenant kan een eigen plein draaien zonder dat een bezoeker ergens het merk of de demotekst van de eerste tenant ziet, en de testsuites draaien voortaan vanzelf.

**Architecture:** De tenantconfiguratie krijgt een `welcome`-blok met de tekst van het uitgelogde scherm, per taal. `WelcomeView` rendert die tekst in plaats van de vaste demotekst uit de vertaalbestanden, en toont het logo of de naam van de tenant als woordmerk. Het webmanifest wordt niet meer bij de build vastgelegd maar door de server samengesteld uit dezelfde tenantconfiguratie, zodat één image voor alle tenants volstaat. Daarnaast gaat de repo van Node 22 naar Node 24, omdat `node:sqlite` daar zonder experimentele vlag draait en de volgende ronde daarop leunt.

**Tech Stack:** TypeScript, pnpm-workspace, vitest (jsdom voor runtime-tests), Hono op Node 24, React 18 met Vite en vite-plugin-pwa, Playwright voor e2e, ajv voor schemavalidatie, GitHub Actions.

## Global Constraints

- Node `>=24.0.0` na taak 1, pnpm `11.5.0`.
- Geen nieuwe externe afhankelijkheden.
- Nederlandstalige code-commentaren en foutmeldingen, in lijn met de bestaande code.
- Functies onder de 10 regels waar dat kan.
- `packages/tenant` is AGPL-3.0 en mag géén afhankelijkheid op `@openplein/sdk` krijgen. Manifestvalidatie hoort in `apps/demo/server`, dat van allebei mag afhangen.
- Runtime-tests die de DOM of localStorage nodig hebben, beginnen met `// @vitest-environment jsdom`.
- Testen: `pnpm test` vanuit de repo-root. Typecheck: `pnpm typecheck`. E2e: `pnpm --filter @openplein/e2e test`.
- De e2e-assertie `getByRole("heading", { name: "Plein", exact: true })` moet blijven werken: `exact: true` is er niet voor niets, want de koppen op het uitgelogde scherm bevatten het woord "Plein" als substring.
- Geen tekst in de shell mag beweren wat de installatie niet doet. Claims over wat er met gegevens gebeurt, horen bij de tenant die ze waarmaakt, niet in een gedeeld vertaalbestand.

## Uitvoervolgorde

De taken worden uitgevoerd in de volgorde **2, 3, 4, 5, 1, 6**. Taak 1 is de versiebump naar Node 24 en gaat bewust als voorlaatste.

Reden: Node 24 staat inmiddels als `nvm alias default` op de machine, maar de draaiende sessie erft een `PATH` die Node 22 vastpint en die kan niet meer gewijzigd worden voor de subagents die de taken uitvoeren. Zou `engines` nu al op `>=24.0.0` staan, dan draait iedere taak daarna met een versiewaarschuwing op een versie die het `package.json` afkeurt. Taken 2 tot en met 5 hebben Node 24 niet nodig.

De volledige suite is vooraf onder Node 24 gedraaid, buiten dit plan om: 69 tests groen, typecheck schoon, pnpm lost in de repo gewoon op naar 11.5.0. De bump is dus geen sprong in het duister. Taak 6 (CI) komt ná de bump zodat de workflow niet een Node-versie pint die het `package.json` op dat moment nog niet toestaat.

## Waarom dit plan bestaat

De vorige ronde leverde een tenantlaag op die pas ná het inloggen werkt. Een uitgelogde bezoeker krijgt het woordmerk `PLEIN`, de kop "Welkom op het Plein", en een intro over een fase-0-demo met testgeld en twee demo-mini-apps. Voor de eerste echte klant klopt daar geen woord van, en dat blokkeert de verkoop die dit hele spoor draagt.

Daarbovenop staat de naam van de geïnstalleerde app buildtime vast in `packages/runtime/vite.config.ts`, dus elke tenant heet "Plein" op het beginscherm van een telefoon.

## Wat dit plan bewust niet doet

Ledenregister, contributie-inning, de datumprikker-mini-app en `HANDVEST.md` krijgen een eigen plan. Dit plan raakt geen opslag en geen betalingen.

---

### Task 1: Node 22 naar Node 24

**Files:**
- Modify: `package.json` (veld `engines`)
- Modify: `.nvmrc`
- Modify: `Dockerfile` (beide `FROM`-regels)

**Interfaces:**
- Consumes: niets.
- Produces: de hele repo draait op Node 24. Taak 6 pint diezelfde versie in CI, en het volgende plan leunt erop voor `node:sqlite` zonder experimentele vlag.

- [ ] **Step 1: Controleer welke Node-versie beschikbaar is**

Run: `node --version`
Expected: `v24.x.x` of hoger. Is dat niet zo, rapporteer dat dan als BLOCKED in plaats van de versiebump half door te voeren; de rest van dit plan hangt er niet van af en kan dan als eerste gedaan worden.

- [ ] **Step 2: Pas de versievelden aan**

In `package.json`, vervang:

```json
  "engines": { "node": ">=22.13" },
```

door:

```json
  "engines": { "node": ">=24.0.0" },
```

In `.nvmrc`, vervang de inhoud door:

```
24
```

In `Dockerfile`, vervang beide voorkomens van `FROM node:22-alpine` door `FROM node:24-alpine`. Let op: het zijn er twee, een build-stage en een runtime-stage.

- [ ] **Step 3: Installeer opnieuw en draai alles**

Run: `pnpm install && pnpm test && pnpm typecheck`
Expected: installatie slaagt zonder engine-waarschuwing, 69 tests groen, typecheck schoon.

- [ ] **Step 4: Controleer de Docker-build**

Run: `docker build -t openplein-node24 .`
Expected: de build slaagt. Is `docker` niet beschikbaar, rapporteer dat expliciet in plaats van de stap stil over te slaan.

- [ ] **Step 5: Commit**

```bash
git add package.json .nvmrc Dockerfile pnpm-lock.yaml
git commit -m "chore: naar Node 24 (node:sqlite zonder experimentele vlag)"
```

---

### Task 2: De tenantconfiguratie krijgt de tekst van het uitgelogde scherm

**Files:**
- Modify: `packages/tenant/src/schema.json`
- Modify: `packages/tenant/src/tenant.ts`
- Modify: `packages/tenant/src/tenant.test.ts`

**Interfaces:**
- Consumes: niets uit eerdere taken.
- Produces:
  - `interface WelcomeText { intro: string; sections?: { title: string; items: string[] }[] }`
  - `TenantConfig` krijgt het optionele veld `welcome?: Partial<Record<"nl" | "en", WelcomeText>>`
  - `welcomeFor(config: TenantConfig, locale: "nl" | "en"): WelcomeText | null`: geeft de tekst voor die taal, valt terug op de andere taal als die er wel is, en geeft `null` als er helemaal geen `welcome` is.

Er is bewust geen `title` en geen `kicker` in `WelcomeText`: de kop is de naam van de tenant, en die staat al in `name`.

- [ ] **Step 1: Schrijf de falende test**

Voeg toe aan `packages/tenant/src/tenant.test.ts`:

```ts
import { validateTenantConfig, welcomeFor } from "./tenant";

const metWelkom = {
  hostname: "plein.example.org",
  name: "Voorbeeld",
  catalog: [],
  welcome: {
    nl: { intro: "Welkom bij ons.", sections: [{ title: "Wat je krijgt", items: ["Een", "Twee"] }] },
    en: { intro: "Welcome." },
  },
};

describe("welcome in de tenantconfiguratie", () => {
  it("accepteert een welcome-blok in twee talen", () => {
    expect(validateTenantConfig(metWelkom).valid).toBe(true);
  });

  it("accepteert een welcome-blok in één taal", () => {
    const r = validateTenantConfig({ ...metWelkom, welcome: { nl: { intro: "Hoi." } } });
    expect(r.valid).toBe(true);
  });

  it("weigert een welcome zonder intro", () => {
    const r = validateTenantConfig({ ...metWelkom, welcome: { nl: { sections: [] } } });
    expect(r.valid).toBe(false);
  });

  it("weigert een onbekende taal", () => {
    const r = validateTenantConfig({ ...metWelkom, welcome: { de: { intro: "Hallo." } } });
    expect(r.valid).toBe(false);
  });

  it("weigert een sectie zonder titel", () => {
    const r = validateTenantConfig({
      ...metWelkom,
      welcome: { nl: { intro: "Hoi.", sections: [{ items: ["Een"] }] } },
    });
    expect(r.valid).toBe(false);
  });
});

describe("welcomeFor", () => {
  it("geeft de tekst van de gevraagde taal", () => {
    const c = validateTenantConfig(metWelkom);
    if (!c.valid) throw new Error("configuratie zou geldig moeten zijn");
    expect(welcomeFor(c.config, "en")?.intro).toBe("Welcome.");
  });

  it("valt terug op de andere taal", () => {
    const r = validateTenantConfig({ ...metWelkom, welcome: { nl: { intro: "Alleen NL." } } });
    if (!r.valid) throw new Error("configuratie zou geldig moeten zijn");
    expect(welcomeFor(r.config, "en")?.intro).toBe("Alleen NL.");
  });

  it("geeft null zonder welcome-blok", () => {
    const r = validateTenantConfig({ hostname: "localhost", name: "Plein", catalog: [] });
    if (!r.valid) throw new Error("configuratie zou geldig moeten zijn");
    expect(welcomeFor(r.config, "nl")).toBeNull();
  });
});
```

- [ ] **Step 2: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run packages/tenant`
Expected: FAIL, `welcomeFor` bestaat niet en het schema weigert `welcome` als onbekend veld (`additionalProperties: false`).

- [ ] **Step 3: Breid het schema uit**

Voeg in `packages/tenant/src/schema.json` binnen `properties` toe, naast `colors`:

```json
    "welcome": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "nl": { "$ref": "#/$defs/welcomeText" },
        "en": { "$ref": "#/$defs/welcomeText" }
      }
    }
```

en voeg op het hoogste niveau van het schema, naast `properties`, toe:

```json
  "$defs": {
    "welcomeText": {
      "type": "object",
      "additionalProperties": false,
      "required": ["intro"],
      "properties": {
        "intro": { "type": "string", "minLength": 1 },
        "sections": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["title", "items"],
            "properties": {
              "title": { "type": "string", "minLength": 1 },
              "items": { "type": "array", "items": { "type": "string", "minLength": 1 } }
            }
          }
        }
      }
    }
  }
```

- [ ] **Step 4: Breid het type en de hulpfunctie uit**

Voeg in `packages/tenant/src/tenant.ts` toe, boven `TenantConfig`:

```ts
export interface WelcomeText {
  intro: string;
  sections?: { title: string; items: string[] }[];
}
```

Voeg aan de interface `TenantConfig` het veld toe:

```ts
  welcome?: Partial<Record<"nl" | "en", WelcomeText>>;
```

En voeg onderaan het bestand toe:

```ts
/**
 * De tekst voor het uitgelogde scherm in de gevraagde taal. Valt terug op de
 * andere taal, want een half vertaalde tenant is beter dan een leeg scherm.
 */
export function welcomeFor(config: TenantConfig, locale: "nl" | "en"): WelcomeText | null {
  const w = config.welcome;
  if (!w) return null;
  return w[locale] ?? w[locale === "nl" ? "en" : "nl"] ?? null;
}
```

- [ ] **Step 5: Draai de test en controleer dat hij slaagt**

Run: `pnpm vitest run packages/tenant`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/tenant
git commit -m "feat(tenant): welkomsttekst per taal in de tenantconfiguratie"
```

---

### Task 3: Het uitgelogde scherm toont de tenant

**Files:**
- Modify: `packages/runtime/src/components/WelcomeView.tsx` (volledig herschreven)
- Create: `packages/runtime/src/components/WelcomeView.test.tsx`
- Modify: `packages/runtime/src/App.tsx`
- Modify: `packages/runtime/src/i18n/nl.json`
- Modify: `packages/runtime/src/i18n/en.json`
- Modify: `apps/demo/server/tenant.json`
- Modify: `deploy/tenant.saig.json`

**Interfaces:**
- Consumes: `TenantConfig`, `WelcomeText` en `welcomeFor` uit `@openplein/tenant` (Task 2).
- Produces: `WelcomeView` accepteert `props: { onLogin: (s: Session) => void; tenant: TenantConfig | null; loadError: boolean }`.

- [ ] **Step 1: Schrijf de falende test**

`packages/runtime/src/components/WelcomeView.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { WelcomeView } from "./WelcomeView";
import type { TenantConfig } from "@openplein/tenant";

const tenant: TenantConfig = {
  hostname: "plein.example.org",
  name: "Digitale Autonomie",
  catalog: [],
  welcome: { nl: { intro: "Onze eigen intro.", sections: [{ title: "Wat je krijgt", items: ["Regel een"] }] } },
};

let container: HTMLDivElement;

function render(el: React.ReactElement): string {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => { createRoot(container).render(el); });
  return container.textContent ?? "";
}

afterEach(() => { container?.remove(); });

describe("WelcomeView", () => {
  it("toont de naam van de tenant als woordmerk en kop", () => {
    const tekst = render(<WelcomeView onLogin={() => {}} tenant={tenant} loadError={false} />);
    expect(tekst).toContain("Digitale Autonomie");
  });

  it("toont de tekst van de tenant en niet die van een ander", () => {
    const tekst = render(<WelcomeView onLogin={() => {}} tenant={tenant} loadError={false} />);
    expect(tekst).toContain("Onze eigen intro.");
    expect(tekst).toContain("Regel een");
    expect(tekst).not.toContain("Plein");
  });

  it("toont geen vreemde tekst als de tenant niets geschreven heeft", () => {
    const kaal: TenantConfig = { hostname: "x", name: "Kaal", catalog: [] };
    const tekst = render(<WelcomeView onLogin={() => {}} tenant={kaal} loadError={false} />);
    expect(tekst).toContain("Kaal");
    expect(tekst).not.toContain("demo");
  });

  it("meldt het als de tenant niet geladen kon worden", () => {
    const tekst = render(<WelcomeView onLogin={() => {}} tenant={null} loadError={true} />);
    expect(tekst).toContain("kon niet geladen worden");
  });
});
```

- [ ] **Step 2: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run packages/runtime/src/components/WelcomeView.test.tsx`
Expected: FAIL, `WelcomeView` accepteert de props niet en toont nog de vaste demotekst.

- [ ] **Step 3: Herschrijf `WelcomeView`**

`packages/runtime/src/components/WelcomeView.tsx`, volledige nieuwe inhoud:

```tsx
import type { TenantConfig } from "@openplein/tenant";
import { welcomeFor } from "@openplein/tenant";
import type { Session } from "../App";
import { LoginView } from "./LoginView";
import { t, getLocale } from "../i18n";

export function WelcomeView(props: {
  onLogin: (s: Session) => void;
  tenant: TenantConfig | null;
  loadError: boolean;
}) {
  const naam = props.tenant?.name ?? "";
  const welkom = props.tenant ? welcomeFor(props.tenant, getLocale()) : null;
  return (
    <main className="welcome">
      {props.tenant?.logoUrl
        ? <img className="tenant-logo" src={props.tenant.logoUrl} alt={naam} />
        : <div className="bord-mini" role="img" aria-label={naam}>{naam}</div>}
      {props.loadError && <p className="error">{t("tenant.loadError")}</p>}
      <h1>{t("welcome.title", { name: naam })}</h1>
      {welkom && <p className="intro">{welkom.intro}</p>}
      {welkom?.sections?.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <ul>{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
        </section>
      ))}
      <LoginView onLogin={props.onLogin} />
    </main>
  );
}
```

- [ ] **Step 4: Ruim de demotekst uit de vertaalbestanden op**

Verwijder uit `packages/runtime/src/i18n/nl.json` en `packages/runtime/src/i18n/en.json` alle sleutels die met `welcome.` beginnen, met uitzondering van `welcome.title`. Dat zijn: `welcome.kicker`, `welcome.intro`, `welcome.getTitle`, `welcome.get1`, `welcome.get2`, `welcome.howTitle`, `welcome.how1`, `welcome.how2`, `welcome.how3`, `welcome.dataTitle`, `welcome.data1`, `welcome.data2`, `welcome.data3`, `welcome.expectTitle`, `welcome.expect1`, `welcome.expect2`, `welcome.expect3`.

Vervang daarna `welcome.title` door een versie met de tenantnaam erin:

In `nl.json`:

```json
  "welcome.title": "Welkom bij {name}",
```

In `en.json`:

```json
  "welcome.title": "Welcome to {name}",
```

Die tekst is de enige die blijft, want hij zegt niets over de installatie behalve haar naam.

- [ ] **Step 5: Geef de tenant door in `App.tsx`**

Voeg naast de bestaande `tenantName`-state toe:

```ts
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
```

Importeer daarvoor bovenaan het bestand:

```ts
import type { TenantConfig } from "@openplein/tenant";
```

Zet in het `useEffect` dat de tenant laadt ook de nieuwe state, naast wat er al gebeurt:

```ts
        setTenant(tenant);
```

Vervang de regel die het uitgelogde scherm rendert:

```tsx
  if (!session) return <WelcomeView onLogin={login} tenant={tenant} loadError={tenantError} />;
```

- [ ] **Step 6: Zet de demotekst in de twee tenantconfiguraties**

Voeg in `apps/demo/server/tenant.json` en in `deploy/tenant.saig.json` een `welcome`-blok toe met de tekst die je in stap 4 uit de vertaalbestanden hebt gehaald. De Nederlandse tekst gaat onder `nl`, de Engelse onder `en`. Vorm:

```json
  "welcome": {
    "nl": {
      "intro": "Plein is een open-source super-app: één plek waar diensten als mini-apps draaien, met jou als baas over elke permissie. Dit is de openbare demo van fase 0: alles wat je ziet werkt echt, met testgeld.",
      "sections": [
        { "title": "Wat je krijgt", "items": ["...", "..."] },
        { "title": "Hoe het werkt", "items": ["...", "...", "..."] },
        { "title": "Wat we met je e-mailadres doen", "items": ["...", "...", "..."] },
        { "title": "Wat je kunt verwachten", "items": ["...", "..."] }
      ]
    },
    "en": { "intro": "...", "sections": [ ... ] }
  }
```

Neem de teksten letterlijk over uit de vertaalbestanden zoals ze wáren, met twee uitzonderingen:

1. Het gedachtestreepje in de intro vervang je door een dubbele punt, zoals hierboven.
2. De laatste opsommingsregel bevatte een link naar openplein.eu binnen de React-code. Die link vervalt; maak er platte tekst van die het adres noemt.

- [ ] **Step 7: Voeg de opmaak voor het logo toe**

Voeg onderaan `packages/runtime/src/styles.css` toe:

```css
.tenant-logo { max-height: 64px; max-width: 60%; display: block; margin: 0 auto 1rem; }
```

- [ ] **Step 8: Draai alles**

Run: `pnpm test && pnpm typecheck`
Expected: alles slaagt.

Run: `pnpm --filter @openplein/e2e test`
Expected: 3/3 groen. Let op: de e2e-inlogroutine zoekt `getByLabel(/e-?mail/i)` en de knop `Stuur code`, allebei in `LoginView`. Die twee blijven ongewijzigd.

**Correctie tijdens de uitvoering.** Een eerdere versie van dit plan zei dat `login.title` ongewijzigd bleef. Dat was fout en het maakte de taak tegenstrijdig met zichzelf: `WelcomeView` rendert `LoginView`, dus zolang die kop "Inloggen bij Plein" luidt, kan de test die eist dat er nergens "Plein" staat niet slagen. Erger nog, een uitgelogde bezoeker van een andere vereniging zou dan alsnog een vreemde merknaam zien, precies wat deze taak moet wegnemen.

`login.title` wordt daarom óók tenant-eigen:

- `nl.json`: `"login.title": "Inloggen bij {name}"`, `en.json`: `"Sign in to {name}"`.
- `LoginView` krijgt een prop `name: string` en rendert `t("login.title", { name: props.name })`.
- `WelcomeView` geeft de naam door.

De e2e-assertie blijft ongewijzigd: voor de demo-tenant wordt de kop gewoon weer "Inloggen bij Plein", dus de substring bestaat nog en `exact: true` blijft nodig.

Zolang de tenant nog niet geladen is, is er geen naam. Toon in dat venster geen woordmerk en geen `welcome.title`, en laat `LoginView` terugvallen op de naamloze sleutel `login.titleAnon` (`"Inloggen"` / `"Sign in"`). Anders staat er bij elke pageload even "Welkom bij " met een losse spatie op het scherm.

- [ ] **Step 9: Controleer het handmatig met een tweede tenant**

Maak tijdelijk een tweede configuratie en start de server ertegen:

```bash
cp apps/demo/server/tenant.json /tmp/tenant-test.json
```

Wijzig in `/tmp/tenant-test.json` de `name` naar `Digitale Autonomie` en vervang de `welcome.nl.intro` door een eigen zin. Start dan:

```bash
TENANT_CONFIG=/tmp/tenant-test.json pnpm --filter @openplein/demo-server start
```

en in een tweede terminal `pnpm --filter @openplein/runtime dev`. Open `http://localhost:5173` zonder in te loggen.

Expected: er staat nergens "Plein" op het scherm. Niet als woordmerk, niet in de kop, niet in de intro. Rapporteer wat je ziet; dit is de controle waarvoor dit hele plan bestaat.

Ruim `/tmp/tenant-test.json` daarna op.

- [ ] **Step 10: Commit**

```bash
git add packages/runtime apps/demo/server/tenant.json deploy/tenant.saig.json
git commit -m "feat(runtime): uitgelogd scherm toont de tenant, niet de demo"
```

---

### Task 4: Het webmanifest komt van de server

**Files:**
- Modify: `apps/demo/server/src/app.ts`
- Modify: `apps/demo/server/src/app.test.ts`
- Modify: `packages/runtime/vite.config.ts`
- Modify: `packages/runtime/index.html`
- Modify: `packages/runtime/src/catalog.ts` (`applyTenantBranding`)
- Modify: `packages/runtime/src/tenant.test.ts`

**Interfaces:**
- Consumes: `TenantConfig` uit `@openplein/tenant`, de bestaande route-opzet in `app.ts`.
- Produces: een route `GET /api/manifest.webmanifest` die een webmanifest teruggeeft met `Content-Type: application/manifest+json`, samengesteld uit de tenantconfiguratie. `applyTenantBranding` zet voortaan ook de `theme-color`-meta.

- [ ] **Step 1: Schrijf de falende test voor de route**

Voeg toe aan `apps/demo/server/src/app.test.ts`:

```ts
describe("GET /api/manifest.webmanifest", () => {
  const tenantConfig = {
    hostname: "localhost", name: "Digitale Autonomie", catalog: [],
    colors: { "navy-1": "#101820" },
  };

  it("gebruikt de naam van de tenant", async () => {
    const app = createApp({ authSecret: "test", paymentsMock: true, tenantConfig });
    const res = await app.request("/api/manifest.webmanifest");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      name: "Digitale Autonomie", short_name: "Digitale Autonomie",
    });
  });

  it("serveert het juiste content-type", async () => {
    const app = createApp({ authSecret: "test", paymentsMock: true, tenantConfig });
    const res = await app.request("/api/manifest.webmanifest");
    expect(res.headers.get("content-type")).toContain("application/manifest+json");
  });

  it("neemt de achtergrondkleur van de tenant over", async () => {
    const app = createApp({ authSecret: "test", paymentsMock: true, tenantConfig });
    const m = (await (await app.request("/api/manifest.webmanifest")).json()) as Record<string, string>;
    expect(m.theme_color).toBe("#101820");
    expect(m.background_color).toBe("#101820");
  });

  it("valt terug op de standaardkleur zonder tenantkleuren", async () => {
    const app = createApp({
      authSecret: "test", paymentsMock: true,
      tenantConfig: { hostname: "localhost", name: "Kaal", catalog: [] },
    });
    const m = (await (await app.request("/api/manifest.webmanifest")).json()) as Record<string, string>;
    expect(m.theme_color).toBe("#070F1C");
  });
});
```

- [ ] **Step 2: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run apps/demo/server`
Expected: FAIL, 404 op de route.

- [ ] **Step 3: Voeg de route toe**

Voeg in `apps/demo/server/src/app.ts` direct onder de bestaande `/api/tenant`-route toe:

```ts
  // Het webmanifest hoort bij de tenant, niet bij de build: één image bedient
  // alle tenants, dus de naam op het beginscherm komt hiervandaan.
  app.get("/api/manifest.webmanifest", (c) => {
    const kleur = opts.tenantConfig.colors?.["navy-1"] ?? "#070F1C";
    return c.json({
      name: opts.tenantConfig.name, short_name: opts.tenantConfig.name,
      start_url: "/", display: "standalone",
      theme_color: kleur, background_color: kleur,
      icons: [{ src: opts.tenantConfig.logoUrl ?? "/icon-512.png", sizes: "512x512", type: "image/png" }],
    }, 200, { "Content-Type": "application/manifest+json" });
  });
```

- [ ] **Step 4: Draai de test en controleer dat hij slaagt**

Run: `pnpm vitest run apps/demo/server`
Expected: PASS.

- [ ] **Step 5: Laat vite het manifest niet meer genereren**

In `packages/runtime/vite.config.ts`, vervang het hele `manifest`-object binnen `VitePWA({...})` door:

```ts
      manifest: false,
```

De rest van de `VitePWA`-opties blijft ongewijzigd: de servicewerker blijft dus gewoon gegenereerd worden, alleen het manifest niet.

- [ ] **Step 6: Verwijs vanuit de pagina naar het manifest van de server**

In `packages/runtime/index.html`, vervang:

```html
    <meta name="theme-color" content="#070F1C" />
    <link rel="stylesheet" href="/fonts/fonts.css" />
    <title>Plein</title>
```

door:

```html
    <meta name="theme-color" content="#070F1C" />
    <link rel="manifest" href="/api/manifest.webmanifest" />
    <link rel="stylesheet" href="/fonts/fonts.css" />
    <title>Laden…</title>
```

De titel is bewust neutraal: hij staat er alleen in de fractie van een seconde vóórdat de tenantnaam geladen is, en mag daarom geen merknaam zijn.

- [ ] **Step 7: Schrijf de falende test voor de theme-color**

Voeg toe aan `packages/runtime/src/tenant.test.ts`, binnen het `describe("applyTenantBranding", ...)`-blok:

```ts
  it("zet de theme-color-meta op de kleur van de tenant", () => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
    applyTenantBranding({
      hostname: "localhost", name: "Plein", catalog: [], colors: { "navy-1": "#101820" },
    });
    expect(meta.getAttribute("content")).toBe("#101820");
    meta.remove();
  });
```

- [ ] **Step 8: Draai de test en controleer dat hij faalt**

Run: `pnpm vitest run packages/runtime/src/tenant.test.ts`
Expected: FAIL, de meta houdt zijn oude waarde.

- [ ] **Step 9: Breid `applyTenantBranding` uit**

Voeg in `packages/runtime/src/catalog.ts` aan het einde van `applyTenantBranding` toe:

```ts
  const kleur = tenant.colors?.["navy-1"];
  const meta = document.querySelector('meta[name="theme-color"]');
  if (kleur && meta) meta.setAttribute("content", kleur);
```

- [ ] **Step 10: Draai alles**

Run: `pnpm test && pnpm typecheck`
Expected: alles slaagt.

Run: `pnpm --filter @openplein/e2e test`
Expected: 3/3 groen.

- [ ] **Step 11: Controleer het manifest handmatig**

Start de server en de runtime, en haal het manifest op:

```bash
curl -s -i http://localhost:5173/api/manifest.webmanifest | head -20
```

Expected: status 200, `Content-Type: application/manifest+json`, en `"name": "Plein"` uit `apps/demo/server/tenant.json`. Controleer daarna in de browser dat er geen 404 op het manifest staat in het netwerkpaneel.

- [ ] **Step 12: Commit**

```bash
git add apps/demo/server packages/runtime
git commit -m "feat: webmanifest uit de tenantconfiguratie in plaats van uit de build"
```

---

### Task 5: Een test die bewaakt dat elke permissie een vertaling heeft

**Files:**
- Modify: `packages/runtime/src/i18n/i18n.test.ts`

**Interfaces:**
- Consumes: `PERMISSIONS` uit `@openplein/sdk`, de twee vertaalbestanden.
- Produces: geen API. Sluit de fout die de eindreview van de vorige ronde vond: de permissie `email` bestond wel, maar had geen vertaling, waardoor de toestemmingsdialoog letterlijk "perm.email" toonde.

- [ ] **Step 1: Schrijf de test**

Voeg toe aan `packages/runtime/src/i18n/i18n.test.ts`:

```ts
import { PERMISSIONS } from "@openplein/sdk";
import nl from "./nl.json" with { type: "json" };
import en from "./en.json" with { type: "json" };

describe("vertalingen", () => {
  it("heeft voor elke permissie een tekst in beide talen", () => {
    for (const p of PERMISSIONS) {
      expect(Object.keys(nl)).toContain(`perm.${p}`);
      expect(Object.keys(en)).toContain(`perm.${p}`);
    }
  });

  it("heeft in beide talen dezelfde sleutels", () => {
    expect(Object.keys(nl).sort()).toEqual(Object.keys(en).sort());
  });
});
```

- [ ] **Step 2: Draai de test**

Run: `pnpm vitest run packages/runtime/src/i18n`
Expected: PASS. Faalt de tweede test, dan is er in taak 3 een sleutel uit één van de twee bestanden verwijderd en niet uit het andere. Repareer dat dan, want dat is precies wat deze test moet vangen.

- [ ] **Step 3: Bewijs dat de test kan falen**

Verwijder tijdelijk de sleutel `perm.email` uit `packages/runtime/src/i18n/nl.json`.

Run: `pnpm vitest run packages/runtime/src/i18n`
Expected: FAIL, op allebei de tests.

Zet de sleutel daarna terug en draai opnieuw.
Expected: PASS. Noteer beide uitkomsten in je rapport.

- [ ] **Step 4: Commit**

```bash
git add packages/runtime/src/i18n
git commit -m "test(i18n): elke permissie moet een vertaling hebben in beide talen"
```

---

### Task 6: CI op GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: de scripts `test` en `typecheck` uit de root-`package.json`, en `pnpm --filter @openplein/e2e test`.
- Produces: een workflow die bij elke push en elke pull request draait.

- [ ] **Step 1: Schrijf de workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 11.5.0

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm typecheck

      - run: pnpm test

      - run: pnpm --filter @openplein/e2e exec playwright install --with-deps chromium

      - run: pnpm --filter @openplein/e2e test

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: e2e/test-results/
          retention-days: 7
```

De e2e-stap heeft geen aparte serverstap nodig: `e2e/playwright.config.ts` start de vier servers zelf via zijn `webServer`-instelling.

- [ ] **Step 2: Controleer de workflow lokaal zo ver als het kan**

Draai de commando's die de workflow draait, in dezelfde volgorde, vanuit een schone installatie:

```bash
pnpm install --frozen-lockfile && pnpm typecheck && pnpm test && pnpm --filter @openplein/e2e test
```

Expected: alles slaagt. Faalt `--frozen-lockfile`, dan loopt het lockfile achter op de `package.json`-bestanden en moet dat eerst rechtgezet worden, want in CI is dat een harde fout.

- [ ] **Step 3: Documenteer het in de README**

Voeg in `README.md` bij het ontwikkelgedeelte een korte alinea toe die zegt dat CI bij elke push typecheck, unit tests en de e2e-suite draait op Node 24, en dat de e2e-suite de servers zelf start.

- [ ] **Step 4: Commit**

```bash
git add .github README.md
git commit -m "ci: typecheck, tests en e2e bij elke push"
```

- [ ] **Step 5: Rapporteer de grens van deze taak**

De workflow kan pas echt bewezen worden als hij op GitHub gedraaid heeft. Zeg in je rapport expliciet dat je hem lokaal hebt nagebootst maar niet op GitHub hebt zien draaien, zodat dat niet als geverifieerd wordt gelezen.

---

## Na dit plan

Wat hierna volgt en een eigen plan krijgt:

- Ledenregister op `node:sqlite`, met status en export.
- Contributie via Mollie met klant en incassomachtiging, idempotente webhook en een verplicht webhook-secret.
- De datumprikker als eerste mini-app van derden.
- `HANDVEST.md` in de repo en op de site.

# Mini-app spec

Deze spec beschrijft wat een mini-app is, hoe hij met de Plein-shell praat,
en welke garanties de sandbox biedt. Ze volgt de implementatie in
`packages/sdk` (manifest), `packages/bridge` (RPC-protocol, client en host)
en `packages/runtime` (permissies, providers, sandbox-iframe) zoals die nu
in de repo staat — niet het oorspronkelijke ontwerp.

## 1. Het manifest

Elke mini-app levert een `plein.manifest.json` naast zijn statische
HTML/JS/CSS. Het schema staat in
[`packages/sdk/src/schema.json`](../packages/sdk/src/schema.json) en wordt
gevalideerd door `validateManifest()` uit `@openplein/sdk`
(`packages/sdk/src/manifest.ts`), met [Ajv 2020](https://ajv.js.org/) +
`ajv-formats` voor de `uri`-formaatcheck op `entry`.

| Veld | Type | Verplicht | Omschrijving |
|---|---|---|---|
| `id` | string, patroon `^[a-z0-9]+(\.[a-z0-9-]+)+$` | ja | Omgekeerde-domeinnotatie, bv. `nl.easeo.lijstje`. Uniek binnen een catalogus. |
| `name` | string, min. 1 teken | ja | Weergavenaam in de shell. |
| `version` | string | ja | Vrij formaat (semver aanbevolen). |
| `icon` | string | ja | URL of relatief pad naar het icoon. |
| `entry` | string, `format: uri` | ja | Absolute URL waar de mini-app draait; het `origin` hiervan is de enige toegestane herkomst voor bridge-berichten van deze mini-app. |
| `provider.name` | string | ja | Naam van de aanbieder (getoond als "door {provider}"). |
| `provider.url` | string | ja | URL van de aanbieder. |
| `permissions` | array van `"payments" \| "identity" \| "storage" \| "notifications"` | ja | De permissies die de mini-app kan opvragen. `notifications` is gereserveerd voor fase 1; er is nog geen bridge-methode voor. |

Het schema staat `additionalProperties: false`: onbekende velden op het
top-niveau maken het manifest ongeldig. `validateManifest()` geeft bij een
fout `{ valid: false, errors: string[] }` terug met een lijst
JSON-Pointer-achtige foutmeldingen (`instancePath` + Ajv-message);
`errors` is dus expres een lijst, niet één string.

De scaffolder `create-plein-app` (bin van `@openplein/sdk`, gebouwd via het
`prepare`-script als `packages/sdk/dist/create-plein-app.mjs`) zet een
minimale mini-app met ingevuld manifest neer:

```bash
node packages/sdk/dist/create-plein-app.mjs mijn-app
```

Distributie in fase 0 is een platte `catalog.json` in
`packages/runtime/public/catalog.json` die naar gehoste mini-app-URL's
wijst — geen registry, geen review-proces (zie roadmap onderaan).

## 2. De bridge-API

De mini-app praat met de shell via **`postMessage`** met een getypeerde
RPC-envelope (`packages/bridge/src/protocol.ts`, `PROTOCOL_VERSION = "0.1"`).
De mini-app importeert geen module: hij laadt `plein-client.js`, een IIFE-
bundel van `@openplein/bridge` (gebouwd met
`pnpm --filter @openplein/bridge build:client`, esbuild) die het globale
`window.PleinBridge` levert. Elke mini-app krijgt zijn eigen client:

```html
<script src="plein-client.js"></script>
<script>
  const plein = PleinBridge.createPleinClient();
</script>
```

`createPleinClient(opts?)` accepteert:

- `target?: Window` — standaard `window.parent` (de shell).
- `timeoutMs?: number` — standaard **30 000 ms** per RPC-call. Mini-apps die
  langer lopende flows pollen (zoals betalen, zie §2.3) moeten dit expliciet
  ophogen tot boven hun eigen poll-venster. De demo `betalen`-mini-app zet
  `timeoutMs: 6 * 60_000` (6 minuten), ruim boven het 5-minuten-pollvenster
  van de betaal-provider.

De client geeft ook `dispose()` terug: verwijdert de message-listener en
verwerpt alle openstaande calls (met errorcode `TIMEOUT`, er is bewust geen
apart `DISPOSED`-errorcode). Roep dit aan als een mini-app zichzelf opruimt
vóór alle pending calls zijn afgehandeld.

Elke respons wordt getoetst op herkomst: de client verwerkt alleen
berichten waarvan `event.source === target`; berichten van elders (of
zonder geldige `plein`/`ok`-envelope) worden genegeerd. Andersom controleert
de host (`packages/bridge/src/host.ts`) dat `event.source` de verwachte
iframe is én dat `event.origin` gelijk is aan het `origin` van
`manifest.entry` — met uitzondering van `"null"`, de origin die
sandboxed iframes zonder `allow-same-origin` standaard krijgen (zie §4).

### 2.1 `plein.identity.request()`

```js
const { email } = await plein.identity.request();
```

Respons: `{ email: string }`. Vereist de `identity`-permissie. De MVP-
identiteitsprovider is e-mail/magic-link; er is geen sessie zonder login in
de shell — als de gebruiker niet is ingelogd faalt de call met
`NOT_AUTHENTICATED` (zie §2.4).

### 2.2 `plein.storage.get(key)` / `plein.storage.set(key, value)`

```js
await plein.storage.set("items", JSON.stringify(["brood", "melk"]));
const raw = await plein.storage.get("items"); // string | null
```

Vereist de `storage`-permissie. `key` en `value` zijn strings; de host
valideert dit vóór de provider wordt aangeroepen en geeft `INVALID_PARAMS`
terug als `key` ontbreekt of een lege string is (voor zowel `get` als
`set`), of als `value` bij `set` geen string is. Opslag is per mini-app
geïsoleerd: intern slaat de shell op onder de sleutel
`plein.store.<appId>:<key>` in `localStorage` van de shell-origin — dit is
een implementatiedetail van de host-side provider, niet iets waar de
mini-app zelf iets van ziet of op moet bouwen.

### 2.3 `plein.pay(params)`

```js
const { status } = await plein.pay({
  amount: "2.50", currency: "EUR", description: "Donatie Plein-demo € 2.50",
});
// status: "paid" | "canceled" | "failed"
```

Vereist de `payments`-permissie. Volledige flow:

1. Mini-app roept `plein.pay()` aan → bridge-request naar de shell.
2. Shell toetst de `payments`-permissie (dialoog bij eerste gebruik, zie §3).
3. Shell-backend (`apps/demo/server`, Hono) maakt een betaling aan bij
   Mollie (testmodus) — of, met `PAYMENTS_MOCK=1`, een mock-betaling die na
   de eerste status-poll als betaald geldt.
4. De shell opent de Mollie-checkout in een **nieuw tabblad**
   (`window.open(..., "_blank", "noopener")`). Blokkeert de browser de
   popup, dan valt de shell terug op een banner met een directe link naar
   de checkout-URL (event `plein:checkout` in de runtime).
5. De shell-backend wordt gepolld (elke 2s, met een 5-minuten-deadline aan
   de provider-kant) totdat de status niet meer `"open"` is; `"expired"`
   wordt naar de mini-app vertaald als `"failed"`.
6. De shell antwoordt de mini-app getypeerd terug: `{ status }`.

Er is geen aparte webhook-flow beschreven in de code van fase 0 — de status
komt tot stand via polling vanuit de provider, niet via een Mollie-webhook
naar de backend.

### 2.4 Foutafhandeling

Elke bridge-call kan verwerpen met een `PleinError` (`code`, `message`).
`PleinErrorCode`:

| Code | Wanneer |
|---|---|
| `PERMISSION_DENIED` | Permissie ontbreekt in het manifest, gebruiker weigert de dialoog, óf de permissie-gate zelf gooit een fout (de host faalt hier bewust **closed**: een gate die crasht telt als weigering, nooit als toestemming). |
| `UNKNOWN_METHOD` | De aangeroepen RPC-methode bestaat niet (bv. een typefout, of een methode uit een latere protocolversie). |
| `PROVIDER_ERROR` | De onderliggende provider (payments/identity/storage) gooit een fout die geen `PleinError` is. |
| `NOT_AUTHENTICATED` | `identity.request()` zonder actieve shell-sessie. |
| `TIMEOUT` | Geen respons binnen `timeoutMs`, of de client is `dispose()`d terwijl de call nog openstond. |
| `INVALID_PARAMS` | `storage.get`/`storage.set` met ontbrekende/lege `key`, of `set` met een niet-string `value`. |

De host antwoordt op **elke** afgewezen of onbekende call met een van deze
codes — er is geen pad waarop de mini-app een ongetypeerde crash of een
hangende promise krijgt buiten `timeoutMs`.

## 3. Permissiemodel

Een mini-app kan alleen bridge-methodes gebruiken voor permissies die (a)
in zijn `manifest.permissions` staan, én (b) door de gebruiker zijn
toegestaan. Bij het **eerste gebruik** van een permissie door een mini-app
toont de shell een toestemmingsdialoog ("telefoon-permissies"-stijl:
`{app} vraagt toegang tot: {permission}`, met Toestaan/Weigeren). De
beslissing is **persistent** per `(appId, permissie)`-paar
(`PermissionStore` in `packages/runtime/src/permissions.ts`, opgeslagen in
`localStorage` van de shell onder de sleutel `plein.permissions`) — bij een
volgend gebruik wordt niet opnieuw gevraagd.

Sluit de gebruiker de mini-app terwijl een permissiedialoog nog openstaat,
dan wordt die aanvraag als geweigerd afgehandeld (fail-closed) in plaats
van te blijven hangen.

## 4. Sandbox-eisen

- Elke mini-app draait in een `<iframe>` met
  `sandbox="allow-scripts allow-forms"` (`MiniAppView.tsx`) — **zonder**
  `allow-same-origin`. Dat geeft de iframe een opake ("null") origin: geen
  toegang tot de shell-DOM, geen toegang tot de
  `localStorage`/`sessionStorage`/cookies van de shell, ook niet tot zijn
  eigen origin buiten de iframe. `allow-forms` staat toe dat gewone
  HTML-formulieren (zoals in de `lijstje`-demo) binnen de iframe blijven
  werken; dat verandert niets aan de origin-isolatie.
- Alle netwerkverkeer van een mini-app (assets, API-calls) hoort naar de
  **eigen origin van de aanbieder** te gaan — de origin van `manifest.entry`
  — met de bridge als enige communicatiekanaal terug naar de shell of naar
  shell-backends (betalen, identity). In fase 0 is dit een **listing-eis**
  (mini-apps die zich hier niet aan houden, worden niet in de catalogus
  opgenomen): de dev-opstelling handhaaft dit nog niet technisch. Technische
  handhaving via CSP/registry volgt in fase 2 (zie §5 Roadmap). Eén uitzondering
  nu al: de productieserver stuurt wél een CSP-header mee op `/miniapps/*`
  (volgende bullet) — dat dekt alleen de gebundelde demo-mini-apps van dit
  project, niet een toekomstige registry van externe aanbieders.
- De productieserver (`apps/demo/server/src/app.ts`, `SERVE_STATIC=1`) zet op
  elke `/miniapps/*`-response de header
  `Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`.
  De twee demo-mini-apps gebruiken alleen een inline `<style>`-blok en lokale
  scripts (`plein-client.js`, `app.js`) zonder externe requests of `eval`, dus
  ze blijven onder deze policy functioneren (geverifieerd via statische
  code-inspectie van `apps/demo/miniapps/*/index.html` en `app.js`, niet via
  een browserrun).
- De host accepteert bridge-berichten alleen van het verwachte iframe-
  `Window`-object én van de verwachte origin: `event.origin` moet gelijk
  zijn aan het origin van `manifest.entry`, met een expliciete uitzondering
  voor `"null"` (de origin die een sandboxed iframe zonder
  `allow-same-origin` krijgt — zonder die uitzondering zou de host zichzelf
  buitensluiten).
- Dit sandbox-model is bewust verenigbaar met Apple App Store-richtlijn 4.7
  (HTML5-mini-apps): de container (shell) regelt login en betalingen zelf,
  mini-apps laden geen native code en krijgen geen toegang tot native
  API's buiten de bridge.
- Getest in `e2e/tests/sandbox.spec.ts`: het sandbox-attribuut bevat
  `allow-scripts` en niet `allow-same-origin`; een poging tot
  `window.parent.document.title` of het lezen van de shell-`localStorage`
  vanuit de mini-app-iframe moet zichtbaar falen (afgevangen als
  `"GEBLOKKEERD"`), niet slagen.

## 5. Roadmap

**Fase 0 (MVP, klaar):** shell-PWA met catalogus en permissiedialogen,
bridge met `identity` (e-mail/magic-link), `storage` en `payments`
(Nixpay/Mollie-testmodus), sdk met manifest-schema en
`create-plein-app`-scaffolder, twee demo-mini-apps.

**Fase 1 — Stores:** Capacitor-wrap van dezelfde codebase voor Google Play
en App Store. Bridge-API `notifications` (push) komt in deze fase — het
permissietype bestaat al in het schema, de RPC-methode nog niet.

**Fase 2 — Ecosysteem:**

- **Matrix-provider** voor messaging (`messaging` als nieuwe
  bridge-permissie/provider).
- **EUDI-wallet-identity-provider** (eIDAS 2.0) naast/in plaats van
  e-mail/magic-link, zonder de bridge-contractvorm van
  `identity.request()` te breken.
- Een echte **mini-app-registry** met review-proces, ter vervanging van de
  statische `catalog.json`.
- Developer-documentatiesite op `openplein.eu`.

Expliciet buiten scope: een eigen chat-protocol, eigen betaalinfrastructuur
(dat ís Nixpay), een tweezijdige marktplaats met aanbieder-onboarding, en
native SDK's.

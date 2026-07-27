# OpenPlein — ontwerp

**Datum:** 2026-07-27
**Auteur:** Nick Aldewereld
**Status:** goedgekeurd ontwerp, klaar voor implementatieplan

## Wat is OpenPlein

OpenPlein (roepnaam: Plein) is een open-source mini-app-platform voor NL/EU: één
runtime ("super-app") waarin Europese diensten en producten als mini-apps draaien —
het WeChat-model, maar soeverein, open source en gebouwd op Europese bouwstenen.
Eindgebruiker in het verhaal is de EU-burger; de eerste referentie-use-case is
betalen via Nixpay.

Het project speelt drie rollen tegelijk:

1. **EU-funding-vehikel** (primair): deliverable voor een NGI Zero Commons
   Fund-aanvraag via NLnet, met SAIG als trekker.
2. **Positionering**: het burger-gerichte gezicht van SAIG — "digitale
   soevereiniteit in je broekzak" naast het bestaande B2B/infra-profiel.
3. **Podium voor Nixpay** als founding payment provider van het framework.

## Kernbeslissingen

| Beslissing | Keuze |
|---|---|
| Kern van het product | Mini-app-platform (container + bridge-API); geen aggregator, geen messaging-first |
| Aanpak | Dunne eigen runtime, dikke Europese bouwstenen: Matrix, EUDI-wallet en Nixpay als verwisselbare providers, niet als eigen bouwwerk |
| Naam | **OpenPlein**, roepnaam Plein; domein **openplein.eu** (vrij per 2026-07-27; kale varianten plein.eu/.nl/.app zijn bezet) |
| Eigendom | Auteursrecht en merk bij Nixpay B.V.; publiek onder SAIG-vlag als initiatiefnemer |
| Licentie | AGPL-3.0 voor `runtime` en `bridge`; MIT voor `sdk` en het manifest-schema, zodat mini-app-bouwers niet door AGPL geraakt worden |
| Distributie | PWA-first; store-builds (Google Play + App Store) via Capacitor in fase 1 — beide developer-accounts zijn beschikbaar |
| Funding-volgorde | Eerst MVP bouwen, dán NGI Zero-aanvraag met werkende demo |

## Repo-structuur

Monorepo `sovereignaigrid/openplein` (nieuwe GitHub-org voor SAIG, zodat andere
SAIG-repos er later onder kunnen):

- `packages/runtime` — de shell/container (PWA), AGPL-3.0
- `packages/bridge` — mini-app JavaScript-API + permissiemodel, AGPL-3.0
- `packages/sdk` — manifest-schema, TypeScript-types, `create-plein-app`-starter, MIT
- `apps/demo` — gehoste demo-super-app met twee demo-mini-apps
- `docs/` — architectuur, mini-app-spec, `docs/funding/` voor de NGI-aanvraag

## Architectuur

Vier lagen:

### 1. Shell (`packages/runtime`)

PWA, installeerbaar zonder app store. Levert: home-scherm met geïnstalleerde
mini-apps, "ontdek"-catalogus, gebruikersprofiel, instellingen (taal,
permissies), NL/EN. Dezelfde codebase wordt in fase 1 met Capacitor verpakt
voor de stores; niets in het ontwerp mag native-only zijn.

### 2. Mini-apps

Een mini-app is een statische web-app (HTML/JS/CSS) plus `plein.manifest.json`:
naam, icoon, versie, aanbieder en de benodigde permissies (`payments`,
`identity`, `storage`, `notifications`). De shell draait elke mini-app in een
gesandboxte iframe met strikte CSP: netwerk alleen naar de eigen origin van de
aanbieder, geen toegang tot de shell-DOM. Distributie in de MVP: een
catalogus-JSON in de repo die naar gehoste mini-app-URL's wijst; een echte
registry met review-proces is fase 2.

Dit sandbox-model is bewust verenigbaar met Apple App Store-guideline 4.7
(HTML5-mini-apps): de container regelt login en betalingen zelf, mini-apps
laden geen native code.

### 3. Bridge (`packages/bridge`)

Het enige kanaal tussen mini-app en shell: `postMessage` met een getypeerde
RPC-laag. De mini-app ziet `window.plein` met o.a. `plein.pay(...)`,
`plein.identity.request(...)`, `plein.storage.get/set(...)`. Elke call wordt
getoetst aan het permissiemodel: eerste gebruik van een permissie toont een
toestemmingsdialoog aan de gebruiker (zoals telefoon-permissies). Weigering
levert een nette, getypeerde error aan de mini-app op — nooit een crash.

### 4. Providers

Bridge-API's zijn interfaces met verwisselbare backends:

- `payments` → **Nixpay-provider** (MVP, Mollie-testmodus)
- `identity` → e-mail/magic-link in de MVP; **EUDI-wallet-provider** als stub/roadmap (eIDAS 2.0)
- `messaging` → **Matrix-provider** (fase 2)
- `notifications` → push via Capacitor (fase 1)

Zo is het funding-verhaal ("composeert bestaande EU-commons") architectonisch
waar zonder dat de MVP erop wacht.

### Datastroom betaling (referentie-demo)

Mini-app roept `plein.pay()` → shell toont permissie-/bevestigingsdialoog →
shell-backend maakt betaling aan via de Nixpay-API → gebruiker rondt af in de
Mollie-checkout → webhook naar shell-backend → shell meldt het resultaat
getypeerd terug aan de mini-app.

## Fasering

### Fase 0 — MVP (doel: werkende demo voor de funding-aanvraag)

- `runtime`: shell-PWA met home-scherm, catalogus (statische JSON),
  permissie-dialogen, NL/EN.
- `bridge`: `window.plein` met drie API's — `identity` (e-mail/magic-link),
  `storage` (key-value per mini-app), `payments` (Nixpay, Mollie-testmodus).
- `sdk`: manifest-schema (JSON Schema), TypeScript-types en een
  `create-plein-app`-scaffolder: een derde moet in vijf minuten een werkende
  mini-app hebben. Dit is voor funders het bewijs dat het een platform is.
- Twee demo-mini-apps in `apps/demo`: een betaal-demo (Nixpay-checkout) en een
  identity+storage-demo (bewust banaal, bijv. boodschappenlijstje — het gaat om
  de bridge).
- Hosting: `plein.sovereignaigrid.nl` als tijdelijke host, `openplein.eu` na
  registratie.

### Fase 1 — Stores

Capacitor-wrap van dezelfde codebase; submissie naar Google Play en App Store
met Nicks bestaande developer-accounts. Bridge-API `notifications` (push) komt
in deze fase.

### Fase 2 — Ecosysteem (grotendeels ná/mét funding)

Matrix-messaging-provider, EUDI-wallet-identity-provider, echte
mini-app-registry met review-proces, developer-documentatiesite op
openplein.eu.

### Expliciet buiten scope

Eigen chat-protocol, eigen betaalinfrastructuur (dat ís Nixpay), tweezijdige
marktplaats met aanbieder-onboarding, native SDK's.

## Funding en governance

- **Route:** NGI Zero Commons Fund (NLnet), rondes elke ~2 maanden,
  €5.000–€50.000, aanvraag van ~2 pagina's in het Engels. Aanvragen ná de MVP,
  mét werkende demo, voor fase 1+2. Horizon Europe is een later consortium-spel
  via bestaande SAIG-partners.
- **Aanvraag als artefact:** de NGI-aanvraag leeft in `docs/funding/` en
  evolueert mee met het project.
- **Governance:** `GOVERNANCE.md` in de repo met open roadmap, contributiebeleid
  en de belofte van migratie naar een stichting bij groei (NLnet vraagt hiernaar).
- **Attributie:** SAIG als initiatiefnemer in footer en funding-verhaal; Nixpay
  als founding payment provider in de docs.

## Testen

- **Unit-tests op de bridge** — de permissielogica is het veiligheidskritieke
  hart en krijgt de hoogste dekking.
- **End-to-end-test**: laadt een demo-mini-app in de sandbox en doorloopt een
  betaling in Mollie-testmodus.
- **CSP/sandbox-escape-checks** als vaste testcategorie: een mini-app die
  buiten zijn iframe of permissies probeert te komen, moet aantoonbaar falen.

## Open punten (bewust buiten dit ontwerp)

- Registratie van `openplein.eu` en aanmaak van de GitHub-org
  `sovereignaigrid` (zichtbaarheid van de repo is een aparte beslissing).
- Concrete invulling van de betaal-demo (welk "doel" of welke voorbeeld-shop).
- Tech-stack-details (framework voor de shell, monorepo-tooling) — keuze in het
  implementatieplan.

## Afwijkingen tijdens implementatie

- CSP niet technisch afgedwongen in fase 0 (listing-eis, geen handhaving in
  dev); wel een CSP-header op `/miniapps/*` in productie.
- Storage-keyformaat is `appId:key` (namespacing per mini-app in dezelfde
  `localStorage`).
- Token-TTL is 24 uur (`DEFAULT_TOKEN_TTL_MS`), niet oneindig geldig.
- `dispose()`/source-check-hardening op de bridge (afgeschermde/verlopen
  message-listeners na het sluiten van een mini-app).
- `INVALID_PARAMS`-foutcode toegevoegd aan de bridge-foutafhandeling.
- Checkout-fallback-banner wanneer een betaalpoging niet automatisch kan
  doorschakelen naar de Mollie-checkout.

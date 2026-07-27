# Governance

## Maintainerschap

OpenPlein wordt onderhouden door **Nixpay B.V.**, onder de vlag van
**Sovereign AI Grid (SAIG)** als initiatiefnemer. Auteursrecht en merk
liggen bij Nixpay B.V.; het project is publiek onder de SAIG-vlag omdat
OpenPlein het burgergerichte gezicht van SAIG is naast het bestaande
B2B/infra-profiel.

## Roadmap

De roadmap is open en leeft in GitHub-issues op deze repo. Fase 0 (deze
MVP: shell, bridge, sdk, twee demo-mini-apps) is voltooid; fase 1 (store-
builds via Capacitor, push-notificaties) en fase 2 (Matrix-provider,
EUDI-wallet-identity, echte mini-app-registry met review-proces) staan
gepland — zie de [design spec](docs/superpowers/specs/2026-07-27-openplein-design.md)
voor de volledige fasering. Prioriteit en planning van issues zijn aan de
maintainer, maar voorstellen en discussie zijn welkom van iedereen.

## Bijdragen

Contributies zijn welkom via pull request, onder het
[Developer Certificate of Origin (DCO)](https://developercertificate.org/):
elke commit bevat een `Signed-off-by`-regel (`git commit -s`) als bevestiging
dat je het recht hebt om de bijdrage onder de projectlicentie in te
brengen. Er is geen aparte CLA nodig.

Kies de licentie van het package dat je aanraakt: AGPL-3.0-only voor
`packages/runtime` en `packages/bridge`, MIT voor `packages/sdk`.

## Besluitvorming

Tot het project structureel groeit in aantal actieve bijdragers beslist de
maintainer (Nixpay B.V. namens SAIG). Voor breaking changes aan het
mini-app-manifest (`packages/sdk/src/schema.json`) of aan de bridge-RPC
(`packages/bridge/src/protocol.ts` en de publieke `window.plein`-API) geldt
een lichte RFC-procedure: open een issue met het label `rfc`, beschrijf de
voorgestelde wijziging en de impact op bestaande mini-apps, en geef
minimaal enkele dagen ruimte voor reactie voordat de maintainer besluit.

## Belofte: stichting bij groei

Zodra het contributor-bestand structureel groeit voorbij de huidige
maintainer-organisatie, migreert de governance van OpenPlein naar een
onafhankelijke stichting, met een bestuur los van Nixpay B.V. Dit is een
harde belofte, geen vage intentie: het is een voorwaarde die relevant is
voor funders (zoals NLnet/NGI Zero) die vragen naar de continuïteit van een
project na de initiële financiering. Tot die migratie plaatsvindt blijft
onderstaande besluitvorming van kracht.

## Gedrag

Wees redelijk en constructief in issues en pull requests. Er is (nog) geen
apart Code of Conduct-document; totdat dat er is, geldt de gangbare
GitHub-community-standaard.

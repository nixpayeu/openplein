# NGI Zero Commons Fund — aanvraagskelet

Dit document is het skelet voor een aanvraag bij het **NGI Zero Commons
Fund** via [NLnet](https://nlnet.nl/commonsfund/), voor de doorontwikkeling
van OpenPlein na de fase 0-MVP (fase 1: stores/Capacitor/notifications;
fase 2: Matrix, EUDI-wallet-identity, mini-app-registry — zie
[`docs/miniapp-spec.md`](../miniapp-spec.md) en de
[design spec](../superpowers/specs/2026-07-27-openplein-design.md)).

NLnet-rondes lopen elke ~2 maanden; de aanvraag zelf is Engelstalig en
ongeveer twee pagina's. De secties hieronder volgen de velden van het
NLnet-aanvraagformulier, elk met een aanzet van 2-3 zinnen om vanuit verder
te schrijven — dit is nog geen ingediende aanvraag. Dien pas in met een
werkende demo (fase 0 is nu klaar: shell, bridge, sdk, twee demo-mini-apps).

---

## Abstract (max. 1200 tekens)

> OpenPlein is an open-source mini-app platform for the EU: a single,
> installable web shell in which European digital services run as
> sandboxed mini-apps, communicating with the shell only through a typed,
> permissioned bridge API. Rather than building its own payment rails or
> messaging protocol, OpenPlein composes existing European building
> blocks — starting with Nixpay for payments, with Matrix (messaging) and
> an EUDI-wallet identity provider planned as swappable providers — so
> that digital sovereignty is architectural, not a slogan. The MVP ships a
> working shell, a bridge with identity/storage/payments, an SDK with a
> manifest schema and a five-minute mini-app scaffolder, and two reference
> mini-apps, all tested end-to-end including sandbox-escape checks.

*(Concept — nog binnen de 1200-tekenlimiet te toetsen bij het invullen van
het echte formulier.)*

## Have you been involved with projects or organisations relevant to this project before?

> [Nixpay B.V. / Sovereign AI Grid track record invullen: eerdere EU-
> gerichte infrastructuur- en betaalprojecten, relevante open-source-
> ervaring, en de rol van Nixpay als eerste (founding) payment provider
> binnen OpenPlein zelf.] Beschrijf hier kort de organisaties achter de
> aanvraag (Nixpay B.V., Sovereign AI Grid) en waarom zij de MVP al
> zelfstandig hebben gebouwd vóór deze aanvraag.

## Requested amount

> [In te vullen: bedrag binnen de NGI Zero Commons Fund-bandbreedte van
> €5.000–€50.000, met een grove breakdown naar de geplande
> werkpakketten.]

| Werkpakket | Indicatie |
|---|---|
| Fase 1 — Capacitor store-builds (Google Play + App Store) | € |
| Fase 1 — `notifications`-provider (push) | € |
| Fase 2 — Matrix-messaging-provider | € |
| Fase 2 — EUDI-wallet-identity-provider (eIDAS 2.0) | € |
| Fase 2 — mini-app-registry met review-proces | € |
| Documentatiesite (openplein.eu) | € |

## Compare your own project with existing or historical efforts

> OpenPlein volgt bewust het "super-app"-model dat elders (WeChat, en meer
> recent verschillende Aziatische en Amerikaanse platforms) heeft bewezen
> dat één container-app met mini-apps een reëel distributiemodel is — maar
> herbouwt dat model soeverein: open source (AGPL-3.0 voor shell/bridge,
> MIT voor de sdk), zonder vendor lock-in, en samengesteld uit bestaande
> EU/open-commons-bouwstenen (Matrix i.p.v. een eigen chat-protocol, een
> EUDI-wallet i.p.v. een eigen identiteitssysteem) in plaats van alles zelf
> te bouwen. [Verder uit te werken: vergelijking met bestaande EU-
> soevereiniteitsinitiatieven en met andere mini-app-platformen.]

## Technisch plan

> De architectuur is al in de MVP bewezen: een strikt getypeerde
> `postMessage`-RPC-bridge (`packages/bridge`) tussen shell en mini-app,
> met een permissiemodel (toestemmingsdialoog bij eerste gebruik,
> persistente beslissing) en een sandbox-iframe zonder
> `allow-same-origin`. Providers achter de bridge-API's zijn bewust
> verwisselbaar (`payments`, `identity`, straks `messaging` en
> `notifications`), zodat Matrix- en EUDI-wallet-providers in fase 2 als
> nieuwe implementaties achter een bestaand contract kunnen landen zonder
> de bridge of bestaande mini-apps te breken. Zie
> [`docs/miniapp-spec.md`](../miniapp-spec.md) voor de volledige
> bridge-API en het permissiemodel zoals die nu al werken.

## Ecosysteem

> Mini-app-bouwers (marketeers, developers, EU-dienstverleners) worden niet
> geraakt door de AGPL van de shell: `packages/sdk` (manifest-schema,
> types, `create-plein-app`-scaffolder) is MIT-gelicentieerd, expliciet om
> de drempel voor derde-partij-mini-apps laag te houden. Nixpay is de
> founding payment provider — niet de enige: het providermodel is er
> juist op gebouwd dat andere Europese aanbieders (betalingen, messaging,
> identiteit) zich kunnen aansluiten. [Verder uit te werken: concrete
> vervolgstappen om andere EU-aanbieders als provider te laten aanhaken,
> en de relatie met het bestaande SAIG-partnernetwerk.]

---

## Status

Aanvraag: **nog niet ingediend.** Fase 0 (MVP) is voltooid; dit skelet
wordt verder ingevuld zodra de eerste aanvraagronde wordt voorbereid. Dit
bestand evolueert mee met het project (zie de governance- en
funding-afspraak in [`GOVERNANCE.md`](../../GOVERNANCE.md) en de
[design spec](../superpowers/specs/2026-07-27-openplein-design.md)).

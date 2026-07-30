# NGI Taler — aanvraag (deadline 1 aug 2026, 12:00 CEST)

**Status: CONCEPT klaar voor het formulier op nlnet.nl/propose (call: NGI TALER).**
Vóór indienen: bedrag bevestigen, contactgegevens invullen, GenAI-vraag met "Yes"
beantwoorden en de provenance uit `genai-provenance.md` meesturen.

---

## Proposal name

OpenPlein × GNU Taler — libre payments in a European mini-app platform

## Website

https://openplein.eu (code: https://github.com/nixpayeu/openplein — live demo:
https://plein.sovereignaigrid.nl)

## Abstract (max. 1200 characters)

OpenPlein is an open-source mini-app platform ("super-app") for the EU: an
installable web shell runs third-party services as sandboxed mini-apps behind
a typed, permissioned bridge API (pay / identity / storage). A working MVP is
publicly deployed: live demo with test-mode payments, a security-hardened
permission bridge, an SDK with a five-minute scaffolder, and end-to-end tests
including sandbox-escape checks. Payments are deliberately a swappable
provider. This project adds GNU Taler as a first-class payment provider:
server-side integration with the Taler merchant backend, a wallet-aware
payment UX in the shell (wallet detection, taler:// handover, cross-device QR,
fail-safe fallbacks that respect the strict sandbox model), a micropayment/
tipping flow for mini-apps, CI-tested against a Taler test exchange, and a
reusable provider specification for other FOSS platforms. Outcome: every
mini-app builder gets privacy-preserving Taler payments with a single API
call (plein.pay), demonstrated in a live public demo — putting libre digital
cash in the consumer-facing distribution layer where citizens actually meet
services.

*(±1090 tekens)*

## Have you been involved with projects or organisations relevant to this project before? (max 2500)

OpenPlein is initiated by Sovereign AI Grid (SAIG), a Dutch consortium for
sovereign European digital infrastructure, and built by Nixpay B.V., a Dutch
payment-orchestration company. Relevant experience:

- The OpenPlein phase-0 MVP was designed, built, tested and publicly deployed
  self-funded, before any funding application: PWA shell, hardened postMessage
  bridge with a fail-closed permission model, SDK (MIT) with manifest schema
  and scaffolder, two reference mini-apps, Playwright end-to-end tests with
  explicit sandbox-escape checks, and a complete payment flow in test mode.
- Nixpay operates EU payment orchestration and built OpenPlein's current
  payment provider (Mollie, test mode) behind the swappable provider
  interface — the exact seam this project fills with GNU Taler. Payment
  lifecycle integration (orders, status, webhooks/polling, refunds) is our
  daily work.
- The maintainer has a multi-year track record of shipping and operating
  open-source deployments and self-hosted European alternatives to US SaaS,
  and publishes OpenPlein under AGPL-3.0 (runtime, bridge) + MIT (SDK).

We know the difference between a payments demo and payments in production —
and deliberately architected OpenPlein so that swapping the rails does not
touch the apps. Adding Taler proves that promise with a libre payment system.

*(±1350 tekens)*

## Requested Amount

€ 40.000

## Explain what the requested budget will be used for (max 2500)

All effort-based at an explicit rate of €100/hour (400 hours total),
milestone/deliverable-based per NLnet's model:

- WP1 — Taler payments provider (120h, €12.000): server-side integration with
  the Taler merchant backend (order creation, payment status, refunds) plus
  the runtime provider implementing OpenPlein's existing typed bridge
  contract; additive error-code extensions only, so shipped mini-apps keep
  working unchanged.
- WP2 — Wallet-aware payment UX in the shell (100h, €10.000): wallet
  detection, taler:// handover, cross-device QR flow, popup-block-safe
  fallbacks inside the sandbox/permission model, NL/EN.
- WP3 — Tests & CI against a Taler test exchange (80h, €8.000): hermetic
  end-to-end suite (local sandcastle/test exchange), updated demo mini-apps
  (checkout + micro-donations) on the public demo.
- WP4 — Micropayment/tipping pattern (60h, €6.000): small-amount UX for
  mini-apps via the same plein.pay contract, aligned with Taler's strengths.
- WP5 — Documentation & upstream (40h, €4.000): provider specification and
  integration guide so other FOSS platforms can reuse the pattern; findings
  reported upstream to the Taler community.

Other funding: none, past or present. The phase-0 MVP was self-funded by
Nixpay B.V. We intend to apply separately in the reopened open call for
non-payment work (app-store builds, Matrix messaging, EUDI-wallet identity);
there is no overlap with this budget. No hardware or travel costs requested.

*(±1500 tekens)*

## Compare your own project with existing or historical efforts (max 4000)

Existing GNU Taler integrations rightly focus on merchant e-commerce
(WooCommerce, Pretix, Joomla) and ongoing P2P work in messengers. OpenPlein
adds a different multiplier: a *platform* integration. One Taler integration
in the shell serves every current and future mini-app on the platform —
builders call plein.pay() and never touch payment code, so each new mini-app
automatically extends Taler's consumer-facing reach.

What is new or different:

1. Platform-level integration instead of per-shop plugins: the integration
   cost is paid once, in the commons, rather than per merchant.
2. A permissioned payment UX: OpenPlein's bridge enforces first-use consent
   dialogs and fail-closed permission gates (a throwing gate denies; a closed
   mini-app cannot receive grants). This consent-first posture matches
   Taler's privacy-preserving design better than conventional PSP checkouts.
3. A demonstrated migration path from proprietary rails to libre payments:
   the platform already runs a Mollie test-mode provider behind the same
   typed contract. Landing Taler as a peer provider proves architecturally
   that European platforms can adopt libre payments without breaking their
   ecosystems — an argument NLnet can reuse beyond this project.
4. The counter-model to existing super-apps: WeChat/Alipay prove the
   container model at scale, but with closed, surveilled payments. OpenPlein
   with GNU Taler is the deliberate antithesis: open runtime (AGPL/MIT),
   sandboxed apps, and anonymous-by-design digital cash.
5. Unlike historical "European app store" attempts, there is no binary
   gatekeeping: a mini-app is a sandboxed static web app plus a manifest —
   an afternoon of work — which is what gives a libre payment rail a
   realistic adoption path with small European builders.

The MVP exists, is public (AGPL-3.0/MIT) and is live; this proposal funds the
payment layer's move from "works with a test PSP" to "works with libre
digital cash", plus the documentation to make the pattern reusable.

*(±2100 tekens)*

## What are significant technical challenges you expect to solve? (max 5000)

1. Contract-preserving provider mapping. OpenPlein's bridge exposes a small,
   typed pay() contract to sandboxed mini-apps. Mapping Taler's richer order
   lifecycle (claimed/paid/refunded, repurchase detection) onto that contract
   without leaking provider-specifics into mini-apps — and extending the
   shared error-code union only additively — is the core design challenge;
   shipped mini-apps must keep working unchanged.
2. Wallet interaction inside a strict sandbox. Mini-apps run in iframes with
   opaque origins and, by design, no direct wallet access: all wallet
   interaction must happen in the shell. That means wallet detection
   (extension / Android app), taler:// URI handover from an installed PWA,
   and a cross-device QR flow when no wallet is present — all without
   weakening the sandbox. We already ship an event-based, popup-block-safe
   fallback for hosted checkouts; taler:// handover has different failure
   modes (no wallet, cancelled handover) that the UX must surface honestly.
3. Hermetic CI against a real exchange. The existing Playwright suite proves
   the full login → permission → payment flow. Extending it to run against a
   local Taler test exchange (sandcastle) reproducibly in CI — no flaky
   external dependencies — so regressions in the payment path are caught
   automatically.
4. Container/app-store constraints. The shell is a PWA, with app-store
   containers (Capacitor) on the roadmap under Apple guideline 4.7, which
   requires the container to handle payments. Making taler:// scheme handling
   work across installed-PWA and container contexts without per-app native
   code is unexplored territory we expect to document for others.
5. Honest money UX. Multi-currency exchanges, fees and refunds must be
   displayed truthfully in a consumer UI that is deliberately simpler than a
   merchant dashboard; the permission dialog must state amounts before the
   wallet handover.

*(±1950 tekens)*

## Describe the ecosystem of the project, and how you will engage with relevant actors (max 2500)

Three rings. Builders: the MIT-licensed SDK, manifest schema and
create-plein-app scaffolder exist to make third-party mini-apps trivial;
with WP5's integration guide, "accept Taler" becomes a copy-paste example in
the scaffolder template. Payment ecosystem: Nixpay is the founding (test)
provider and deliberately not the only one — landing GNU Taler as a peer
provider makes provider plurality real, and we will report integration
findings, friction and API gaps upstream to the Taler community as we go.
Public interest: SAIG's Dutch consortium network, openplein.eu (bilingual
NL/EN) and the live public demo let any stakeholder — municipalities, local
commerce initiatives, EU-facing service providers — experience a
consent-first, Taler-backed payment flow in two minutes without installing
anything. Deployment path to success: the shell is self-hostable (AGPL,
Docker/Caddy deploy documented in-repo), so communities can run their own
Plein with Taler payments; our hosted demo is the reference. Governance:
open roadmap and issues on GitHub, DCO contributions, and a committed
migration to an independent foundation as the contributor base grows
(GOVERNANCE.md).

*(±1200 tekens)*

---

## Formulier-invulhulp (Nick)

- Call: **NGI TALER** · Organisation: Nixpay B.V. · Country: Netherlands
- Requested amount: 40000
- GenAI-vraag: **Yes** → tekstveld + bijlage uit `genai-provenance.md`
- Bijlagen (optioneel): `application-taler-2026.md` als PDF; genai-provenance
- Deadline: **1 augustus 2026, 12:00 CEST** — niet tot het laatste uur wachten

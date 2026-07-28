# NGI Zero Commons Fund — conceptaanvraag (klaar voor het formulier)

**Status: CONCEPT — nog niet ingediend.** Dit zijn de volledige Engelstalige
antwoorden voor het NLnet-aanvraagformulier
([nlnet.nl/propose](https://nlnet.nl/propose/)), opgesteld na afronding van
fase 0. Vóór indienen: bedrag en persoonsgegevens checken, tekenlimieten
verifiëren in het echte formulier, en de demo-URL's live houden.

---

## Project name

OpenPlein

## Website / repository

https://openplein.eu — demo: https://plein.sovereignaigrid.nl — repository:
https://github.com/nixpayeu/openplein *(private tot publicatiebesluit; wordt
publiek vóór indiening — NLnet vereist open source, dus dit is een
voorwaarde voor de aanvraag)*

## Abstract: what is the project about? (max. 1200 characters)

OpenPlein is an open-source mini-app platform for the EU: a single,
installable web shell in which European digital services run as sandboxed
mini-apps, communicating with the shell only through a typed, permissioned
bridge API. Rather than building its own payment rails or messaging
protocol, OpenPlein composes existing European building blocks — starting
with Mollie-based payments, with Matrix (messaging) and an EUDI-wallet
identity provider planned as swappable providers — so that digital
sovereignty is architectural, not a slogan. The working phase-0 MVP ships a
PWA shell, a hardened bridge with identity/storage/payments, an SDK with a
manifest schema and a five-minute mini-app scaffolder, and two reference
mini-apps (including a full test-mode payment flow), all tested end-to-end
including sandbox-escape checks. This grant funds the path from working
demo to usable commons: app-store distribution, Matrix and EUDI-wallet
providers, and an open mini-app registry with technical policy enforcement.

*(±1150 tekens — binnen de limiet.)*

## Have you been involved with projects or organisations relevant to this project before?

OpenPlein is initiated by Sovereign AI Grid (SAIG), a Dutch consortium
focused on sovereign European digital infrastructure, and built by Nixpay
B.V., a Dutch payment-orchestration company. Relevant track record:

- The phase-0 MVP of OpenPlein itself was designed, built, tested and
  publicly deployed **self-funded, before this application** — including a
  security-hardened permission bridge, end-to-end tests with explicit
  sandbox-escape checks, and a live demo with real (test-mode) payments.
- Nixpay operates EU payment orchestration on top of Mollie (a Dutch PSP),
  and acts as OpenPlein's founding payment provider behind the swappable
  provider interface.
- SAIG runs open-source-based products around EU compliance (NIS2
  training and tooling) and publishes its work under open licences; the
  maintainer has a multi-year track record of shipping and maintaining
  open-source forks and self-hosted European alternatives to US SaaS.

## Requested amount

€ 50.000

## Explain what the requested budget will be used for

All amounts are effort-based (indicative rate €100/h, ±500 hours total).
Milestones are deliverable-based, matching NLnet's payment-per-milestone
model:

| # | Work package (deliverable) | Hours | Amount |
|---|---|---|---|
| 1 | App-store distribution: Capacitor builds of the existing PWA, submission to Google Play and Apple App Store (App Store guideline 4.7-compliant container), plus the `notifications` bridge provider (push) | 120 | € 12.000 |
| 2 | Matrix messaging provider behind the existing bridge contract (swappable provider, no changes required in mini-apps) | 100 | € 10.000 |
| 3 | EUDI-wallet identity provider (eIDAS 2.0): integration against the EUDI reference wallet as an alternative to email login | 120 | € 12.000 |
| 4 | Open mini-app registry with review process and technical policy enforcement (per-app CSP, manifest validation service, revocation) | 100 | € 10.000 |
| 5 | Developer documentation site on openplein.eu + third-party onboarding (tutorials, example mini-apps, contribution guide) | 60 | € 6.000 |

The project has no other funding sources; phase 0 was self-funded by
Nixpay B.V. The AGPL-3.0/MIT licensing split (copyleft shell and bridge,
permissive SDK) is deliberate: the commons stays protected while the
barrier for third-party mini-app builders stays minimal.

## Compare your own project with existing or historical efforts

The "super-app" container model is proven at scale by WeChat and Alipay,
but exists today only as closed, non-European platforms with opaque
permission models. On the open side, the W3C MiniApps working group
standardises formats but ships no European runtime; commercial mini-app
runtimes (e.g. FinClip) are proprietary. Matrix widgets offer embedded
apps inside a messenger, but no permissioned payment/identity bridge and
no consumer-facing container. European sovereignty initiatives typically
target infrastructure (cloud, identity) rather than the *distribution
layer* where citizens actually meet services. OpenPlein fills exactly that
gap: a thin, open, audited runtime that composes the existing European
commons (Mollie/PSPs today; Matrix and the EUDI wallet as funded
deliverables) instead of competing with them. Unlike historical "European
app store" attempts, OpenPlein does not gatekeep binaries: mini-apps are
plain sandboxed web apps plus a manifest, so the switching cost for
builders is a single afternoon — which is the property that gives an open
alternative a realistic adoption path.

## What are significant technical challenges you expect to solve?

1. **Store-compliant containerisation** — keeping one PWA codebase that is
   simultaneously installable on the open web and acceptable under Apple's
   guideline 4.7 for HTML5 mini-app containers (login and payments handled
   by the container, no native code in mini-apps).
2. **Provider swappability without protocol breakage** — landing Matrix and
   EUDI-wallet providers behind the existing typed bridge contract so that
   already-shipped mini-apps keep working unchanged; the bridge's
   permission model (first-use consent, fail-closed gates) must extend to
   messaging and wallet-grade identity without weakening.
3. **Technical policy enforcement for an open registry** — moving the
   "mini-apps only talk to their own origin" rule from a listing policy to
   enforced per-app CSP and manifest validation, with revocation, while
   keeping the opaque-origin sandbox model intact.
4. **EUDI-wallet integration ahead of ecosystem maturity** — integrating
   against the eIDAS 2.0 reference implementation while it is still
   moving, isolated behind a provider interface so churn does not leak
   into the platform.

## Describe the ecosystem of the project, and how you will engage with relevant actors

The ecosystem has three rings. **Builders**: the MIT-licensed SDK,
manifest schema and `create-plein-app` scaffolder exist precisely to make
third-party mini-apps trivial; WP5 funds the documentation and onboarding
to activate this. **Providers**: the swappable provider model is an open
invitation to other European payment, identity and messaging providers —
Nixpay is the founding payment provider, deliberately not the only
possible one. **Standards and commons**: we will track the W3C MiniApps
work and the EUDI reference wallet, contribute findings upstream
(especially on the permission bridge, where we believe our fail-closed
model is ahead of current mini-app practice), and publish the registry
policy work openly so other runtimes can reuse it. Outreach runs through
the existing SAIG consortium and partner network in the Netherlands,
the openplein.eu site (live, bilingual NL/EN), and the public demo, which
lets any stakeholder experience the permission model first-hand in two
minutes. Governance: open roadmap, DCO contributions, and a committed
migration to an independent foundation as the contributor base grows
(see GOVERNANCE.md).

---

## Checklist vóór indienen (Nick)

- [ ] Repo `nixpayeu/openplein` publiek maken (NLnet-voorwaarde) + LICENSE-links checken
- [ ] Bedrag bevestigen of aanpassen (nu: € 50.000, het maximum van de band)
- [ ] Contactgegevens/entiteit in het formulier: Nixpay B.V. (KvK 96292148)
- [ ] Demo en openplein.eu live checken op de dag van indienen
- [ ] Abstract in het formulier plakken en tekenlimiet verifiëren

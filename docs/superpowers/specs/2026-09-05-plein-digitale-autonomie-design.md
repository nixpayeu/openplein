# Plein voor Digitale Autonomie: white-label als verdienmodel

**Datum:** 2026-09-05
**Auteur:** Nick Aldewereld
**Status:** goedgekeurd ontwerp, klaar voor implementatieplan

## Aanleiding

Het ontwerp van 2026-07-27 beschrijft wat OpenPlein is en hoe het gebouwd
wordt. Het beschrijft niet hoe het geld verdient. Dat gat is de aanleiding
voor dit document.

De gekozen richting is **white-label**: OpenPlein wordt verkocht aan
organisaties die al publiek bezitten, in plaats van zelf publiek te
werven. Dat omzeilt de tweezijdige koude start waar het WeChat-model aan
lijdt zodra je hem zonder bestaand monopolie-oppervlak naspeelt. WeChat
kreeg mini-apps pas nadat het berichten bezat, Alipay pas nadat het
betalingen bezat. OpenPlein bezit geen van beide, dus komt het publiek van
de klant.

De eerste klant is **digitaleautonomie.org**, een vereniging in
oprichting die zich richt op particulieren, zzp'ers en kleine
organisaties, en die grote bedrijven en overheden expliciet uitsluit. Hun
leden zijn mensen die van Big Tech af willen en daarbij vastlopen. Dat is
letterlijk signaal 001 uit [`../../marktbehoefte.md`](../../marktbehoefte.md).

De afspraak is een **ruil, geen factuur**: zij krijgen het plein, Nick
krijgt bereik, een echte gebruikersgroep en het recht ze als referentie te
noemen. Zie "Commerciële afspraak" onderaan, want zonder einddatum en
zonder prijs-daarna zet een ruildeal het anker voor elke volgende klant op
nul.

## Kernbeslissingen

| Beslissing | Keuze |
|---|---|
| Verdienmodel | White-label: verkoop aan organisaties die al publiek hebben. Inrichting plus onderhoud, niet een percentage per transactie |
| Eerste klant | digitaleautonomie.org, als lanceerklant in ruil, met einddatum |
| Scharnier van het product | Het lidmaatschap is de inlog. Het bestuur krijgt het ledenregister als bijproduct, het lid krijgt toegang tot Google-vrij gereedschap |
| Tenantmodel | 1 installatie per tenant, geen gedeelde instantie met meerdere verenigingen |
| Betaalprovider | Mollie eerst, achter het bestaande providercontract. Nixpay erachter zodra beschikbaar |
| Eerste mini-app van derden | Datumprikker, omdat dat het concrete gat is dat signaal 001 beschrijft |
| Privacybelofte | Afdwingbaar in de bridge, niet alleen in tekst: een mini-app krijgt geen e-mailadres |
| Buiten scope | Matrix, EUDI-wallet, Capacitor store-builds |

## Correcties op de bestaande documentatie

Twee dingen die tijdens het ontwerpen naar boven kwamen en die eerst recht
gezet moeten worden, omdat ze anders in dit ontwerp doorwerken:

1. **Er zit geen Nixpay in de code.** De betaalprovider is Mollie, in
   testmodus (`apps/demo/server/src/app.ts:115`). De README stelt "Nixpay
   for payments today". Dat is een claim zonder dekking. Contributie
   innen via Nixpay is nieuw werk.
2. **`identity` geeft nu het e-mailadres weg.**
   `packages/runtime/src/providers/identity.ts` retourneert `{ email }`
   aan iedere mini-app met de `identity`-permissie. De privacybelofte van
   dit ontwerp is dus geen toevoeging maar een correctie, en een breaking
   change op het bridge-contract.

## Wat white-label nodig heeft dat er nog niet is

De runtime is nu vastgeklonken aan de SAIG-huisstijl en aan één
`packages/runtime/public/catalog.json`. Zolang dat zo is, is elke tweede
klant een fork, en een fork is geen product.

Daarom is de **tenantlaag** het zwaartepunt van dit ontwerp. Gegeven een
hostnaam levert die de huisstijl, de catalogus en de aan/uit-schakelaars.
Dat is het onderdeel dat de tweede verkoop een kopie maakt.

**1 installatie per tenant.** Er draait al Docker met Caddy, dus een
tweede container is goedkoop. Daarmee vervalt het hele vraagstuk van
datascheiding tussen verenigingen: er is geen gedeelde database, dus er is
geen lek tussen tenants mogelijk. Dat is bewust de saaie keuze. Een
gedeelde instantie met tenant-scoping levert bij deze aantallen niets op
en introduceert een klasse fouten die je bij een onbetaalde lanceerklant
niet wilt betalen.

## Onderdelen en hun grenzen

Elk onderdeel heeft één taak en is los te begrijpen en te testen.

### `packages/tenant` (nieuw)

Laadt bij het opstarten één tenantconfiguratie uit een bestand waarvan het
pad in de omgeving staat, en valideert die tegen een schema zoals het
manifest-schema in de sdk dat al doet. De configuratie bevat naam,
huisstijl (logo, kleuren, lettertype), catalogus, de verwachte hostnaam en
de ingeschakelde functies. Geen UI, geen authenticatie, geen
databasetoegang.

De hostnaam staat erin als controle, niet als sleutel: omdat er per tenant
één installatie draait, is er niets op te zoeken. De check vangt de fout
waarbij de verkeerde configuratie aan de verkeerde container hangt.

Afhankelijkheden: geen, behalve het schemavalidatie-hulpmiddel dat de sdk
ook gebruikt.

### `packages/runtime` (aanpassen)

Leest de tenantconfiguratie in plaats van hardcoded huisstijl en
catalogus. De rest van de shell verandert niet. De SAIG-huisstijl wordt
één tenantconfiguratie tussen andere, niet langer de ingebakken standaard.

### Ledenmodule (server)

Ledenrecord: id, e-mailadres, weergavenaam, status, datum van aanmelding.
Statussen: `aangemeld`, `lid`, `opgezegd`. Bestuurslijst met zoeken en
export naar CSV. Weet niets van betalen: de contributiemodule zet de
status, de ledenmodule bewaart hem.

### Contributiemodule (server)

Abonnementsverloop: aanmaken, webhook verwerken, opzeggen. Praat met de
betaalprovider achter het bestaande providercontract. Kent van een lid
alleen het id, nooit het e-mailadres of de naam. Zet de ledenstatus via
de ledenmodule, schrijft niet rechtstreeks in ledendata.

### `miniapps/datumprikker` (nieuw)

Losse mini-app, gebouwd met `create-plein-app` uit de MIT-sdk, precies
zoals een derde partij dat zou doen. Gebruikt alleen `identity` en
`storage` uit de bridge. Dit is tegelijk de test of de sdk werkelijk
bruikbaar is voor buitenstaanders: als het bouwen hiervan schuurt, schuurt
het voor iedere externe bouwer.

## Het handvest, afdwingbaar in plaats van beloofd

Dit is het onderdeel dat de vereniging koopt en dat Apple structureel niet
kan kopiëren. Uit signaal 002: Apple's prijs voor het toestaan van een
super-app is niet het geld maar de verplichte betaalrail. OpenPlein legt
het omgekeerde vast.

### In de bridge

De `identity`-permissie levert voortaan `{ subject, displayName }`. De
`subject` is **pseudoniem en per mini-app verschillend**, afgeleid van het
lid-id en het mini-app-id. Twee mini-apps kunnen daardoor niet vaststellen
dat ze met hetzelfde lid te maken hebben.

Voor het e-mailadres komt een aparte permissie in `PERMISSIONS`
(`packages/sdk/src/manifest.ts:5`), met een eigen toestemmingsdialoog. Een
mini-app die dat niet aanvraagt, krijgt het nooit.

Dit is een breaking change op `@openplein/bridge` en `@openplein/sdk`. De
bestaande demo-mini-apps moeten mee.

### Op papier

Een publiek `HANDVEST.md` in de repo en op de site: geen advertenties,
geen datahandel, geen verplichte betaalrail, transparante tarieven. Voor
digitaleautonomie.org is dit geen marketing maar een inkoopeis, want zij
sluiten in hun eigen positionering grote bedrijven expliciet uit.

## Datastromen

1. Bezoeker opent het plein op de hostnaam van de vereniging. De
   tenantlaag levert huisstijl en catalogus.
2. "Word lid" start de bestaande magic-link-inlog. Er ontstaat een
   ledenrecord met status `aangemeld`.
3. De contributiemodule maakt een abonnement bij de betaalprovider. Bij
   een geslaagde webhook gaat de status naar `lid`.
4. Een lid opent een mini-app. De bridge geeft `subject` en
   `displayName`, niet het e-mailadres. De mini-app bewaart eigen gegevens
   via `storage`, gescheiden per mini-app zoals nu al het geval is.

## Foutafhandeling

- **Idempotentie.** De contributie-webhook moet idempotent zijn op het
  betaal-id van de provider. Een tweede aflevering van dezelfde
  gebeurtenis mag geen tweede statuswijziging of tweede factuur opleveren.
- **Webhook-secret.** De server weigert te starten als het webhook-secret
  ontbreekt, op dezelfde manier waarop een lege `AUTH_SECRET` nu al
  geweigerd wordt. Zonder verificatie kan een lid betalen zonder lid te
  worden.
- **Betaling zonder afronding.** Een lid dat wel betaalt maar bij wie de
  webhook uitblijft, moet zichtbaar zijn voor het bestuur: een lijst van
  aanmeldingen met een openstaande betaling ouder dan 24 uur.
- **Verkeerde of ontbrekende tenantconfiguratie.** Ontbreekt het bestand,
  is het ongeldig, of komt de hostnaam erin niet overeen met waarop de
  installatie draait, dan stopt de server bij het opstarten met een
  duidelijke fout. Geen half geladen shell met de huisstijl van de
  verkeerde vereniging.

## Testen

Bovenop de bestaande vitest-workspace en de e2e-suite met
sandbox-ontsnappingscontroles:

- Tenantresolutie: bekende hostnaam levert de juiste configuratie, een
  onbekende faalt hard.
- Ledenlevensloop: `aangemeld` naar `lid` naar `opgezegd`, en de
  ongeldige overgangen.
- Idempotentie: dezelfde webhook tweemaal aangeboden levert één
  statuswijziging op.
- **E2e-privacytest:** een mini-app met alleen de `identity`-permissie kan
  het e-mailadres van het lid niet lezen, en twee mini-apps krijgen voor
  hetzelfde lid verschillende `subject`-waarden. Dit is het bewijs onder
  het handvest en hoort dus in de testsuite, niet in een tekst.

## Buiten scope

- Matrix en de EUDI-wallet blijven fase 2.
- Capacitor store-builds blijven eruit. Volgens signaal 002 introduceren
  die de IAP-plicht van Apple, en dat is precies wat het handvest
  probeert te vermijden. Als ze later toch komen, is dat een aparte
  beslissing met een eigen ontwerp.
- Een mini-app-registry met reviewproces. De catalogus is voorlopig een
  bestand per tenant.

## Commerciële afspraak

De ruil wordt op papier gezet vóór de eerste regel code, met drie dingen
erin:

1. Wat de vereniging krijgt en wat Nick terugkrijgt: naamsvermelding als
   referentie, en toestemming om gebruikscijfers geanonimiseerd te
   gebruiken in aanvragen en verkoopgesprekken.
2. Een **einddatum** van de ruilperiode.
3. De **prijs die daarna geldt**, uitgesplitst naar inrichting en
   maandelijks onderhoud. Dit getal moet in de afspraak staan ook al gaat
   het pas later in, anders begint elk volgend verkoopgesprek bij nul.

## Open punten

Dit zijn beslissingen met een eigenaar, geen open eindjes in het ontwerp.

- **Prijs na de ruilperiode.** Nick bepaalt. Nodig vóór de afspraak
  getekend wordt.
- **Gesprek met Tim.** De aanname dat deze vereniging ledenadministratie
  en contributie-inning nodig heeft is logisch voor een vereniging in
  oprichting, maar niet geverifieerd. Toetsen vóór de contributiemodule
  gebouwd wordt. De tenantlaag en de bridge-wijziging zijn niet van dit
  antwoord afhankelijk en kunnen eerder.
- **Gereedheid van Nixpay.** Bepaalt alleen wanneer de tweede
  provider-implementatie zin heeft, niet of dit ontwerp doorgaat.

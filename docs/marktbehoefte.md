# Marktbehoefte OpenPlein

Dossier van vindplaatsen die laten zien dat er vraag is naar een soeverein,
open distributiekanaal voor Europese diensten. Bedoeld als onderbouwing
onder de funding-aanvragen (zie [`funding/`](funding/)) en onder de
positionering op openplein.eu.

Per signaal leggen we vier dingen vast: **wat het is**, **wat het aantoont**,
**wat het niet aantoont**, en **wat het voor OpenPlein betekent**. Die derde
regel is niet optioneel. Een signaal zonder grens is een claim, geen bewijs.

Nummering loopt door; oudste bovenaan, zodat de redenering leesbaar blijft.
Cijfers in dit dossier hebben een houdbaarheidsdatum: de tarieven en regels
van Apple en Google zijn in 2025 en 2026 meermaals gewijzigd onder druk van
de DMA en van rechtszaken. Bij elk getal staat de peildatum.

---

## 001: Gepensioneerd ontwikkelaar kan zijn eigen app niet meer op zijn eigen telefoon zetten

**Datum signaal:** 4 september 2026
**Type:** publieke uiting, individueel, NL
**Bron:** LinkedIn-bijdrage van Jan van Veldhuizen ("Retired, but not
disconnected"), gedeeld met de campagnepagina
[keepandroidopen.org/nl](https://keepandroidopen.org/nl/)

### Wat het is

Van Veldhuizen schrijft dat hij Android koos omdat het open source is, en
zo af en toe voor zichzelf een appje bouwt en op zijn eigen toestel zet.
Onder Google's nieuwe regels moet iedere Android-ontwikkelaar zich centraal
registreren, betalen en een identiteitsbewijs uploaden, anders wordt de app
geblokkeerd. Niet alleen in de Play Store, maar op het toestel zelf, ook
voor code die hij voor zichzelf schrijft.

Zijn formulering van de kern:

> "Google noemt dat veiligheid. Ik noem het een slot op een deur die ik zelf
> heb betaald en waarvan Google de sleutel heeft."

Hij beschrijft daarnaast een lopend "ontgoogel"-traject: laptop lukt,
telefoon is halverwege, de AndroidTV van KPN is nog onbekend terrein. De
blokkade die hij noemt is concreet en alledaags: Datumprikker installeren
lukt niet meer.

### Wat het aantoont

1. De weerstand tegen platformpoortwachters zit niet alleen bij
   privacy-activisten of bij bedrijven met een compliance-afdeling. Hier is
   het 1 gepensioneerde die het zelf merkt aan zijn eigen toestel.
2. Het bezwaar wordt geformuleerd in eigendomstaal, niet in privacytaal.
   "Mijn telefoon is van mij" is een sterker en breder frame dan
   "dataminimalisatie", en het is het frame dat OpenPlein al voert
   (soevereiniteit als architectuur, niet als leus).
3. Er is een collectieve kant: 71 organisaties uit 23 landen tekenden de
   open brief tegen de maatregel, met F-Droid, EFF, Software Freedom
   Conservancy en de FSF erbij. De campagne meldt daarnaast meer dan
   100.000 handtekeningen onder de publieke petitie.
4. Het praktische gat is meetbaar: wie ontgoogelt, verliest gewone
   Nederlandse diensten. Datumprikker is geen niche-app.

### Wat het niet aantoont

- Dit is 1 publieke uiting van 1 persoon, geen steekproef. Er staat hier
  geen marktomvang onder.
- Het aantal handtekeningen komt uit de campagne zelf en uit persberichtgeving,
  niet uit een onafhankelijke telling. Het getal van 71 organisaties staat
  wel op de campagnepagina zelf.
- "Vanaf volgend jaar" in de bijdrage is een versimpeling. De handhaving
  begint op 30 september 2026 in Brazilië, Indonesië, Singapore en Thailand;
  de bredere uitrol staat voor 2027. Voor Nederland is het dus 2027, niet nu.
- Het signaal toont vraag naar *een uitweg*, niet vraag naar *deze* uitweg.
  Niemand in dit signaal vraagt om een mini-app-platform.

### Tegenbewijs: Google's eigen aankondiging (18 juni 2026, bijgewerkt 15 juli 2026)

Google's blogpost "Android developer verification: Building a safer
ecosystem together" haalt de scherpste rand van dit signaal af. Dat hoort
hier te staan, ook al is het ongunstig voor het verhaal.

Wat Google aankondigt en wat het met signaal 001 doet:

- **Limited distribution accounts** (early access juli 2026, wereldwijd
  augustus 2026) zijn er expliciet voor "students, hobbyists, and
  learners" en laten je delen met **maximaal 20 toestellen, zonder
  overheids-ID en zonder kosten**. Precies de casus van Van Veldhuizen.
  Zijn zin "daarvoor moet je dan betalen, en je identiteitsbewijs
  uploaden" klopt dus niet meer voor zijn eigen situatie.
- Er komt een **advanced flow** (augustus 2026) om apps van
  niet-geverifieerde ontwikkelaars te blijven installeren, met
  veiligheidsdrempels tegen afpersingsoplichting. Sideloaden via `adb`
  blijft ook na 30 september 2026 mogelijk.
- De registratieplicht is dus geen absoluut slot, maar een drempel met
  uitzonderingen.

Wat er ondanks die nuance overeind blijft, en wat het signaal juist
versterkt:

- Ook een limited distribution account is nog steeds **registratie bij
  Google**, met een plafond van 20 toestellen. De eigendomsvraag ("wie
  heeft de sleutel van mijn toestel") wordt niet beantwoord, alleen
  goedkoper gemaakt.
- De maatregel is **niet Google Play alleen**. De eerste fase draait via
  zeven stores tegelijk: Google Play, HONOR App Market, OPPO App Market,
  Galaxy Store, Palm Store, V-Appstore en GetApps. Het gaat om *certified
  Android devices*, niet om 1 winkel. Dat is breder dan de LinkedIn-post
  suggereert en breder dan wij zelf eerst aannamen.
- Google installeert vanaf juni 2026 een **system service op de meeste
  toestellen** die later dit jaar de registratie gaat verifiëren. De
  handhaving zit dus in het besturingssysteem, niet in de winkel.

Conclusie voor het dossier: de emotionele lading van 001 is deels
gecorrigeerd, de structurele lading is groter geworden. We moeten de
"betalen en ID uploaden"-formulering **niet** overnemen in eigen teksten,
want die is voor hobbyisten achterhaald. De formulering die wel houdt is:
installatie op je eigen toestel loopt vanaf 2027 via een register dat 1
partij beheert.

### Wat het voor OpenPlein betekent

Het bevestigt de these onder het project: distributie is de flessenhals van
Europese digitale diensten, en die flessenhals wordt strakker in plaats van
ruimer. Een installeerbare PWA-shell met gesandboxte mini-apps zit per
constructie buiten de APK-poort: mini-apps worden niet gesigneerd,
geregistreerd of geblokkeerd door Google, want het zijn geen APK's. Wat
Google hier dichtzet, is precies wat OpenPlein openhoudt.

Met 1 eerlijke kanttekening die we niet moeten wegpoetsen: fase 1 op de
roadmap bevat Capacitor-builds voor Google Play en de App Store (zie
[`funding/README.md`](funding/README.md)). Die builds vallen wél onder
dezelfde verificatieplicht. De web-shell is de soevereine route, de
store-builds zijn een gemaksroute die aan de poortwachter gebonden blijft.
Dat onderscheid hoort expliciet in de aanvraagtekst en op de site, anders
verkopen we een belofte die de eigen roadmap tegenspreekt.

Concrete vervolgacties:

- [ ] Het "mijn telefoon is van mij"-frame verwerken in de positionering op
      openplein.eu, in eigen woorden en met bronvermelding naar de campagne.
- [ ] In `funding/application-2026.md` bij "Compare your own project" de
      developer-verification-maatregel opnemen als aanleiding, met de
      juiste datums (30-09-2026 pilot, 2027 breed).
- [ ] Uitzoeken of Datumprikker en vergelijkbare NL-diensten als mini-app
      te bouwen zijn. Dat is de directe test of het gat dat dit signaal
      beschrijft ook echt door OpenPlein gedicht wordt.

### Bronnen

- Campagne en open brief: <https://keepandroidopen.org/nl/>
- Achtergrond bij de uitrol en de coalitie van 71 organisaties uit 23
  landen: <https://en.wikipedia.org/wiki/Keep_Android_Open>
- Google's eigen aankondiging met de tijdlijn, de zeven stores en de
  limited distribution accounts: "Android developer verification: Building
  a safer ecosystem together", Android Developers Blog, 18 juni 2026
  (bijgewerkt 15 juli 2026)

---

## 002: De kosten van distributie via de winkels, peildatum 5 september 2026

**Type:** marktstructuur, geverifieerd tegen primaire aankondigingen
**Relevantie:** dit is het commerciële argument onder OpenPlein, naast het
soevereiniteitsargument uit 001

### Wat het is

De "30% appstore-heffing" is als vast getal niet meer waar. Onder druk van
de DMA en van de Epic-zaken is het een gelaagd stelsel geworden. De stand
per 5 september 2026:

**Apple, EU (nieuwe voorwaarden per 1 oktober 2026, akkoord met de
Europese Commissie aangekondigd 18 augustus 2026):**

| Situatie | Tarief |
|---|---|
| App Store met Apple In-App Purchase, standaard | 26% (was 30%) |
| Small Business Program, abonnementen na jaar 1, Mini Apps Partner Program | 15% |
| Diezelfde programma's met alternatieve betaalverwerking | 10% |
| Distributie via alternatieve marktplaats of het web | 5% Core Technology Commission |

De Core Technology Fee van € 0,50 per install boven 1 miljoen downloads
per 12 maanden verdwijnt en wordt vervangen door die 5%. Dat is een reële
verbetering: de oude CTF liep op ook als een app niets opbracht.

**Google Play (peildatum 30 juni 2026):** alternatieve betaalmethoden en
externe links zijn toegestaan in de VS, het VK en de EER. De service fee
begint bij 10% over de eerste $ 1 miljoen jaaromzet. Sinds 22 juli 2026
moet Google ook concurrerende appstores binnen Play toelaten, als gevolg
van het permanente bevel uit Epic v. Google.

**Apple Mini Apps Partner Program (aangekondigd november 2025).** Dit is
voor OpenPlein het belangrijkste onderdeel van 002. Apple heeft een
expliciete regeling voor precies ons model: mini-apps in HTML5/JS binnen
1 native host-app. Commissie op in-app-aankopen in mini-apps van derden:
15% in plaats van 30%. De voorwaarden zijn de prijs: verplicht StoreKit
IAP, de Advanced Commerce API, de Declared Age Range API, gestructureerde
mini-app-manifests, refund consumption reporting, en beschikbaarheid op
zowel iOS als iPadOS.

### Wat het aantoont

1. De poortwachters onderkennen het super-app-model en hebben er een prijs
   voor gezet. Het model is dus commercieel serieus genomen door de
   partijen die er het meeste zicht op hebben.
2. Er is een structureel kostenverschil tussen de web-route en de
   store-route. Distributie via het web kost bij Apple 5% of niets,
   distributie via de App Store kost 15% tot 26%.
3. De regels bewegen richting meer keuze, maar via regelgeving en
   rechtszaken, niet uit zichzelf. Elke verworven vrijheid hangt aan een
   juridisch besluit dat teruggedraaid kan worden.

### Wat het niet aantoont

- De tarieven bewegen te snel om als vast argument te dienen. Alleen al in
  2026 zijn de EU-voorwaarden van Apple en het Play-beleid van Google
  ingrijpend gewijzigd. Elk percentage in een aanvraagtekst heeft een
  peildatum nodig.
- 26% is niet 30%. Wie in 2026 nog "de 30%-heffing van Apple" schrijft,
  is aanvechtbaar en verliest daarmee het punt.
- De 15% uit het Mini Apps Partner Program is geen kostennadeel ten
  opzichte van 30%, het is een korting. Het nadeel zit in de voorwaarde,
  niet in het tarief.

### Wat het voor OpenPlein betekent

Het scherpste inzicht: **Apple's prijs voor het toestaan van een super-app
is niet het geld, maar de betaalrail.** Het Mini Apps Partner Program
vereist StoreKit IAP. In een native iOS-host-app kan Nixpay dus niet de
betaalprovider zijn voor digitale goederen in mini-apps van derden. Dat
raakt de kern van het projectverhaal, waarin Nixpay founding payment
provider is.

Twee dingen begrenzen dat weer, en die horen er eerlijk bij:

- Apple's IAP-plicht geldt voor digitale goederen en diensten. Fysieke
  goederen en diensten in de echte wereld mogen buiten IAP om betaald
  worden. Voor een deel van de Europese diensten die wij voor ogen hebben
  is de IAP-plicht dus niet van toepassing.
- In de web-route speelt dit hele blok niet. Daar is de commissie 0.

Dat maakt de strategische keuze concreet in plaats van ideologisch: de
web-shell is niet alleen de soevereine route, het is ook de enige route
waarin het providermodel van OpenPlein onaangetast blijft. De
Capacitor-builds uit fase 1 leveren vindbaarheid en installatiegemak op,
en kosten daarvoor de vrijheid in de betaallaag.

### Openstaande acties

- [ ] In `funding/README.md` bij het werkpakket "Capacitor store-builds"
      noteren dat dit een IAP-afhankelijkheid introduceert, met verwijzing
      naar dit signaal.
- [ ] Toetsen welk deel van de beoogde mini-app-catalogus digitale
      goederen verkoopt en welk deel fysiek of echte-wereld is. Dat
      bepaalt hoe zwaar de IAP-plicht werkelijk weegt.
- [ ] De exacte voorwaarden van het Mini Apps Partner Program nalezen bij
      Apple zelf. Dit signaal leunt nu op secundaire verslaggeving.

### Bronnen

- Apple over de EU-wijzigingen per 1 oktober 2026:
  <https://www.apple.com/newsroom/2026/08/apple-announces-changes-for-apps-in-the-european-union/>
- Kritische lezing van datzelfde akkoord (Apple geeft weinig weg):
  <https://daringfireball.net/2026/08/apple_eu_business_terms_conceding_little>
- Mini Apps Partner Program, technische uitleg:
  <https://www.revenuecat.com/blog/engineering/apple-mini-apps-partner-program>
- Google Play-beleid voor de VS na de Epic-uitspraak:
  <https://support.google.com/googleplay/android-developer/answer/15582165>
- Concurrerende appstores binnen Play vanaf 22 juli 2026:
  <https://www.macrumors.com/2026/07/15/google-third-party-app-stores/>

---

## 003: Op iOS is de web-route wel gratis, maar niet vrij

**Type:** technische randvoorwaarde, peildatum 5 september 2026
**Relevantie:** dit is het tegenwicht bij de conclusie van 002

### Wat het is

De redenering "dan gaan we toch via het web" is op Android sterk en op iOS
zwak. Apple bepaalt wat een web-app op iOS kan:

- Alle browsers op iOS draaien verplicht op WebKit. De DMA verplicht Apple
  sinds 2024 om alternatieve engines toe te laten via BrowserEngineKit,
  maar de voorwaarden zijn zo bewerkelijk dat begin 2026 nog **geen enkele
  browserleverancier** een eigen engine op iOS heeft uitgebracht. Wat een
  PWA kan, blijft dus een beslissing van Apple.
- Safari implementeert `beforeinstallprompt` niet. Er is geen
  installatieknop met 1 tik: iedere installatie op iOS loopt via
  handmatig "Zet op beginscherm".
- Push-notificaties werken alleen voor web-apps die al op het beginscherm
  staan (iOS 16.4 en later). Een web-app in een tabblad krijgt geen push,
  ook niet met toestemming van de gebruiker.

Nuance die we niet mogen overslaan, omdat er veel verouderde berichtgeving
over rondgaat: Apple kondigde in februari 2024 aan Home Screen web apps in
de EU te schrappen, en heeft dat op 1 maart 2024 **teruggedraaid**. PWA's
werken in de EU gewoon. Bronnen die het tegendeel beweren, ook recente,
herhalen een aankondiging die nooit is doorgevoerd.

### Wat het aantoont

1. Het kostenvoordeel van de web-route op iOS is echt, het
   capaciteitsverschil ook.
2. De grootste rem is niet techniek maar installatiewrijving. "Deel, dan
   Zet op beginscherm" is voor een gewone gebruiker een andere handeling
   dan op een knop drukken.

### Wat het niet aantoont

- Dit zegt niets over Android, waar PWA-installatie en push wel gewoon
  werken.
- Dit is een momentopname. Zowel de DMA-handhaving als de Strategic Market
  Status die de Britse CMA in oktober 2025 aan Apple toekende kunnen dit
  binnen een jaar veranderen.

### Wat het voor OpenPlein betekent

De installatiewrijving op iOS is een productrisico dat in de MVP-cijfers
zichtbaar hoort te worden, niet een voetnoot. Concreet: de shell heeft een
iOS-specifieke onboarding nodig die de "Zet op beginscherm"-stap uitlegt,
en we moeten meten hoeveel bezoekers die stap halen. Zonder dat getal is
elke uitspraak over de haalbaarheid van de web-route op iOS een aanname.

### Openstaande acties

- [ ] iOS-onboardingscherm in `packages/runtime` dat de handmatige
      installatiestap toont, en meting van de voltooiing daarvan via de
      bestaande Umami-opzet.
- [ ] Vaststellen wat de shell zonder push moet kunnen op iOS, zodat
      afwezigheid van push geen blokkerende afhankelijkheid wordt.

### Bronnen

- Apple's herroeping van het schrappen van Home Screen web apps in de EU,
  1 maart 2024: <https://techcrunch.com/2024/03/01/apple-reverses-decision-about-blocking-web-apps-on-iphones-in-the-eu/>
- Stand van de browser-engine-verplichting onder de DMA:
  <https://open-web-advocacy.org/blog/apples-browser-engine-ban-persists-even-under-the-dma/>

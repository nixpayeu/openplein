# Marktbehoefte OpenPlein

Dossier van vindplaatsen die laten zien dat er vraag is naar een soeverein,
open distributiekanaal voor Europese diensten. Bedoeld als onderbouwing
onder de funding-aanvragen (zie [`funding/`](funding/)) en onder de
positionering op openplein.eu.

Per signaal leggen we vier dingen vast: **wat het is**, **wat het aantoont**,
**wat het niet aantoont**, en **wat het voor OpenPlein betekent**. Die derde
regel is niet optioneel. Een signaal zonder grens is een claim, geen bewijs.

Nummering loopt door; nieuwste bovenaan.

---

## 001 — Gepensioneerd ontwikkelaar kan zijn eigen app niet meer op zijn eigen telefoon zetten

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

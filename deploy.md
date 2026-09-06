# Deploy: plein.sovereignaigrid.nl

> **Rsync-valkuil:** combineer `--delete` altijd met `--exclude .env`, anders
> wist rsync de server-side `.env` (die staat bewust niet in git):
> `rsync -az --delete --exclude .env --exclude node_modules --exclude .git ./ nextcloud-vps:/opt/docker/openplein/`
> De demo draait publiek met `DEMO_SHOW_CODE=1` (inlogcode op het scherm, geen
> SMTP) — alleen combineren met een Mollie-TESTkey, nooit live.

Deploy-runbook voor OpenPlein op de bestaande Hostinger-VPS
(`88.222.220.64`, Docker + Caddy, zie `nextcloud-vps` ssh-alias). Volgt het
bestaande patroon: één docker-compose-service per project onder
`/opt/docker/<naam>/`, reverse-proxy via de gedeelde Caddy-instantie op
`/opt/docker/core/caddy/`.

## Preconditions (blokkerend, eigenaar-actie)

Deze twee stappen liggen buiten deze taak en moeten vóór deploy geregeld
zijn:

1. **Repo-zichtbaarheid/bereikbaarheid.** De VPS moet de repo kunnen
   ophalen (`git clone`/`git pull` of `rsync` vanaf een checkout). Zolang
   de GitHub-repo-zichtbaarheid nog niet is besloten, is dit geblokkeerd —
   gebruik in de tussentijd `rsync` vanaf een lokale checkout (zie stap 1
   hieronder) of een deploy-key als de repo privé blijft.
2. **DNS A-record.** `plein.sovereignaigrid.nl` → `88.222.220.64` moet
   handmatig aangemaakt worden bij de DNS-provider van
   `sovereignaigrid.nl` vóórdat Caddy een geldig Let's Encrypt-certificaat
   kan uitgeven. Zonder dit record faalt de Caddy-reload met een
   ACME-timeout.
3. **Sanity check: extern Docker-netwerk `proxy` bestaat al op de VPS.**
   `docker-compose.yml` verwacht een extern netwerk `proxy` (de Caddy-
   container `caddy` hangt daar al aan). Controleer vóór `docker compose
   up`:
   ```bash
   ssh nextcloud-vps 'docker network inspect proxy' | grep -A2 '"Name": "caddy"'
   ```
   Staat `caddy` er niet tussen, dan is het netwerk verkeerd of ontbreekt
   het — eerst uitzoeken vóórdat je verdergaat (zie stap 3 voor het
   troubleshoot-commando).

## 1. Code naar de VPS

Vanaf een lokale checkout van de `fase0-mvp`-branch (of `main` na merge):

```bash
rsync -az --delete \
  --exclude .env --exclude node_modules --exclude dist --exclude .git \
  ./ nextcloud-vps:/opt/docker/openplein/
```

Alternatief zodra de repo bereikbaar is vanaf de VPS zelf:

```bash
ssh nextcloud-vps 'git clone <repo-url> /opt/docker/openplein'
# of, bij een update: cd /opt/docker/openplein && git pull
```

## 2. `.env` op de VPS

```bash
ssh nextcloud-vps
cd /opt/docker/openplein
cat > .env <<'EOF'
AUTH_SECRET=<genereer met: openssl rand -hex 32>
MOLLIE_API_KEY=test_...
EOF
chmod 600 .env
```

`MOLLIE_API_KEY` is een **Mollie-testkey** (`test_...`) — géén live-key.
`.env` wordt nooit gecommit (staat in `.gitignore`). Ontbreekt `.env` op de
VPS (bijv. `docker compose` zonder `.env`-bestand), dan geeft Docker Compose
`AUTH_SECRET=""` door; de server herkent een lege waarde en weigert te
starten (`process.exit(1)`) in plaats van door te draaien met een lege
HMAC-sleutel — check `docker compose logs openplein` als de container direct
stopt na `up`.

**`DB_PATH`** hoeft niet in `.env`: `docker-compose.yml` zet hem al op
`/app/data/plein.db`, binnen het gemounte volume `openplein-data`. Dat
bestand is de ledenadministratie (namen, e-mailadressen, aanmeldstatus) —
**dit volume hoort in de back-up.** Zonder dat volume overleeft de database
geen herstart of rebuild van de container en is bij de eerstvolgende deploy
elk lid weg. Lokaal (buiten Docker) bepaalt `DB_PATH` hetzelfde, met
`./plein.db` als standaard relatief aan `apps/demo/server`.

## 2b. Tenantconfiguratie: verplicht, per installatie

**Het Docker-image is tenant-neutraal**: er zit géén tenantconfiguratie in
gebakken (zie `Dockerfile` en `.dockerignore`). Elke installatie mount zijn eigen configuratie
en geeft twee omgevingsvariabelen mee. Zonder die twee dingen, of met een
`hostname` in het bestand die niet overeenkomt, **weigert de container
bewust te starten** (`loadTenantConfig` in `apps/demo/server/src/tenant.ts`
gooit een fout, het proces stopt) — dat voorkomt dat een installatie half
geconfigureerd, of met de configuratie van een andere klant, live komt.

Voor déze installatie (`plein.sovereignaigrid.nl`) staat dat al klaar in
`docker-compose.yml`:

- **Mount:** `deploy/tenant.saig.json` → `/app/tenant.json` (read-only).
- **`TENANT_CONFIG=/app/tenant.json`** — pad naar het gemounte bestand.
- **`TENANT_HOSTNAME=plein.sovereignaigrid.nl`** — moet gelijk zijn aan het
  `hostname`-veld in dat bestand.

Bij de eerstvolgende deploy van déze installatie hoef je hier dus niets
extra voor te doen — het staat al in `docker-compose.yml`. Richt je een
**tweede klant** in (nieuwe installatie, ander image-run of andere
`docker-compose.yml`), pas dan die drie dingen aan: mount het
configuratiebestand van die klant op hetzelfde pad, en zet
`TENANT_HOSTNAME` op diens hostnaam. Zie het schema in
`packages/tenant/src/schema.json` en de sectie hieronder voor welke velden
daarin mogen staan.

Zonder `TENANT_CONFIG`/`TENANT_HOSTNAME` (bijv. `docker run` zonder deze
twee env-vars en zonder mount) start de container niet — dat is bewust
gedrag, geen bug.

## 2c. Velden in de tenantconfiguratie

Volledig schema: `packages/tenant/src/schema.json`. Hieronder de praktische
samenvatting voor wie een nieuwe tenant inricht:

- **`hostname`** (verplicht): moet gelijk zijn aan `TENANT_HOSTNAME`, zie 2b.
- **`name`** (verplicht): tenant-naam, komt terug als woordmerk, paginatitel
  en in het webmanifest (`name`/`short_name`).
- **`logoUrl`** (optioneel): URL van het logo op het uitgelogde scherm.
  Zonder `logoUrl` toont dat scherm de naam als tekstmerk. Een `.svg`- of
  `.png`-extensie bepaalt het `type` in het webmanifest-icoon; een andere
  extensie laat `type` weg. Zonder `logoUrl` blijft het ingebouwde
  standaardicoon (`/icon-512.png`) staan.
- **`colors`** (optioneel): huisstijlkleuren, o.a. `navy-1` (thema-/
  achtergrondkleur van het webmanifest). Ontbreekt die, dan valt hij terug
  op de standaardkleur.
- **`catalog`** (verplicht, mag leeg): de mini-apps van deze installatie,
  elk een manifest zoals `docs/miniapp-spec.md` beschrijft.
- **`welcome`** (optioneel): de inhoud van het uitgelogde scherm, per taal.

### Het `welcome`-blok

```json
"welcome": {
  "nl": { "intro": "...", "sections": [{ "title": "...", "items": ["...", "..."] }] },
  "en": { "intro": "...", "sections": [ ... ] }
}
```

- `nl` en `en` zijn beide optioneel, maar minstens één moet er zijn wil
  `welcome` iets toevoegen. Ontbreekt een taal, dan valt de shell terug op
  de andere taal (`welcomeFor` in `@openplein/tenant`) — er hoeft dus geen
  dubbele vertaling te zijn.
- `intro` is verplicht per taal; `sections` is optioneel en herhaalbaar,
  elke sectie heeft een `title` en een lijst `items`.
- **Zonder `welcome`-blok helemaal** krijgt de tenant gewoon een werkend
  uitgelogde scherm: naam/logo en het inlogformulier, zonder introtekst of
  secties. `welcome` is dus puur een uitbreiding, geen vereiste.

## 3. Build + start

```bash
cd /opt/docker/openplein
docker compose up -d --build
docker compose logs -f openplein   # login-code verschijnt hier tijdens het testen
```

De service luistert alleen op `127.0.0.1:5175` (zie `docker-compose.yml`)
— publieke toegang loopt uitsluitend via de Caddy reverse-proxy.

**Connectiviteit-check vóór je de Caddy-route aanzet:** bevestig dat
`caddy` de `openplein`-container via de container-DNS-naam kan bereiken op
het `proxy`-netwerk:

```bash
docker exec caddy wget -qO- http://openplein:5175/ | head -c 100
```

Dit hoort de eerste ~100 bytes van de gebouwde `index.html` terug te
geven. Krijg je een `wget`-resolve-fout (`bad address 'openplein'`) of
timeout, dan zit `openplein` niet op hetzelfde netwerk als `caddy` —
controleer:

```bash
docker network ls                         # bestaat "proxy"?
docker inspect openplein --format '{{json .NetworkSettings.Networks}}'
```

en dat `docker-compose.yml` van openplein `networks: [proxy]` bevat en het
externe `proxy`-netwerk (`networks: { proxy: { external: true } }`)
overeenkomt met de naam die `caddy` gebruikt.

## 4. Caddy-route

Voeg toe aan `/opt/docker/core/caddy/Caddyfile`:

```
plein.sovereignaigrid.nl {
    reverse_proxy openplein:5175
}
```

`openplein` moet op hetzelfde Docker-netwerk zitten als de Caddy-container
om via de containernaam bereikbaar te zijn. Op deze VPS is dat het
externe netwerk **`proxy`**: de Caddy-container heet **`caddy`** en hangt
daar al aan. `docker-compose.yml` van dit project declareert dat expliciet
(`networks: [proxy]` op de service, plus een top-level
`networks: { proxy: { external: true } }`) — er is geen extra
netwerk-setup nodig zolang `proxy` op de VPS al bestaat (zie
Preconditions, punt 3).

Herlaad Caddy met het bestaande reload-patroon van de VPS:

```bash
docker compose -f /opt/docker/core/caddy/docker-compose.yml restart caddy
```

## 5. Verifieer productie

Open `https://plein.sovereignaigrid.nl`:

- Login met e-mailcode (uit `docker compose logs openplein`, zie stap 3).
- "Lijstje" openen: identity + storage werken, items blijven na reload
  bestaan.
- "Betaal-demo": betaling starten met de Mollie-testkey, checkout
  afronden, "✅ Bedankt voor je steun!" verschijnt.
- PWA-install-prompt beschikbaar (Chrome "App installeren") — vereist
  HTTPS, dus pas zichtbaar ná een geldig Caddy/Let's Encrypt-certificaat.

## Architectuurnotitie: waarom dit veilig is op één origin

In productie draaien de shell (`packages/runtime`) en de twee mini-apps op
dezelfde origin (`https://plein.sovereignaigrid.nl`), bediend door
dezelfde `@openplein/demo-server`-container (zie
`apps/demo/server/src/app.ts`, `SERVE_STATIC=1`). Dat verandert niets aan
de sandbox-isolatie: `MiniAppView.tsx` zet
`sandbox="allow-scripts allow-forms"` op de iframe, **zonder**
`allow-same-origin`. Daardoor krijgt het iframe-document altijd een opake
origin (`"null"`), ongeacht of het van dezelfde host of een andere host
komt. `PleinHost.start()` (`packages/bridge/src/host.ts`) accepteert
berichten wanneer `ev.origin === "null"` — dus juist omdát de sandbox
opzettelijk geen same-origin-toegang geeft, is het onderscheid
"zelfde host" vs. "andere host" hier niet de veiligheidsgrens; de
`sandbox`-vlag is dat. Same-host serveren in productie is dus een
deploy-vereenvoudiging (één container, één cert), geen verzwakking van de
isolatie.

## Rollback

```bash
ssh nextcloud-vps
cd /opt/docker/openplein
docker compose down
# vorige commit uitchecken/rsyncen, dan opnieuw:
docker compose up -d --build
```

**Nooit `docker compose down -v`** hier: de `-v` verwijdert ook het
`openplein-data`-volume, en daarmee de hele ledenadministratie.

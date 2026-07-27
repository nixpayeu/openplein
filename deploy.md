# Deploy: plein.sovereignaigrid.nl

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
  --exclude node_modules --exclude dist --exclude .git \
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

import { readFileSync } from "node:fs";
import { validateTenantConfig, type TenantConfig } from "@openplein/tenant";
import { validateManifest } from "@openplein/sdk";

/**
 * Laadt de tenantconfiguratie van deze installatie. Er draait één installatie
 * per tenant, dus de hostnaam in het bestand is een controle en geen sleutel:
 * hij vangt de fout waarbij de verkeerde configuratie aan de verkeerde
 * container hangt. Gooit bij elke afwijking, zodat de server niet half
 * geconfigureerd opstart.
 */
export function loadTenantConfig(path: string, expectedHostname: string): TenantConfig {
  const r = validateTenantConfig(JSON.parse(readFileSync(path, "utf8")));
  if (!r.valid) throw new Error(`Ongeldige tenantconfiguratie in ${path}: ${r.errors.join("; ")}`);
  if (r.config.hostname !== expectedHostname) {
    throw new Error(
      `Tenantconfiguratie in ${path} is van ${r.config.hostname}, deze installatie draait op ${expectedHostname}`,
    );
  }
  valideerCatalogus(r.config.catalog, path);
  return r.config;
}

/**
 * Valideert elke catalogusregel als manifest (schema uit @openplein/sdk) en
 * controleert dat alle id's uniek zijn. Zonder deze check kunnen twee
 * catalogusregels met hetzelfde id hetzelfde pseudoniem, dezelfde opslag en
 * elkaars permissies krijgen (zie identity.ts, storage.ts, permissions.ts).
 */
function valideerCatalogus(catalog: unknown[], path: string): void {
  const gezienIds = new Set<string>();
  catalog.forEach((regel, i) => {
    const r = validateManifest(regel);
    if (!r.valid) {
      throw new Error(`Ongeldige catalogusregel ${i} in ${path}: ${r.errors.join("; ")}`);
    }
    if (gezienIds.has(r.manifest.id)) {
      throw new Error(`Dubbel id "${r.manifest.id}" in de catalogus van ${path}`);
    }
    gezienIds.add(r.manifest.id);
  });
}

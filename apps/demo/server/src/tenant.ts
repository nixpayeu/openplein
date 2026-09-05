import { readFileSync } from "node:fs";
import { validateTenantConfig, type TenantConfig } from "@openplein/tenant";

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
  return r.config;
}

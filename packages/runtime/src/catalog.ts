import { validateManifest, type PleinManifest } from "@openplein/sdk";
import { validateTenantConfig, type TenantConfig } from "@openplein/tenant";

export async function loadTenant(): Promise<{ tenant: TenantConfig; catalog: PleinManifest[] }> {
  const res = await fetch("/api/tenant");
  const r = validateTenantConfig(await res.json());
  if (!r.valid) throw new Error(`Ongeldige tenantconfiguratie: ${r.errors.join("; ")}`);
  return { tenant: r.config, catalog: geldigeManifests(r.config.catalog) };
}

function geldigeManifests(items: unknown[]): PleinManifest[] {
  const out: PleinManifest[] = [];
  for (const item of items) {
    const r = validateManifest(item);
    if (r.valid) out.push(r.manifest);
    else console.warn("Ongeldig manifest overgeslagen:", r.errors);
  }
  return out;
}

export function applyTenantBranding(tenant: TenantConfig): void {
  document.title = tenant.name;
  for (const [naam, waarde] of Object.entries(tenant.colors ?? {})) {
    document.documentElement.style.setProperty(`--${naam}`, waarde);
  }
}

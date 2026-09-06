import { describe, it, expect } from "vitest";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { loadTenantConfig } from "./tenant";

const hier = dirname(fileURLToPath(import.meta.url));

// Deze twee bestanden zijn de échte productieconfiguraties: het lokale-dev-
// bestand (draait mee bij `pnpm dev`) en de SAIG-configuratie die
// docker-compose.yml op de VPS mount. Een handmatige fout in een van beide
// hoort een rode testrun te zijn, niet pas een crashende container.
describe("echte tenantconfiguraties", () => {
  it("laadt apps/demo/server/tenant.json (lokale dev)", () => {
    expect(loadTenantConfig(join(hier, "../tenant.json"), "localhost").name).toBe("Plein");
  });

  it("laadt deploy/tenant.saig.json (productie)", () => {
    const pad = join(hier, "../../../../deploy/tenant.saig.json");
    expect(loadTenantConfig(pad, "plein.sovereignaigrid.nl").name).toBe("Plein");
  });
});

const dir = mkdtempSync(join(tmpdir(), "plein-tenant-"));

function schrijf(naam: string, inhoud: unknown): string {
  const pad = join(dir, naam);
  writeFileSync(pad, JSON.stringify(inhoud), "utf8");
  return pad;
}

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    id: "nl.example.lijstje", name: "Lijstje", version: "0.1.0", icon: "/icon.svg",
    entry: "https://example.org/lijstje/",
    provider: { name: "Example", url: "https://example.org" },
    permissions: ["storage"],
    ...overrides,
  };
}

describe("loadTenantConfig", () => {
  it("laadt een geldige configuratie", () => {
    const pad = schrijf("goed.json", { hostname: "localhost", name: "Plein", catalog: [] });
    expect(loadTenantConfig(pad, "localhost").name).toBe("Plein");
  });

  it("stopt bij een ontbrekend bestand", () => {
    expect(() => loadTenantConfig(join(dir, "bestaat-niet.json"), "localhost")).toThrow();
  });

  it("stopt bij een ongeldige configuratie en noemt het pad", () => {
    const pad = schrijf("fout.json", { hostname: "localhost" });
    expect(() => loadTenantConfig(pad, "localhost")).toThrow(/fout\.json/);
  });

  it("stopt als de hostnaam niet overeenkomt", () => {
    const pad = schrijf("ander.json", { hostname: "plein.example.org", name: "X", catalog: [] });
    expect(() => loadTenantConfig(pad, "localhost")).toThrow(/plein\.example\.org/);
  });

  it("laadt een configuratie met een geldige catalogusregel", () => {
    const pad = schrijf("catalogus-goed.json", {
      hostname: "localhost", name: "Plein", catalog: [manifest()],
    });
    expect(loadTenantConfig(pad, "localhost").catalog).toHaveLength(1);
  });

  it("stopt bij een ongeldige catalogusregel (ontbrekende entry)", () => {
    const { entry: _entry, ...zonderEntry } = manifest();
    const pad = schrijf("catalogus-fout.json", {
      hostname: "localhost", name: "Plein", catalog: [zonderEntry],
    });
    expect(() => loadTenantConfig(pad, "localhost")).toThrow(/catalogusregel 0/);
  });

  it("stopt bij een dubbel id in de catalogus", () => {
    const pad = schrijf("catalogus-dubbel.json", {
      hostname: "localhost", name: "Plein",
      catalog: [manifest(), manifest({ entry: "https://example.org/anders/" })],
    });
    expect(() => loadTenantConfig(pad, "localhost")).toThrow(/nl\.example\.lijstje/);
  });
});

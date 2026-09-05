import { describe, it, expect } from "vitest";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadTenantConfig } from "./tenant";

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

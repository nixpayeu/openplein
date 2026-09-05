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
});

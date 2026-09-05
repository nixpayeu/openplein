// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadTenant, applyTenantBranding } from "./catalog";

const manifest = {
  id: "nl.example.lijstje",
  name: "Lijstje",
  version: "0.1.0",
  icon: "/icon.svg",
  entry: "https://example.org/lijstje/",
  provider: { name: "Example", url: "https://example.org" },
  permissions: ["storage"],
};

function antwoord(body: unknown) {
  return { json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  document.documentElement.style.cssText = "";
});
afterEach(() => vi.unstubAllGlobals());

describe("loadTenant", () => {
  it("geeft de configuratie en de geldige manifests terug", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve(antwoord({ hostname: "localhost", name: "Plein", catalog: [manifest] })),
    ));
    const { tenant, catalog } = await loadTenant();
    expect(tenant.name).toBe("Plein");
    expect(catalog).toHaveLength(1);
  });

  it("slaat een ongeldig manifest over zonder te stoppen", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve(antwoord({ hostname: "localhost", name: "Plein", catalog: [manifest, { id: "kapot" }] })),
    ));
    const { catalog } = await loadTenant();
    expect(catalog).toHaveLength(1);
  });

  it("gooit bij een ongeldige tenantconfiguratie", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(antwoord({ hostname: "localhost" }))));
    await expect(loadTenant()).rejects.toThrow();
  });
});

describe("applyTenantBranding", () => {
  it("zet de titel en de opgegeven kleuren", () => {
    applyTenantBranding({
      hostname: "localhost",
      name: "Digitale Autonomie",
      colors: { mint: "#123456" },
      catalog: [],
    });
    expect(document.title).toBe("Digitale Autonomie");
    expect(document.documentElement.style.getPropertyValue("--mint")).toBe("#123456");
  });

  it("laat kleuren die niet opgegeven zijn ongemoeid", () => {
    applyTenantBranding({ hostname: "localhost", name: "Plein", catalog: [] });
    expect(document.documentElement.style.getPropertyValue("--mint")).toBe("");
  });
});

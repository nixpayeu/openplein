import { describe, it, expect } from "vitest";
import { validateTenantConfig, welcomeFor } from "./tenant";

const geldig = {
  hostname: "plein.digitaleautonomie.org",
  name: "Digitale Autonomie",
  colors: { mint: "#06D6A0" },
  catalog: [],
};

describe("validateTenantConfig", () => {
  it("accepteert een geldige configuratie", () => {
    const r = validateTenantConfig(geldig);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.config.name).toBe("Digitale Autonomie");
  });

  it("accepteert een configuratie zonder kleuren en zonder logo", () => {
    const r = validateTenantConfig({ hostname: "localhost", name: "Plein", catalog: [] });
    expect(r.valid).toBe(true);
  });

  it("weigert een ontbrekende naam", () => {
    const { name, ...rest } = geldig;
    const r = validateTenantConfig(rest);
    expect(r.valid).toBe(false);
  });

  it("weigert een onbekend veld", () => {
    const r = validateTenantConfig({ ...geldig, tracking: "ga4" });
    expect(r.valid).toBe(false);
  });

  it("weigert een kleur die geen hexwaarde is", () => {
    const r = validateTenantConfig({ ...geldig, colors: { mint: "groen" } });
    expect(r.valid).toBe(false);
  });

  it("weigert een onbekende kleurnaam", () => {
    const r = validateTenantConfig({ ...geldig, colors: { paars: "#800080" } });
    expect(r.valid).toBe(false);
  });

  it("geeft leesbare fouten terug", () => {
    const r = validateTenantConfig({ hostname: "x" });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.length).toBeGreaterThan(0);
  });
});

const metWelkom = {
  hostname: "plein.example.org",
  name: "Voorbeeld",
  catalog: [],
  welcome: {
    nl: { intro: "Welkom bij ons.", sections: [{ title: "Wat je krijgt", items: ["Een", "Twee"] }] },
    en: { intro: "Welcome." },
  },
};

describe("welcome in de tenantconfiguratie", () => {
  it("accepteert een welcome-blok in twee talen", () => {
    expect(validateTenantConfig(metWelkom).valid).toBe(true);
  });

  it("accepteert een welcome-blok in één taal", () => {
    const r = validateTenantConfig({ ...metWelkom, welcome: { nl: { intro: "Hoi." } } });
    expect(r.valid).toBe(true);
  });

  it("weigert een welcome zonder intro", () => {
    const r = validateTenantConfig({ ...metWelkom, welcome: { nl: { sections: [] } } });
    expect(r.valid).toBe(false);
  });

  it("weigert een onbekende taal", () => {
    const r = validateTenantConfig({ ...metWelkom, welcome: { de: { intro: "Hallo." } } });
    expect(r.valid).toBe(false);
  });

  it("weigert een sectie zonder titel", () => {
    const r = validateTenantConfig({
      ...metWelkom,
      welcome: { nl: { intro: "Hoi.", sections: [{ items: ["Een"] }] } },
    });
    expect(r.valid).toBe(false);
  });
});

describe("welcomeFor", () => {
  it("geeft de tekst van de gevraagde taal", () => {
    const c = validateTenantConfig(metWelkom);
    if (!c.valid) throw new Error("configuratie zou geldig moeten zijn");
    expect(welcomeFor(c.config, "en")?.intro).toBe("Welcome.");
  });

  it("valt terug op de andere taal", () => {
    const r = validateTenantConfig({ ...metWelkom, welcome: { nl: { intro: "Alleen NL." } } });
    if (!r.valid) throw new Error("configuratie zou geldig moeten zijn");
    expect(welcomeFor(r.config, "en")?.intro).toBe("Alleen NL.");
  });

  it("geeft null zonder welcome-blok", () => {
    const r = validateTenantConfig({ hostname: "localhost", name: "Plein", catalog: [] });
    if (!r.valid) throw new Error("configuratie zou geldig moeten zijn");
    expect(welcomeFor(r.config, "nl")).toBeNull();
  });
});

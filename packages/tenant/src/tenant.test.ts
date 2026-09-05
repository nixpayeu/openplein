import { describe, it, expect } from "vitest";
import { validateTenantConfig } from "./tenant";

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

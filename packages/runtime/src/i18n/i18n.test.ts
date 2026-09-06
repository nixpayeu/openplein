// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { t, setLocale } from "./index";
import { PERMISSIONS } from "@openplein/sdk";
import nl from "./nl.json" with { type: "json" };
import en from "./en.json" with { type: "json" };

describe("i18n", () => {
  it("vertaalt in beide talen en valt terug op de key", () => {
    setLocale("nl"); expect(t("home.discover")).toBe("Ontdekken");
    setLocale("en"); expect(t("home.discover")).toBe("Discover");
    expect(t("bestaat.niet")).toBe("bestaat.niet");
  });

  it("vult variabelen in een vertaling in", () => {
    setLocale("nl");
    expect(t("welcome.title", { name: "Testvereniging" })).toBe("Welkom bij Testvereniging");
  });
});

describe("vertalingen", () => {
  it("heeft voor elke permissie een tekst in beide talen", () => {
    for (const p of PERMISSIONS) {
      expect(Object.keys(nl)).toContain(`perm.${p}`);
      expect(Object.keys(en)).toContain(`perm.${p}`);
    }
  });

  it("heeft in beide talen dezelfde sleutels", () => {
    expect(Object.keys(nl).sort()).toEqual(Object.keys(en).sort());
  });
});

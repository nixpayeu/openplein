import { describe, it, expect } from "vitest";
import { validateManifest } from "./manifest";

const valid = {
  id: "nl.easeo.lijstje", name: "Lijstje", version: "0.1.0",
  icon: "icon.svg", entry: "http://localhost:5180/",
  provider: { name: "EASEO", url: "https://easeo.nl" },
  permissions: ["identity", "storage"],
};

describe("validateManifest", () => {
  it("accepteert een geldig manifest", () => {
    const r = validateManifest(valid);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.manifest.id).toBe("nl.easeo.lijstje");
  });
  it("weigert ontbrekend id", () => {
    const { id, ...rest } = valid;
    const r = validateManifest(rest);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.join()).toContain("id");
  });
  it("weigert onbekende permissie", () => {
    const r = validateManifest({ ...valid, permissions: ["camera"] });
    expect(r.valid).toBe(false);
  });
});

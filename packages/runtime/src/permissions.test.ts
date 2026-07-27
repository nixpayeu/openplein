// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { PermissionStore } from "./permissions";

describe("PermissionStore", () => {
  beforeEach(() => localStorage.clear());
  it("is unset voor onbekende app/permissie", () => {
    expect(new PermissionStore().decision("a", "storage")).toBe("unset");
  });
  it("onthoudt grant en deny over instanties heen (persistentie)", () => {
    const s = new PermissionStore();
    s.grant("a", "storage"); s.deny("a", "payments");
    const s2 = new PermissionStore();
    expect(s2.decision("a", "storage")).toBe("granted");
    expect(s2.decision("a", "payments")).toBe("denied");
    expect(s2.decision("b", "storage")).toBe("unset");
  });
  it("overleeft corrupte localStorage-inhoud", () => {
    localStorage.setItem("plein.permissions", "null");
    expect(new PermissionStore().decision("a", "storage")).toBe("unset");
    localStorage.setItem("plein.permissions", "[1,2]");
    expect(new PermissionStore().decision("a", "storage")).toBe("unset");
  });
});

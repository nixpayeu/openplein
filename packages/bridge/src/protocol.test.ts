import { describe, it, expect } from "vitest";
import { isBridgeRequest, methodPermission } from "./protocol";

describe("protocol", () => {
  it("herkent een geldige request-envelope", () => {
    expect(isBridgeRequest({ plein: "0.1", id: "1", method: "pay" })).toBe(true);
  });
  it("weigert envelope zonder plein-versie of id", () => {
    expect(isBridgeRequest({ id: "1", method: "pay" })).toBe(false);
    expect(isBridgeRequest({ plein: "0.1", method: "pay" })).toBe(false);
    expect(isBridgeRequest("nope")).toBe(false);
  });
  it("mapt methods naar permissies", () => {
    expect(methodPermission("pay")).toBe("payments");
    expect(methodPermission("identity.request")).toBe("identity");
    expect(methodPermission("storage.get")).toBe("storage");
    expect(methodPermission("storage.set")).toBe("storage");
    expect(methodPermission("bestaatNiet")).toBe(null);
  });
});

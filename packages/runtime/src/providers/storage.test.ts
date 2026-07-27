// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { storageProvider } from "./storage";

describe("storageProvider", () => {
  beforeEach(() => localStorage.clear());
  it("scheidt data per appId", async () => {
    await storageProvider.set("app.a", "k", "1");
    await storageProvider.set("app.b", "k", "2");
    expect(await storageProvider.get("app.a", "k")).toBe("1");
    expect(await storageProvider.get("app.b", "k")).toBe("2");
    expect(await storageProvider.get("app.c", "k")).toBe(null);
  });
});

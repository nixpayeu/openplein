// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { identityProvider } from "./identity";

// jsdom levert geen crypto.subtle; de webcrypto van Node wel.
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  localStorage.clear();
});

const sessie = () => ({ email: "jan@example.org" });

describe("identityProvider", () => {
  it("geeft geen e-mailadres bij request", async () => {
    const r = await identityProvider(sessie).request("nl.example.a");
    expect(JSON.stringify(r)).not.toContain("jan@example.org");
  });

  it("geeft twee mini-apps een verschillend pseudoniem voor hetzelfde lid", async () => {
    const p = identityProvider(sessie);
    const a = await p.request("nl.example.a");
    const b = await p.request("nl.example.b");
    expect(a.subject).not.toBe(b.subject);
  });

  it("geeft dezelfde mini-app steeds hetzelfde pseudoniem", async () => {
    const p = identityProvider(sessie);
    expect((await p.request("nl.example.a")).subject).toBe((await p.request("nl.example.a")).subject);
  });

  it("geeft twee leden een verschillend pseudoniem in dezelfde mini-app", async () => {
    const a = await identityProvider(() => ({ email: "jan@example.org" })).request("nl.example.a");
    const b = await identityProvider(() => ({ email: "piet@example.org" })).request("nl.example.a");
    expect(a.subject).not.toBe(b.subject);
  });

  it("geeft het e-mailadres alleen via email()", async () => {
    expect(await identityProvider(sessie).email("nl.example.a")).toEqual({ email: "jan@example.org" });
  });

  it("weigert zonder sessie", async () => {
    await expect(identityProvider(() => null).request("nl.example.a")).rejects.toThrow();
    await expect(identityProvider(() => null).email("nl.example.a")).rejects.toThrow();
  });
});

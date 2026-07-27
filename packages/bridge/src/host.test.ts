// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { PleinHost } from "./host";
import type { BridgeResponse } from "./protocol";
import type { PleinManifest } from "@openplein/sdk";

const manifest: PleinManifest = {
  id: "nl.easeo.test", name: "Test", version: "0.1.0", icon: "i.svg",
  entry: "http://localhost:5180/", provider: { name: "EASEO", url: "https://easeo.nl" },
  permissions: ["storage"],
};

function makeHost(gateAnswer: boolean, providers: Partial<Record<string, unknown>> = {}) {
  const sent: BridgeResponse[] = [];
  const source = { postMessage: (m: BridgeResponse) => sent.push(m) } as unknown as Window;
  const host = new PleinHost({
    manifest, source, gate: async () => gateAnswer,
    providers: {
      pay: vi.fn(), identityRequest: vi.fn(),
      storageGet: vi.fn(async () => "melk"), storageSet: vi.fn(async () => {}),
      ...providers,
    } as never,
  });
  host.start();
  return { sent, source };
}

function deliver(source: Window, data: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data, origin: "null", source }));
}

async function flush() { await new Promise((r) => setTimeout(r, 0)); }

describe("PleinHost", () => {
  it("beantwoordt storage.get via provider als permissie gegund is", async () => {
    const { sent, source } = makeHost(true);
    deliver(source, { plein: "0.1", id: "a", method: "storage.get", params: { key: "x" } });
    await flush();
    expect(sent[0]).toEqual({ plein: "0.1", id: "a", ok: true, result: "melk" });
  });
  it("geeft PERMISSION_DENIED als de gate weigert", async () => {
    const { sent, source } = makeHost(false);
    deliver(source, { plein: "0.1", id: "b", method: "storage.get", params: { key: "x" } });
    await flush();
    expect(sent[0]).toMatchObject({ ok: false, error: { code: "PERMISSION_DENIED" } });
  });
  it("geeft PERMISSION_DENIED voor permissie buiten het manifest (pay)", async () => {
    const { sent, source } = makeHost(true);
    deliver(source, { plein: "0.1", id: "c", method: "pay", params: {} });
    await flush();
    expect(sent[0]).toMatchObject({ ok: false, error: { code: "PERMISSION_DENIED" } });
  });
  it("geeft UNKNOWN_METHOD voor onbekende methods", async () => {
    const { sent, source } = makeHost(true);
    deliver(source, { plein: "0.1", id: "d", method: "yolo" });
    await flush();
    expect(sent[0]).toMatchObject({ ok: false, error: { code: "UNKNOWN_METHOD" } });
  });
  it("negeert berichten van een andere source", async () => {
    const { sent } = makeHost(true);
    deliver({} as Window, { plein: "0.1", id: "e", method: "storage.get", params: { key: "x" } });
    await flush();
    expect(sent).toHaveLength(0);
  });
  it("faalt gesloten als de gate gooit", async () => {
    const sent: BridgeResponse[] = [];
    const source = { postMessage: (m: BridgeResponse) => sent.push(m) } as unknown as Window;
    const host = new PleinHost({
      manifest, source, gate: async () => { throw new Error("db down"); },
      providers: {
        pay: vi.fn(), identityRequest: vi.fn(),
        storageGet: vi.fn(async () => "melk"), storageSet: vi.fn(async () => {}),
      } as never,
    });
    host.start();
    deliver(source, { plein: "0.1", id: "f", method: "storage.get", params: { key: "x" } });
    await flush();
    expect(sent[0]).toMatchObject({ ok: false, error: { code: "PERMISSION_DENIED" } });
  });
  it("geeft INVALID_PARAMS bij ontbrekende key", async () => {
    const { sent, source } = makeHost(true);
    deliver(source, { plein: "0.1", id: "g", method: "storage.set", params: { value: "1" } });
    await flush();
    expect(sent[0]).toMatchObject({ ok: false, error: { code: "INVALID_PARAMS" } });
  });
});

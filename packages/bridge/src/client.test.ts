// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { createPleinClient, PleinError } from "./client";
import { isBridgeRequest, type BridgeRequest, type BridgeResponse } from "./protocol";

// Store listeners for cleanup
const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];

// Wrap addEventListener to track listeners
const originalAddEventListener = window.addEventListener;
window.addEventListener = function (type: string, listener: EventListener, ...args: any[]) {
  listeners.push({ target: window, type, listener });
  return originalAddEventListener.call(this, type, listener, ...args);
} as any;

function fakeHost(reply: (req: BridgeRequest) => BridgeResponse["error"] | { result: unknown }) {
  // vangt requests op window en antwoordt zoals een echte host
  window.addEventListener("message", (ev) => {
    if (!isBridgeRequest(ev.data)) return;
    const req = ev.data;
    const r = reply(req);
    const resp: BridgeResponse =
      "result" in r
        ? { plein: "0.1", id: req.id, ok: true, result: r.result }
        : { plein: "0.1", id: req.id, ok: false, error: r };
    window.postMessage(resp, "*");
  });
}

describe("createPleinClient", () => {
  beforeEach(() => {
    // Clear all tracked listeners before each test
    while (listeners.length > 0) {
      const { target, type, listener } = listeners.pop()!;
      (target as Window).removeEventListener(type, listener);
    }
  });
  it("resolvet storage.get met het result van de host", async () => {
    fakeHost((req) =>
      req.method === "storage.get" ? { result: "melk" } : { code: "UNKNOWN_METHOD", message: "?" }
    );
    const plein = createPleinClient({ target: window });
    await expect(plein.storage.get("item")).resolves.toBe("melk");
  });
  it("reject met PleinError bij ok:false", async () => {
    fakeHost(() => ({ code: "PERMISSION_DENIED", message: "geweigerd" }));
    const plein = createPleinClient({ target: window });
    const err = await plein.pay({ amount: "1.00", currency: "EUR", description: "x" }).catch((e) => e);
    expect(err).toBeInstanceOf(PleinError);
    expect(err.code).toBe("PERMISSION_DENIED");
  });
  it("reject met TIMEOUT als de host nooit antwoordt", async () => {
    const plein = createPleinClient({ target: window, timeoutMs: 50 });
    const err = await plein.identity.request().catch((e) => e);
    expect(err.code).toBe("TIMEOUT");
  });
});

// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { createPleinClient, PleinError } from "./client";
import { isBridgeRequest, type BridgeRequest, type BridgeResponse } from "./protocol";

// Store clients and fake host listeners for cleanup
const clients: Array<PleinClient & { dispose?: () => void }> = [];
const fakeHostListeners: EventListener[] = [];

function fakeHost(reply: (req: BridgeRequest) => BridgeResponse["error"] | { result: unknown }) {
  // vangt requests op window en antwoordt zoals een echte host
  const listener = (ev: MessageEvent) => {
    if (!isBridgeRequest(ev.data)) return;
    const req = ev.data;
    const r = reply(req);
    const resp: BridgeResponse =
      "result" in r
        ? { plein: "0.1", id: req.id, ok: true, result: r.result }
        : { plein: "0.1", id: req.id, ok: false, error: r };
    window.postMessage(resp, "*");
  };
  window.addEventListener("message", listener);
  fakeHostListeners.push(listener);
}

describe("createPleinClient", () => {
  afterEach(() => {
    // Clean up clients
    for (const client of clients) {
      if (client.dispose) client.dispose();
    }
    clients.length = 0;
    // Clean up fake host listeners
    for (const listener of fakeHostListeners) {
      window.removeEventListener("message", listener);
    }
    fakeHostListeners.length = 0;
  });
  it("resolvet storage.get met het result van de host", async () => {
    fakeHost((req) =>
      req.method === "storage.get" ? { result: "melk" } : { code: "UNKNOWN_METHOD", message: "?" }
    );
    const plein = createPleinClient({ target: window });
    clients.push(plein);
    await expect(plein.storage.get("item")).resolves.toBe("melk");
  });
  it("reject met PleinError bij ok:false", async () => {
    fakeHost(() => ({ code: "PERMISSION_DENIED", message: "geweigerd" }));
    const plein = createPleinClient({ target: window });
    clients.push(plein);
    const err = await plein.pay({ amount: "1.00", currency: "EUR", description: "x" }).catch((e) => e);
    expect(err).toBeInstanceOf(PleinError);
    expect(err.code).toBe("PERMISSION_DENIED");
  });
  it("reject met TIMEOUT als de host nooit antwoordt", async () => {
    const plein = createPleinClient({ target: window, timeoutMs: 50 });
    clients.push(plein);
    const err = await plein.identity.request().catch((e) => e);
    expect(err.code).toBe("TIMEOUT");
  });
  it("negeert responses van een andere source", async () => {
    // Capture the request ID from fakeHost
    let capturedId: string | undefined;
    const captureListener = (ev: MessageEvent) => {
      if (isBridgeRequest(ev.data)) {
        capturedId = ev.data.id;
      }
    };
    window.addEventListener("message", captureListener);
    fakeHostListeners.push(captureListener);

    // Create client with short timeout, start a call that won't be answered
    const plein = createPleinClient({ target: window, timeoutMs: 100 });
    clients.push(plein);
    const call = plein.identity.request().catch((e) => e);

    // Wait for the request to be sent and captured
    await new Promise(resolve => setTimeout(resolve, 10));

    // Forge a response from a different source
    if (capturedId) {
      const forgedResponse: BridgeResponse = {
        plein: "0.1",
        id: capturedId,
        ok: true,
        result: { email: "fake@example.com" },
      };
      window.dispatchEvent(
        new MessageEvent("message", {
          data: forgedResponse,
          source: {} as Window, // Wrong source
        })
      );
    }

    // Should still timeout because forged response was ignored
    const err = await call;
    expect(err.code).toBe("TIMEOUT");
  });
  it("dispose() reject alle pending calls", async () => {
    const plein = createPleinClient({ target: window, timeoutMs: 10000 });
    clients.push(plein);
    const call1 = plein.identity.request().catch((e) => e);
    const call2 = plein.pay({ amount: "1.00", currency: "EUR", description: "test" }).catch((e) => e);

    // Give requests time to be registered
    await new Promise(resolve => setTimeout(resolve, 10));

    // Dispose the client
    plein.dispose();

    // Both calls should reject with TIMEOUT code and "disposed" message
    const err1 = await call1;
    const err2 = await call2;
    expect(err1).toBeInstanceOf(PleinError);
    expect(err1.code).toBe("TIMEOUT");
    expect(err1.message).toContain("disposed");
    expect(err2).toBeInstanceOf(PleinError);
    expect(err2.code).toBe("TIMEOUT");
    expect(err2.message).toContain("disposed");
  });
});

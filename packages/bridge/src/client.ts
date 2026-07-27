import {
  PROTOCOL_VERSION, type BridgeRequest, type BridgeResponse, type PleinErrorCode,
} from "./protocol";

export class PleinError extends Error {
  constructor(public code: PleinErrorCode, message: string) { super(message); }
}

export interface PleinClient {
  pay(p: { amount: string; currency: "EUR"; description: string }): Promise<{ status: "paid" | "canceled" | "failed" }>;
  identity: { request(): Promise<{ email: string }> };
  storage: { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void> };
  dispose(): void;
}

export function createPleinClient(opts: { target?: Window; timeoutMs?: number } = {}): PleinClient {
  const target = opts.target ?? window.parent;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: PleinError) => void; timer: ReturnType<typeof setTimeout> }>();
  let seq = 0;
  let disposed = false;

  const handleMessage = (ev: MessageEvent) => {
    // Validate response comes from target window; reject all other sources
    if (ev.source !== target) return;

    const data = ev.data as BridgeResponse;
    if (typeof data !== "object" || data === null || data.plein !== PROTOCOL_VERSION) return;
    if (!("ok" in data)) return; // requests negeren (alleen responses afhandelen)
    const p = pending.get(data.id);
    if (!p) return;
    pending.delete(data.id);
    clearTimeout(p.timer);
    if (data.ok) p.resolve(data.result);
    else p.reject(new PleinError(data.error.code, data.error.message));
  };

  window.addEventListener("message", handleMessage);

  function call(method: string, params?: unknown): Promise<unknown> {
    // Reuse TIMEOUT code for disposed clients (no DISPOSED code in PleinErrorCode by design)
    if (disposed) return Promise.reject(new PleinError("TIMEOUT", "client disposed"));

    const id = `${Date.now()}-${seq++}`;
    const req: BridgeRequest = { plein: PROTOCOL_VERSION, id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (pending.delete(id)) reject(new PleinError("TIMEOUT", `Geen antwoord op ${method}`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      target.postMessage(req, "*");
    });
  }

  return {
    pay: (p) => call("pay", p) as Promise<{ status: "paid" | "canceled" | "failed" }>,
    identity: { request: () => call("identity.request") as Promise<{ email: string }> },
    storage: {
      get: (key) => call("storage.get", { key }) as Promise<string | null>,
      set: (key, value) => call("storage.set", { key, value }) as Promise<void>,
    },
    dispose: () => {
      disposed = true;
      window.removeEventListener("message", handleMessage);
      for (const entry of pending.values()) {
        clearTimeout(entry.timer);
        // Reuse TIMEOUT code for disposal rejections (no DISPOSED code in PleinErrorCode by design)
        entry.reject(new PleinError("TIMEOUT", "client disposed"));
      }
      pending.clear();
    },
  };
}

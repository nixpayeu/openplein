import type { PleinManifest, Permission } from "@openplein/sdk";
import {
  PROTOCOL_VERSION, isBridgeRequest, methodPermission,
  type BridgeRequest, type BridgeResponse,
} from "./protocol";
import { PleinError } from "./client";

export interface Providers {
  pay(appId: string, params: unknown): Promise<unknown>;
  identityRequest(appId: string): Promise<{ email: string }>;
  storageGet(appId: string, key: string): Promise<string | null>;
  storageSet(appId: string, key: string, value: string): Promise<void>;
}

export type PermissionGate = (appId: string, permission: Permission) => Promise<boolean>;

export class PleinHost {
  private listener?: (ev: MessageEvent) => void;

  constructor(private opts: {
    manifest: PleinManifest; source: Window; gate: PermissionGate; providers: Providers;
  }) {}

  start(): void {
    const allowedOrigin = new URL(this.opts.manifest.entry).origin;
    this.listener = (ev: MessageEvent) => {
      if (ev.source !== this.opts.source) return;
      // sandboxed iframes zonder allow-same-origin hebben origin "null"
      if (ev.origin !== "null" && ev.origin !== allowedOrigin) return;
      if (!isBridgeRequest(ev.data)) return;
      void this.handle(ev.data);
    };
    window.addEventListener("message", this.listener);
  }

  stop(): void {
    if (this.listener) window.removeEventListener("message", this.listener);
  }

  private respond(id: string, body: { ok: true; result: unknown } | { ok: false; error: { code: string; message: string } }): void {
    this.opts.source.postMessage({ plein: PROTOCOL_VERSION, id, ...body } as BridgeResponse, "*");
  }

  private async handle(req: BridgeRequest): Promise<void> {
    const { manifest, gate, providers } = this.opts;
    const permission = methodPermission(req.method);
    if (!permission) {
      return this.respond(req.id, { ok: false, error: { code: "UNKNOWN_METHOD", message: req.method } });
    }
    if (!manifest.permissions.includes(permission) || !(await gate(manifest.id, permission))) {
      return this.respond(req.id, {
        ok: false, error: { code: "PERMISSION_DENIED", message: `${permission} geweigerd` },
      });
    }
    try {
      const p = (req.params ?? {}) as { key?: string; value?: string };
      let result: unknown;
      switch (req.method) {
        case "pay": result = await providers.pay(manifest.id, req.params); break;
        case "identity.request": result = await providers.identityRequest(manifest.id); break;
        case "storage.get": result = await providers.storageGet(manifest.id, String(p.key)); break;
        case "storage.set": result = await providers.storageSet(manifest.id, String(p.key), String(p.value)); break;
      }
      this.respond(req.id, { ok: true, result });
    } catch (e) {
      const code = e instanceof PleinError ? e.code : "PROVIDER_ERROR";
      this.respond(req.id, {
        ok: false, error: { code, message: e instanceof Error ? e.message : "provider-fout" },
      });
    }
  }
}

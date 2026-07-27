import type { Permission } from "@openplein/sdk";

export const PROTOCOL_VERSION = "0.1" as const;

export type PleinErrorCode =
  | "PERMISSION_DENIED" | "UNKNOWN_METHOD" | "PROVIDER_ERROR"
  | "NOT_AUTHENTICATED" | "TIMEOUT";

export interface BridgeRequest {
  plein: typeof PROTOCOL_VERSION; id: string; method: string; params?: unknown;
}

export type BridgeResponse =
  | { plein: typeof PROTOCOL_VERSION; id: string; ok: true; result: unknown }
  | { plein: typeof PROTOCOL_VERSION; id: string; ok: false;
      error: { code: PleinErrorCode; message: string } };

const METHOD_PERMISSIONS: Record<string, Permission> = {
  pay: "payments",
  "identity.request": "identity",
  "storage.get": "storage",
  "storage.set": "storage",
};

export function methodPermission(method: string): Permission | null {
  return METHOD_PERMISSIONS[method] ?? null;
}

export function isBridgeRequest(data: unknown): data is BridgeRequest {
  return (
    typeof data === "object" && data !== null &&
    (data as BridgeRequest).plein === PROTOCOL_VERSION &&
    typeof (data as BridgeRequest).id === "string" &&
    typeof (data as BridgeRequest).method === "string"
  );
}

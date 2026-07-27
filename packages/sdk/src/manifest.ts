import Ajv from "ajv";
import schema from "./schema.json" with { type: "json" };

export const PERMISSIONS = ["payments", "identity", "storage", "notifications"] as const;
export type Permission = (typeof PERMISSIONS)[number];

export interface PleinManifest {
  id: string; name: string; version: string; icon: string; entry: string;
  provider: { name: string; url: string };
  permissions: Permission[];
}

const ajv = new Ajv({ allErrors: true, validateSchema: false });
ajv.addFormat("uri", /^.+/); // simple pattern for URI validation
const check = ajv.compile(schema);

export function validateManifest(
  data: unknown
): { valid: true; manifest: PleinManifest } | { valid: false; errors: string[] } {
  if (check(data)) return { valid: true, manifest: data as unknown as PleinManifest };
  return {
    valid: false,
    errors: (check.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message}`),
  };
}

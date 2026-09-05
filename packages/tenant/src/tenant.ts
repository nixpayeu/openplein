import Ajv from "ajv/dist/2020";
import schema from "./schema.json" with { type: "json" };

export const TENANT_COLORS = ["navy-1", "navy-2", "steel", "mint", "ijs", "wit"] as const;
export type TenantColor = (typeof TENANT_COLORS)[number];

export interface TenantConfig {
  hostname: string;
  name: string;
  logoUrl?: string;
  colors?: Partial<Record<TenantColor, string>>;
  catalog: unknown[];
}

const ajv = new Ajv({ allErrors: true });
const check = ajv.compile(schema);

export function validateTenantConfig(
  data: unknown,
): { valid: true; config: TenantConfig } | { valid: false; errors: string[] } {
  if (check(data)) return { valid: true, config: data as unknown as TenantConfig };
  return {
    valid: false,
    errors: (check.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message}`),
  };
}

import Ajv from "ajv/dist/2020";
import schema from "./schema.json" with { type: "json" };

export const TENANT_COLORS = ["navy-1", "navy-2", "steel", "mint", "ijs", "wit"] as const;
export type TenantColor = (typeof TENANT_COLORS)[number];

export interface WelcomeText {
  intro: string;
  sections?: { title: string; items: string[] }[];
}

export interface TenantConfig {
  hostname: string;
  name: string;
  logoUrl?: string;
  colors?: Partial<Record<TenantColor, string>>;
  catalog: unknown[];
  welcome?: Partial<Record<"nl" | "en", WelcomeText>>;
  admins?: string[];
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

/**
 * De tekst voor het uitgelogde scherm in de gevraagde taal. Valt terug op de
 * andere taal, want een half vertaalde tenant is beter dan een leeg scherm.
 */
export function welcomeFor(config: TenantConfig, locale: "nl" | "en"): WelcomeText | null {
  const w = config.welcome;
  if (!w) return null;
  return w[locale] ?? w[locale === "nl" ? "en" : "nl"] ?? null;
}

/**
 * Bestuursleden staan als e-mailadres in de tenantconfiguratie, niet als rol
 * in de database: een vereniging beheert ze dan in hetzelfde bestand als de
 * rest. Hoofdletterongevoelig, want adressen worden met de hand ingetypt.
 */
export function isAdmin(config: TenantConfig, email: string): boolean {
  const gezocht = email.trim().toLowerCase();
  return (config.admins ?? []).some((a) => a.trim().toLowerCase() === gezocht);
}

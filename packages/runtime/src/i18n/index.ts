import nl from "./nl.json" with { type: "json" };
import en from "./en.json" with { type: "json" };

const dicts: Record<string, Record<string, string>> = { nl, en };
let locale: "nl" | "en" =
  typeof navigator !== "undefined" && navigator.language.startsWith("nl") ? "nl" : "en";

export function setLocale(l: "nl" | "en"): void { locale = l; }
export function getLocale(): "nl" | "en" { return locale; }
export function t(key: string, vars: Record<string, string> = {}): string {
  let s = dicts[locale][key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

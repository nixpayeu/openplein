import type { Permission } from "@openplein/sdk";

const KEY = "plein.permissions";
type Stored = Record<string, Partial<Record<Permission, boolean>>>;

export class PermissionStore {
  private read(): Stored {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Stored) : {};
    } catch { return {}; }
  }
  private write(s: Stored): void { localStorage.setItem(KEY, JSON.stringify(s)); }

  decision(appId: string, p: Permission): "granted" | "denied" | "unset" {
    const v = this.read()[appId]?.[p];
    return v === undefined ? "unset" : v ? "granted" : "denied";
  }
  grant(appId: string, p: Permission): void {
    const s = this.read(); (s[appId] ??= {})[p] = true; this.write(s);
  }
  deny(appId: string, p: Permission): void {
    const s = this.read(); (s[appId] ??= {})[p] = false; this.write(s);
  }
}

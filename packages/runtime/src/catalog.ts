import { validateManifest, type PleinManifest } from "@openplein/sdk";

export async function loadCatalog(): Promise<PleinManifest[]> {
  const res = await fetch("/catalog.json");
  const items = (await res.json()) as unknown[];
  const out: PleinManifest[] = [];
  for (const item of items) {
    const r = validateManifest(item);
    if (r.valid) out.push(r.manifest);
    else console.warn("Ongeldig manifest overgeslagen:", r.errors);
  }
  return out;
}

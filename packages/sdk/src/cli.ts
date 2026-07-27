import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function scaffold(name: string, targetDir: string): void {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error(`Ongeldige naam: ${name}`);
  if (existsSync(targetDir) && readdirSync(targetDir).length > 0)
    throw new Error(`Map ${targetDir} bestaat al en is niet leeg`);
  mkdirSync(targetDir, { recursive: true });
  const templateDir = join(dirname(fileURLToPath(import.meta.url)), "..", "template");
  cpSync(templateDir, targetDir, { recursive: true });
  for (const file of readdirSync(targetDir)) {
    const p = join(targetDir, file);
    const content = readFileSync(p, "utf8")
      .replaceAll("__NAME__", name)
      .replaceAll("__ID__", `nl.example.${name}`);
    writeFileSync(p, content);
  }
  console.log(`✔ Mini-app '${name}' aangemaakt in ${targetDir}
Volgende stappen:
  1. Kopieer plein-client.js (gebundeld uit @openplein/bridge) naar de map
  2. Serveer de map, bv.: npx serve -l 5190 ${targetDir}
  3. Voeg het manifest toe aan de catalog.json van je Plein-runtime`);
}

// CLI-entry
const invokedDirectly = process.argv[1]?.endsWith("cli.ts") || process.argv[1]?.endsWith("create-plein-app");
if (invokedDirectly) {
  const name = process.argv[2];
  if (!name) { console.error("Gebruik: create-plein-app <naam>"); process.exit(1); }
  scaffold(name, join(process.cwd(), name));
}

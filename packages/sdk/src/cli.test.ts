import { describe, it, expect, afterEach } from "vitest";
import { scaffold } from "./cli";
import { rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = join(tmpdir(), `plein-test-${process.pid}`);
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("scaffold", () => {
  it("maakt een mini-app-map met ingevuld manifest", () => {
    scaffold("mijnapp", dir);
    expect(existsSync(join(dir, "index.html"))).toBe(true);
    const manifest = JSON.parse(readFileSync(join(dir, "plein.manifest.json"), "utf8"));
    expect(manifest.id).toBe("nl.example.mijnapp");
    expect(manifest.name).toBe("mijnapp");
  });
  it("weigert een bestaande niet-lege map", () => {
    scaffold("mijnapp", dir);
    expect(() => scaffold("mijnapp", dir)).toThrow(/bestaat al/);
  });
});

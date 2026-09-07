import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDb } from "./db";

describe("openDb", () => {
  it("maakt de ledentabel aan", () => {
    const db = openDb(":memory:");
    const rijen = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const namen = rijen.map((r) => (r as { name: string }).name);
    expect(namen).toContain("leden");
    expect(namen).toContain("webhook_gezien");
    db.close();
  });

  it("overleeft een herstart: tweemaal hetzelfde bestand openen behoudt de gegevens", () => {
    // Twee keer ":memory:" openen zou twee losse databases geven en dus niets
    // bewijzen. Het gaat om hetzelfde bestand twee keer openen, want dat is wat
    // er bij een herstart van de server gebeurt.
    const pad = join(mkdtempSync(join(tmpdir(), "plein-db-")), "plein.db");
    const eerste = openDb(pad);
    eerste
      .prepare("INSERT INTO leden (id, email, naam, status, aangemeld_op) VALUES (?, ?, ?, ?, ?)")
      .run("1", "a@example.org", "Aap", "aangemeld", "2026-09-06T00:00:00.000Z");
    eerste.close();

    const tweede = openDb(pad);
    const rij = tweede.prepare("SELECT naam FROM leden WHERE id = ?").get("1");
    expect((rij as { naam: string }).naam).toBe("Aap");
    tweede.close();
    rmSync(pad, { force: true });
  });

  it("dwingt af dat een e-mailadres maar één keer voorkomt", () => {
    const db = openDb(":memory:");
    const invoegen = db.prepare(
      "INSERT INTO leden (id, email, naam, status, aangemeld_op) VALUES (?, ?, ?, ?, ?)",
    );
    invoegen.run("1", "a@example.org", "Aap", "aangemeld", "2026-09-06T00:00:00.000Z");
    expect(() =>
      invoegen.run("2", "a@example.org", "Noot", "aangemeld", "2026-09-06T00:00:00.000Z"),
    ).toThrow();
    db.close();
  });
});

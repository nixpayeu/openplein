import { describe, it, expect } from "vitest";
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

  it("is idempotent: tweemaal openen gaat goed", () => {
    const db = openDb(":memory:");
    expect(() => openDb(":memory:")).not.toThrow();
    db.close();
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

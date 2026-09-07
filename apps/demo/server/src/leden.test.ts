import { describe, it, expect, beforeEach } from "vitest";
import { openDb } from "./db";
import { meldAan, vindOpEmail, zetStatus, alleLeden, alsCsv } from "./leden";
import type { DatabaseSync } from "node:sqlite";

let db: DatabaseSync;
beforeEach(() => { db = openDb(":memory:"); });

describe("meldAan", () => {
  it("maakt een lid met status aangemeld", () => {
    const lid = meldAan(db, "tim@example.org", "Tim");
    expect(lid.status).toBe("aangemeld");
    expect(lid.naam).toBe("Tim");
    expect(lid.id).toBeTruthy();
  });

  it("bewaart het adres in kleine letters", () => {
    expect(meldAan(db, "Tim@Example.org", "Tim").email).toBe("tim@example.org");
  });

  it("weigert een tweede aanmelding met hetzelfde adres", () => {
    meldAan(db, "tim@example.org", "Tim");
    expect(() => meldAan(db, "Tim@example.org", "Tim opnieuw")).toThrow();
  });

  it("weigert een lege naam", () => {
    expect(() => meldAan(db, "tim@example.org", "  ")).toThrow();
  });
});

describe("vindOpEmail", () => {
  it("vindt een lid, hoofdletterongevoelig", () => {
    meldAan(db, "tim@example.org", "Tim");
    expect(vindOpEmail(db, "TIM@EXAMPLE.ORG")?.naam).toBe("Tim");
  });

  it("geeft null voor een onbekend adres", () => {
    expect(vindOpEmail(db, "niemand@example.org")).toBeNull();
  });
});

describe("zetStatus", () => {
  it("wijzigt de status", () => {
    const lid = meldAan(db, "tim@example.org", "Tim");
    zetStatus(db, lid.id, "lid");
    expect(vindOpEmail(db, "tim@example.org")?.status).toBe("lid");
  });

  it("gooit bij een onbekend id", () => {
    expect(() => zetStatus(db, "bestaat-niet", "lid")).toThrow();
  });
});

describe("alleLeden", () => {
  it("geeft de leden terug, oudste aanmelding eerst", () => {
    meldAan(db, "een@example.org", "Een");
    meldAan(db, "twee@example.org", "Twee");
    expect(alleLeden(db).map((l) => l.naam)).toEqual(["Een", "Twee"]);
  });

  it("geeft een lege lijst zonder leden", () => {
    expect(alleLeden(db)).toEqual([]);
  });
});

describe("alsCsv", () => {
  it("begint met een kopregel", () => {
    expect(alsCsv([]).split("\n")[0]).toBe("naam,email,status,aangemeld_op");
  });

  it("zet een naam met een komma tussen aanhalingstekens", () => {
    meldAan(db, "tim@example.org", 'Tim, de "echte"');
    const regel = alsCsv(alleLeden(db)).split("\n")[1];
    expect(regel).toContain('"Tim, de ""echte"""');
  });

  it("beveiligt een naam die met een = begint tegen csv-formule-injectie", () => {
    meldAan(db, "tim@example.org", '=HYPERLINK("https://kwaadaardig/","klik")');
    const regel = alsCsv(alleLeden(db)).split("\n")[1];
    // Een apostrof vóór de = voorkomt dat Excel/LibreOffice dit als formule
    // uitvoert zodra de aanhalingstekens eromheen worden weggehaald.
    expect(regel).toContain('"\'=HYPERLINK(""https://kwaadaardig/"",""klik"")"');
    expect(regel.startsWith('"=')).toBe(false);
  });
});

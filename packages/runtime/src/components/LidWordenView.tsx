import { useState } from "react";
import { t } from "../i18n";

export interface Lid {
  id: string; email: string; naam: string;
  status: "aangemeld" | "lid" | "opgezegd"; aangemeldOp: string;
}

export function LidWordenView(props: { token: string; onLid: (lid: Lid) => void }) {
  const [naam, setNaam] = useState("");
  const [busy, setBusy] = useState(false);
  // Onderscheid 409 ("je bent al lid") van de rest: dezelfde melding tonen
  // zou de bezoeker onjuist informeren.
  const [error, setError] = useState<null | "alLid" | "mislukt">(null);

  async function meldAan() {
    const res = await fetch("/api/leden", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${props.token}` },
      body: JSON.stringify({ naam }),
    });
    if (res.status === 409) return setError("alLid");
    if (!res.ok) return setError("mislukt");
    setError(null);
    props.onLid((await res.json()) as Lid);
  }

  async function submit() {
    if (naam.trim() === "") return;
    setBusy(true);
    try { await meldAan(); }
    finally { setBusy(false); }
  }

  return (
    <div className="lid-worden">
      <h2>{t("lid.title")}</h2>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <label>{t("lid.naam")}
          <input value={naam} onChange={(e) => setNaam(e.target.value)} />
        </label>
        <button className="primary" disabled={busy} type="submit">
          {busy ? t("lid.busy") : t("lid.verstuur")}
        </button>
        {error && <p className="error">{t(error === "alLid" ? "lid.alLid" : "lid.error")}</p>}
      </form>
    </div>
  );
}

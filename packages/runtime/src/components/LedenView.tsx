import { useEffect, useState } from "react";
import { t } from "../i18n";

export interface Lid {
  id: string; email: string; naam: string;
  status: "aangemeld" | "lid" | "opgezegd"; aangemeldOp: string;
}

type Status = "laden" | "geladen" | "geenToegang";

/**
 * Ledenregister voor beheerders. Een 403 (geen beheerder) moet een expliciete
 * weigering opleveren, geen lege tabel: die twee zien er anders voor een
 * bestuurslid heel anders uit ("geen leden" vs. "geen toegang").
 */
export function LedenView(props: { token: string; onClose: () => void }) {
  const [leden, setLeden] = useState<Lid[]>([]);
  const [status, setStatus] = useState<Status>("laden");
  const [downloadMislukt, setDownloadMislukt] = useState(false);

  useEffect(() => {
    fetch("/api/leden", { headers: { Authorization: `Bearer ${props.token}` } })
      .then(async (res) => {
        if (!res.ok) return setStatus("geenToegang");
        setLeden((await res.json()) as Lid[]);
        setStatus("geladen");
      })
      .catch(() => setStatus("geenToegang"));
  }, [props.token]);

  // De csv-route vereist een token in de header; een gewone <a href> stuurt
  // dat niet mee. Daarom hier ophalen en aanbieden via een tijdelijke blob-URL.
  // Een 403 (bijv. een verlopen sessie) mag niet stil verdwijnen: zonder
  // zichtbare melding lijkt de knop dan gewoon niets te doen.
  async function download() {
    setDownloadMislukt(false);
    const res = await fetch("/api/leden.csv", { headers: { Authorization: `Bearer ${props.token}` } });
    if (!res.ok) return setDownloadMislukt(true);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = "leden.csv";
    // Sommige browsers vereisen dat het anker in het document staat vóór
    // een geprogrammeerde klik werkt.
    document.body.appendChild(a);
    a.click();
    a.remove();
    // revokeObjectURL ná a.click() synchroon aanroepen kan de download nog
    // afbreken; een macrotaak later is de download al gestart.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="leden">
      <h2>{t("leden.title")}</h2>
      {status === "geenToegang" && <p className="error">{t("leden.geenToegang")}</p>}
      {status === "geladen" && leden.length === 0 && <p>{t("leden.leeg")}</p>}
      {status === "geladen" && leden.length > 0 && (
        <>
          <table>
            <thead>
              <tr><th>{t("leden.naam")}</th><th>{t("leden.email")}</th><th>{t("leden.status")}</th></tr>
            </thead>
            <tbody>
              {leden.map((l) => (
                <tr key={l.id}><td>{l.naam}</td><td>{l.email}</td><td>{l.status}</td></tr>
              ))}
            </tbody>
          </table>
          <button className="primary" onClick={() => void download()}>{t("leden.download")}</button>
          {downloadMislukt && <p className="error">{t("leden.downloadMislukt")}</p>}
        </>
      )}
      <button onClick={props.onClose}>{t("miniapp.close")}</button>
    </div>
  );
}

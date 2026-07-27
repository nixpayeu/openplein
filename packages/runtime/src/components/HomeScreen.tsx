import type { PleinManifest } from "@openplein/sdk";
import { t } from "../i18n";

export function HomeScreen(props: {
  catalog: PleinManifest[]; onOpen: (app: PleinManifest) => void;
}) {
  return (
    <main className="home">
      <h1>{t("home.title")}</h1>
      <h2>{t("home.discover")}</h2>
      <div className="grid">
        {props.catalog.map((app) => (
          <button key={app.id} className="tile" onClick={() => props.onOpen(app)}>
            <img src={app.icon} alt="" width={48} height={48} />
            <span>{app.name}</span>
            <small>{t("miniapp.by", { provider: app.provider.name })}</small>
          </button>
        ))}
      </div>
    </main>
  );
}

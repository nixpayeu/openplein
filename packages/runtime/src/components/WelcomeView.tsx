import type { TenantConfig } from "@openplein/tenant";
import { welcomeFor } from "@openplein/tenant";
import type { Session } from "../App";
import { LoginView } from "./LoginView";
import { t, getLocale } from "../i18n";

export function WelcomeView(props: {
  onLogin: (s: Session) => void;
  tenant: TenantConfig | null;
  loadError: boolean;
}) {
  const naam = props.tenant?.name ?? "";
  const welkom = props.tenant ? welcomeFor(props.tenant, getLocale()) : null;
  return (
    <main className="welcome">
      {props.tenant?.logoUrl
        ? <img className="tenant-logo" src={props.tenant.logoUrl} alt={naam} />
        : <div className="bord-mini" role="img" aria-label={naam}>{naam}</div>}
      {props.loadError && <p className="error">{t("tenant.loadError")}</p>}
      <h1>{t("welcome.title", { name: naam })}</h1>
      {welkom && <p className="intro">{welkom.intro}</p>}
      {welkom?.sections?.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <ul>{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
        </section>
      ))}
      <LoginView onLogin={props.onLogin} name={naam} />
    </main>
  );
}

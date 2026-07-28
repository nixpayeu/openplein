import type { Session } from "../App";
import { LoginView } from "./LoginView";
import { t } from "../i18n";

export function WelcomeView(props: { onLogin: (s: Session) => void }) {
  return (
    <main className="welcome">
      <div className="bord-mini" role="img" aria-label="Plein">PLEIN</div>
      <p className="kicker">{t("welcome.kicker")}</p>
      <h1>{t("welcome.title")}</h1>
      <p className="intro">{t("welcome.intro")}</p>

      <section>
        <h2>{t("welcome.getTitle")}</h2>
        <ul>
          <li>{t("welcome.get1")}</li>
          <li>{t("welcome.get2")}</li>
        </ul>
      </section>

      <section>
        <h2>{t("welcome.howTitle")}</h2>
        <ol>
          <li>{t("welcome.how1")}</li>
          <li>{t("welcome.how2")}</li>
          <li>{t("welcome.how3")}</li>
        </ol>
      </section>

      <section>
        <h2>{t("welcome.dataTitle")}</h2>
        <ul>
          <li>{t("welcome.data1")}</li>
          <li>{t("welcome.data2")}</li>
          <li>{t("welcome.data3")}</li>
        </ul>
      </section>

      <section>
        <h2>{t("welcome.expectTitle")}</h2>
        <ul>
          <li>{t("welcome.expect1")}</li>
          <li>{t("welcome.expect2")}</li>
          <li>
            {t("welcome.expect3")}{" "}
            <a href="https://openplein.eu" target="_blank" rel="noopener noreferrer">openplein.eu</a>
          </li>
        </ul>
      </section>

      <LoginView onLogin={props.onLogin} />
    </main>
  );
}

import { useState } from "react";
import type { Session } from "../App";
import { t } from "../i18n";

export function LoginView(props: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [error, setError] = useState(false);

  async function sendCode() {
    const res = await fetch("/api/auth/request-code", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) { setError(false); setStage("code"); } else setError(true);
  }
  async function verify() {
    const res = await fetch("/api/auth/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) return setError(true);
    const { token } = (await res.json()) as { token: string };
    props.onLogin({ email, token });
  }

  return (
    <main className="login">
      <h1>{t("login.title")}</h1>
      {stage === "email" ? (
        <>
          <label>{t("login.email")}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="primary" onClick={() => void sendCode()}>{t("login.sendCode")}</button>
        </>
      ) : (
        <>
          <label>{t("login.code")}
            <input value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button className="primary" onClick={() => void verify()}>{t("login.verify")}</button>
        </>
      )}
      {error && <p className="error">{t("login.error")}</p>}
    </main>
  );
}

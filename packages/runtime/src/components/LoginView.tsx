import { useState } from "react";
import type { Session } from "../App";
import { t } from "../i18n";

export function LoginView(props: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  async function sendCode() {
    const res = await fetch("/api/auth/request-code", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return setError(true);
    setError(false);
    // In demo-modus (zonder SMTP) geeft de server de code in de response
    // terug; dan tonen we hem op het scherm en vullen we hem alvast in.
    let demo: string | null = null;
    if (res.status === 200 && res.headers.get("content-type")?.includes("json")) {
      demo = ((await res.json()) as { demoCode?: string }).demoCode ?? null;
    }
    setDemoCode(demo);
    if (demo) setCode(demo);
    setStage("code");
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

  async function submit() {
    setBusy(true);
    try { await (stage === "email" ? sendCode() : verify()); }
    finally { setBusy(false); }
  }

  return (
    <div className="login" id="start">
      <h1>{t("login.title")}</h1>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        {stage === "email" ? (
          <>
            <label>{t("login.email")}
              <input
                type="email" value={email} autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className="primary" disabled={busy} type="submit">
              {busy ? t("login.busy") : t("login.sendCode")}
            </button>
          </>
        ) : (
          <>
            {demoCode && (
              <div className="demo-code">
                {t("login.demoCode")}
                <strong>{demoCode}</strong>
                <small>{t("login.demoCodeWhy")}</small>
              </div>
            )}
            <label>{demoCode ? t("login.codeDemo") : t("login.code")}
              <input value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
            <button className="primary" disabled={busy} type="submit">
              {busy ? t("login.busy") : t("login.verify")}
            </button>
          </>
        )}
        {error && <p className="error">{t("login.error")}</p>}
      </form>
    </div>
  );
}

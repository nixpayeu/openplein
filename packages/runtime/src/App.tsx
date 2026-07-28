import { useEffect, useState, useCallback } from "react";
import type { PleinManifest, Permission } from "@openplein/sdk";
import { loadCatalog } from "./catalog";
import { PermissionStore } from "./permissions";
import { HomeScreen } from "./components/HomeScreen";
import { MiniAppView } from "./components/MiniAppView";
import { PermissionDialog } from "./components/PermissionDialog";
import { WelcomeView } from "./components/WelcomeView";
import { t } from "./i18n";

export interface Session { email: string; token: string }
const permissionStore = new PermissionStore();

interface PermissionRequest {
  app: PleinManifest; permission: Permission; resolve: (ok: boolean) => void;
}

export function App() {
  const [catalog, setCatalog] = useState<PleinManifest[]>([]);
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem("plein.session");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      // Corrupte/onleesbare localStorage-waarde mag de shell niet bricken:
      // opruimen en gewoon uitgelogd starten.
      localStorage.removeItem("plein.session");
      return null;
    }
  });
  const [active, setActive] = useState<PleinManifest | null>(null);
  const [permReq, setPermReq] = useState<PermissionRequest | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    void loadCatalog().then(setCatalog).catch((e) => console.warn("Catalogus laden mislukt:", e));
  }, []);

  useEffect(() => {
    const onCheckout = (e: Event) => {
      const detail = (e as CustomEvent<{ checkoutUrl: string }>).detail;
      setCheckoutUrl(detail.checkoutUrl);
    };
    const onCheckoutDone = () => setCheckoutUrl(null);
    window.addEventListener("plein:checkout", onCheckout);
    window.addEventListener("plein:checkout-done", onCheckoutDone);
    return () => {
      window.removeEventListener("plein:checkout", onCheckout);
      window.removeEventListener("plein:checkout-done", onCheckoutDone);
    };
  }, []);

  const gate = useCallback(async (app: PleinManifest, permission: Permission) => {
    const d = permissionStore.decision(app.id, permission);
    if (d !== "unset") return d === "granted";
    return new Promise<boolean>((resolve) => setPermReq({ app, permission, resolve }));
  }, []);

  const answerPermission = (ok: boolean) => {
    if (!permReq) return;
    if (ok) permissionStore.grant(permReq.app.id, permReq.permission);
    else permissionStore.deny(permReq.app.id, permReq.permission);
    permReq.resolve(ok);
    setPermReq(null);
  };

  const login = (s: Session) => {
    localStorage.setItem("plein.session", JSON.stringify(s));
    setSession(s);
  };

  const closeMiniApp = () => {
    if (permReq) { permReq.resolve(false); setPermReq(null); }
    setActive(null);
  };

  if (!session) return <WelcomeView onLogin={login} />;
  return (
    <>
      {active ? (
        <MiniAppView app={active} session={session} gate={gate} onClose={closeMiniApp} />
      ) : (
        <HomeScreen catalog={catalog} onOpen={setActive} />
      )}
      {permReq && (
        <PermissionDialog
          appName={permReq.app.name} permission={permReq.permission}
          onAnswer={answerPermission}
        />
      )}
      {checkoutUrl && (
        <div className="dialog-backdrop" role="dialog" aria-modal="true">
          <div className="dialog">
            <h3>{t("checkout.title")}</h3>
            <div className="dialog-actions">
              <button onClick={() => setCheckoutUrl(null)}>{t("miniapp.close")}</button>
              <a
                className="primary" href={checkoutUrl} target="_blank" rel="noopener noreferrer"
                onClick={() => setCheckoutUrl(null)}
              >
                {t("checkout.open")}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

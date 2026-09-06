import { useEffect, useState, useCallback } from "react";
import type { PleinManifest, Permission } from "@openplein/sdk";
import type { TenantConfig } from "@openplein/tenant";
import { loadTenant, applyTenantBranding } from "./catalog";
import { PermissionStore } from "./permissions";
import { HomeScreen } from "./components/HomeScreen";
import { MiniAppView } from "./components/MiniAppView";
import { PermissionDialog } from "./components/PermissionDialog";
import { WelcomeView } from "./components/WelcomeView";
import { LidWordenView } from "./components/LidWordenView";
import { LedenView } from "./components/LedenView";
import { t } from "./i18n";

export interface Session { email: string; token: string }
const permissionStore = new PermissionStore();

interface PermissionRequest {
  app: PleinManifest; permission: Permission; resolve: (ok: boolean) => void;
}

export function App() {
  const [catalog, setCatalog] = useState<PleinManifest[]>([]);
  const [tenantName, setTenantName] = useState("");
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [tenantError, setTenantError] = useState(false);
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
  // "onbekend" zolang de statuscheck nog loopt: dat voorkomt dat het
  // aanmeldformulier even opflitst voor iemand die al lid is.
  const [lidStatus, setLidStatus] = useState<"onbekend" | "lid" | "geenLid">("onbekend");
  const [beheerder, setBeheerder] = useState(false);
  const [toonLeden, setToonLeden] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetch("/api/leden/mij", { headers: { Authorization: `Bearer ${session.token}` } })
      .then((res) => setLidStatus(res.ok ? "lid" : "geenLid"))
      .catch((e) => {
        // Een randvoorziening die hapert mag het plein niet blokkeren: een
        // overbodig aanmeldformulier is minder erg dan een leeg scherm.
        console.warn("Lidmaatschap ophalen mislukt:", e);
        setLidStatus("geenLid");
      });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/leden/beheerder", { headers: { Authorization: `Bearer ${session.token}` } })
      .then((res) => (res.ok ? res.json() : { beheerder: false }))
      .then((data: { beheerder: boolean }) => setBeheerder(data.beheerder))
      .catch((e) => {
        // Zelfde redenering als bij lidStatus: geen knop tonen is veiliger
        // dan gokken dat iemand beheerder is.
        console.warn("Beheerderstatus ophalen mislukt:", e);
        setBeheerder(false);
      });
  }, [session]);

  useEffect(() => {
    void loadTenant()
      .then(({ tenant, catalog }) => {
        applyTenantBranding(tenant);
        setTenantName(tenant.name);
        setTenant(tenant);
        setCatalog(catalog);
      })
      .catch((e) => {
        console.warn("Tenant laden mislukt:", e);
        setTenantError(true);
      });
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

  if (!session) return <WelcomeView onLogin={login} tenant={tenant} loadError={tenantError} />;
  return (
    <>
      {active ? (
        <MiniAppView app={active} session={session} gate={gate} onClose={closeMiniApp} />
      ) : (
        <>
          {tenantError && <p className="error">{t("tenant.loadError")}</p>}
          {toonLeden ? (
            <LedenView token={session.token} onClose={() => setToonLeden(false)} />
          ) : (
            <>
              {lidStatus === "geenLid" && (
                <LidWordenView token={session.token} onLid={() => setLidStatus("lid")} />
              )}
              <HomeScreen
                catalog={catalog} onOpen={setActive} title={tenantName}
                beheerder={beheerder} onOpenLeden={() => setToonLeden(true)}
              />
            </>
          )}
        </>
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

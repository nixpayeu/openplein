import { useEffect, useState, useCallback } from "react";
import type { PleinManifest, Permission } from "@openplein/sdk";
import { loadCatalog } from "./catalog";
import { PermissionStore } from "./permissions";
import { HomeScreen } from "./components/HomeScreen";
import { MiniAppView } from "./components/MiniAppView";
import { PermissionDialog } from "./components/PermissionDialog";
import { LoginView } from "./components/LoginView";

export interface Session { email: string; token: string }
const permissionStore = new PermissionStore();

interface PermissionRequest {
  app: PleinManifest; permission: Permission; resolve: (ok: boolean) => void;
}

export function App() {
  const [catalog, setCatalog] = useState<PleinManifest[]>([]);
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem("plein.session");
    return raw ? (JSON.parse(raw) as Session) : null;
  });
  const [active, setActive] = useState<PleinManifest | null>(null);
  const [permReq, setPermReq] = useState<PermissionRequest | null>(null);

  useEffect(() => { void loadCatalog().then(setCatalog); }, []);

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

  if (!session) return <LoginView onLogin={login} />;
  return (
    <>
      {active ? (
        <MiniAppView app={active} session={session} gate={gate} onClose={() => setActive(null)} />
      ) : (
        <HomeScreen catalog={catalog} onOpen={setActive} />
      )}
      {permReq && (
        <PermissionDialog
          appName={permReq.app.name} permission={permReq.permission}
          onAnswer={answerPermission}
        />
      )}
    </>
  );
}

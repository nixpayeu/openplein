import { useEffect, useRef } from "react";
import { PleinHost } from "@openplein/bridge";
import type { PleinManifest, Permission } from "@openplein/sdk";
import type { Session } from "../App";
import { storageProvider } from "../providers/storage";
import { identityProvider } from "../providers/identity";
import { paymentsProvider } from "../providers/payments";
import { t } from "../i18n";

export function MiniAppView(props: {
  app: PleinManifest; session: Session;
  gate: (app: PleinManifest, p: Permission) => Promise<boolean>;
  onClose: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    const identity = identityProvider(() => props.session);
    const host = new PleinHost({
      manifest: props.app,
      source: frame.contentWindow,
      gate: (_appId, p) => props.gate(props.app, p),
      providers: {
        pay: (appId, params) => paymentsProvider.pay(appId, params, props.session.token),
        identityRequest: (appId) => identity.request(appId),
        storageGet: (appId, key) => storageProvider.get(appId, key),
        storageSet: (appId, key, value) => storageProvider.set(appId, key, value),
      },
    });
    host.start();
    return () => host.stop();
  }, [props.app, props.session, props.gate]);

  return (
    <div className="miniapp">
      <header>
        <button onClick={props.onClose}>← {t("miniapp.close")}</button>
        <span>{props.app.name}</span>
      </header>
      <iframe
        ref={iframeRef} src={props.app.entry} title={props.app.name}
        sandbox="allow-scripts allow-forms"
      />
    </div>
  );
}

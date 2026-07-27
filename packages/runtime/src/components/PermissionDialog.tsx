import type { Permission } from "@openplein/sdk";
import { t } from "../i18n";

export function PermissionDialog(props: {
  appName: string; permission: Permission; onAnswer: (ok: boolean) => void;
}) {
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <div className="dialog">
        <h3>{t("perm.title")}</h3>
        <p>{t("perm.body", { app: props.appName, permission: t(`perm.${props.permission}`) })}</p>
        <div className="dialog-actions">
          <button onClick={() => props.onAnswer(false)}>{t("perm.deny")}</button>
          <button className="primary" onClick={() => props.onAnswer(true)}>{t("perm.allow")}</button>
        </div>
      </div>
    </div>
  );
}

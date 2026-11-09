import type { RoleEditorAlert as RoleEditorAlertValue } from "@/features/role-management/components/role-editor-model";
import { RoleImpactAccountList } from "@/features/role-management/components/role-impact-account-list";
import type { RoleImpactAccount } from "@/features/role-management/domain/role-management";

type RoleEditorAlertProps = Readonly<{
  alert: RoleEditorAlertValue;
  /** Set after a duplicate-name rejection; offers a jump to the existing role. */
  duplicateRoleId?: string;
  impactAccounts: readonly RoleImpactAccount[];
  onOpenExisting(roleId: string): void;
  onReload(): void;
}>;

const linkButtonClassName =
  "mt-2 min-h-11 rounded-control px-2 font-semibold underline underline-offset-4";

/**
 * Danger alerts may list blocking accounts; warning alerts (version conflict)
 * offer reloading the latest data.
 */
export function RoleEditorAlert({
  alert,
  duplicateRoleId,
  impactAccounts,
  onOpenExisting,
  onReload,
}: RoleEditorAlertProps) {
  return (
    <div
      className={`rounded-control border p-4 text-sm leading-6 ${
        alert.tone === "danger"
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-warning/30 bg-warning-soft text-warning"
      }`}
      role="alert"
    >
      <p>{alert.message}</p>
      {duplicateRoleId && (
        <button
          className={linkButtonClassName}
          onClick={() => onOpenExisting(duplicateRoleId)}
          type="button"
        >
          Mở vai trò đã có
        </button>
      )}
      {alert.tone === "warning" && (
        <button className={linkButtonClassName} onClick={onReload} type="button">
          Tải dữ liệu mới nhất
        </button>
      )}
      {impactAccounts.length > 0 && alert.tone === "danger" && (
        <div className="mt-3 text-text">
          <RoleImpactAccountList accounts={impactAccounts} />
        </div>
      )}
    </div>
  );
}

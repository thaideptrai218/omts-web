import {
  roleEditorEyebrow,
  roleStatusLabel,
  type RoleEditorMode,
} from "@/features/role-management/components/role-editor-model";
import type { RoleDetails } from "@/features/role-management/domain/role-management";

type RoleEditorHeaderProps = Readonly<{
  isExistingRole: boolean;
  mode: RoleEditorMode;
  role?: RoleDetails;
}>;

export function RoleEditorHeader({
  isExistingRole,
  mode,
  role,
}: RoleEditorHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
      <div>
        <p className="text-sm font-semibold text-primary">
          {roleEditorEyebrow(mode)}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text">
          {mode === "create" ? "Vai trò mới" : (role?.name ?? "Vai trò")}
        </h2>
      </div>
      <span
        className={`w-fit rounded-full px-3 py-1.5 text-sm font-semibold ${
          role?.status === "discontinued"
            ? "bg-surface-subtle text-text-muted"
            : "bg-emerald-50 text-success"
        }`}
      >
        {roleStatusLabel(isExistingRole ? role : undefined)}
      </span>
    </div>
  );
}

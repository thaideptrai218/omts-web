import type {
  FeatureCatalogItem,
  RoleDetails,
  RolePermission,
} from "@/features/role-management/domain/role-management";
import { createEmptyPermission } from "@/features/role-management/lib/role-permission-rules";

// Pure view-model helpers for the role editor (no React, no I/O).

export type RoleEditorMode = "copy" | "create" | "edit";

export type RoleEditorAlert = Readonly<{
  message: string;
  tone: "danger" | "warning";
}>;

/** One permission row per catalog feature, copied from `source` when present. */
export function createInitialPermissions(
  catalog: readonly FeatureCatalogItem[],
  source?: RoleDetails,
): readonly RolePermission[] {
  return catalog.map((feature) => {
    const permission = source?.permissions.find(
      (item) => item.featureCode === feature.code,
    );
    return permission
      ? { ...permission, actionKeys: [...permission.actionKeys] }
      : createEmptyPermission(feature.code);
  });
}

/** Copy mode pre-fills "Bản sao của <tên>"; other modes start from the role name. */
export function initialRoleName(
  mode: RoleEditorMode,
  role?: RoleDetails,
): string {
  return mode === "copy" && role ? `Bản sao của ${role.name}` : (role?.name ?? "");
}

export function roleStatusLabel(role?: RoleDetails): string {
  if (!role) return "Vai trò mới";
  return role.status === "in-use" ? "Đang sử dụng" : "Đã ngừng dùng";
}

export function roleEditorEyebrow(mode: RoleEditorMode): string {
  if (mode === "create") return "Tạo vai trò";
  if (mode === "copy") return "Sao chép vai trò";
  return "Chi tiết vai trò";
}

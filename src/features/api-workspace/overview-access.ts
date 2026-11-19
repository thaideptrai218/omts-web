import type { FunctionPermission } from "@/features/access/domain/function-permission";
import { workspaceRoleLabel } from "@/shared/presentation/actor-label";

/**
 * Ai thấy màn Tổng quan có số liệu: Chủ hợp tác xã, và Kế toán có quyền xem báo cáo bán hàng trên mọi vùng
 * (backend từ chối Kế toán bị giới hạn vùng nên không hiện màn này cho họ).
 */
export function canSeeOverview(identity: Readonly<{ subjectType: string }>, permissions: readonly FunctionPermission[]): boolean {
  if (identity.subjectType === "CooperativeOwner") return true;
  if (identity.subjectType !== "Staff") return false;
  const allZoneReports = permissions.some((item) => item.functionCode === "SALES_REPORTS" && item.action === "View" && item.scope.kind === "all-zones");
  return allZoneReports && workspaceRoleLabel(identity.subjectType, permissions).includes("Kế toán");
}

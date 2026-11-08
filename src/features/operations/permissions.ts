import type { FunctionPermission } from "@/features/access/domain/function-permission";
export const operationAreas = ["job-types", "seeding", "material-usages", "harvest", "cultivation-cycles", "purchase-receipts", "supplier-payments", "water", "sales-products", "purchase-requests", "workforce", "my-work"] as const;
export type OperationArea = typeof operationAreas[number];
export const operationModules: readonly { key: OperationArea; title: string; functionCode: string }[] = [
  { key: "job-types", title: "Loại công việc và đơn giá", functionCode: "PAY_RULES" },
  { key: "seeding", title: "Thả giống", functionCode: "CULTIVATION_CYCLES" },
  { key: "material-usages", title: "Sử dụng vật tư", functionCode: "CULTIVATION_CYCLES" },
  { key: "harvest", title: "Thu hoạch", functionCode: "HARVESTS" },
  { key: "cultivation-cycles", title: "Chu kỳ nuôi", functionCode: "CULTIVATION_CYCLES" },
  { key: "purchase-receipts", title: "Phiếu nhập vật tư", functionCode: "PURCHASE_RECEIPTS" },
  { key: "supplier-payments", title: "Thanh toán nhà cung cấp", functionCode: "SUPPLIER_PAYMENTS" },
  { key: "water", title: "Theo dõi chất lượng nước", functionCode: "WATER_MEASUREMENTS" },
  { key: "sales-products", title: "Danh mục sản phẩm hàu", functionCode: "" },
  { key: "purchase-requests", title: "Yêu cầu mua hàu", functionCode: "PURCHASE_REQUESTS" },
  { key: "workforce", title: "Phân công và chấm công", functionCode: "WORK_ASSIGNMENTS" },
  { key: "my-work", title: "Công việc và nghỉ phép", functionCode: "" },
];
export function operationAllowed(area: OperationArea, identity: { subjectType: string }, permissions: readonly FunctionPermission[], action = "View", zoneId?: string) {
  if (area === "my-work") return identity.subjectType === "Staff";
  if (area === "sales-products") return identity.subjectType === "CooperativeOwner" || action === "View" && (identity.subjectType === "Trader" || identity.subjectType === "Staff" && permissions.some(p => p.functionCode === "SALES_INVOICES" && p.action === "Create"));
  if (area === "purchase-requests") {
    if (["Mine", "Submit", "CancelMine"].includes(action)) return identity.subjectType === "Trader";
    if (identity.subjectType === "Trader") return action === "View";
    if (identity.subjectType === "CooperativeOwner") return true;
    return identity.subjectType === "Staff" && ["View", "Review"].includes(action) && permissions.some((p) => p.functionCode === "PURCHASE_REQUESTS" && p.action === "View"
      && p.dataScope === "AssignedZone" && (p.scope.kind === "all-zones" || p.scope.zoneIds.length > 0));
  }
  if (area === "workforce") {
    if (identity.subjectType === "CooperativeOwner") return true;
    const codes = action === "View" ? ["WORK_ASSIGNMENTS", "ATTENDANCE"] : action === "AttendanceCreate" ? ["ATTENDANCE"] : ["WORK_ASSIGNMENTS"];
    const verb = action === "AttendanceCreate" ? "Create" : action;
    return identity.subjectType === "Staff" && ["View", "Create", "Edit", "Delete", "AttendanceCreate"].includes(action) && permissions.some((p) => codes.includes(p.functionCode) && p.action === verb
      && p.dataScope === "AssignedZone" && (p.scope.kind === "all-zones" || (zoneId ? p.scope.zoneIds.includes(zoneId) : p.scope.zoneIds.length > 0)));
  }
  if (identity.subjectType === "CooperativeOwner") return true;
  if (identity.subjectType !== "Staff" || action === "Thresholds") return false;
  if (process.env.NEXT_PUBLIC_OMTS_PURCHASING_CONTRACT === "v2" && ["purchase-receipts", "supplier-payments"].includes(area)) return permissions.some(p => p.functionCode === (area === "purchase-receipts" ? "PURCHASE_RECEIPTS" : "SUPPLIER_PAYMENTS") && p.action === action && (p.scope.kind === "all-zones" || p.scope.zoneIds.length > 0));
  const logAction = area === "cultivation-cycles" && ["LogsView", "LogsCreate", "LogsEdit", "LogsDelete"].includes(action);
  const code = logAction ? "CULTIVATION_LOGS" : operationModules.find((entry) => entry.key === area)!.functionCode;
  const requiredAction = logAction ? action.slice(4) : action;
  const grants = permissions.filter((entry) => entry.functionCode === code && entry.action === requiredAction);
  const assigned = grants.filter((entry) => entry.dataScope === "AssignedZone");
  const coversZone = (zone: string) => assigned.some((entry) => entry.scope.kind === "all-zones" || entry.scope.zoneIds.includes(zone));
  // The current backend INP/ENV guards limit zones, but do not filter OwnRecords.
  // Do not let an unsupported own-only grant widen a list, export or ID action.
  // An AssignedZone grant covering the same scope legitimately supplies access.
  if (grants.some((entry) => entry.dataScope === "OwnRecords" && (entry.scope.kind === "all-zones"
    ? !assigned.some((grant) => grant.scope.kind === "all-zones") : entry.scope.zoneIds.some((zone) => !coversZone(zone))))) return false;
  return assigned.some((entry) => entry.functionCode === code && entry.action === requiredAction
    && (area !== "supplier-payments" || entry.scope.kind === "all-zones")
    && (!zoneId || entry.scope.kind === "all-zones" || entry.scope.kind === "zones" && entry.scope.zoneIds.includes(zoneId)));
}

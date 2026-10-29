import type { FunctionPermission } from "@/features/access/domain/function-permission";
export const operationAreas = ["purchase-receipts", "supplier-payments", "water"] as const;
export type OperationArea = typeof operationAreas[number];
export const operationModules: readonly { key: OperationArea; title: string; functionCode: string }[] = [
  { key: "purchase-receipts", title: "Phiếu nhập", functionCode: "PURCHASE_RECEIPTS" },
  { key: "supplier-payments", title: "Thanh toán nhà cung cấp", functionCode: "SUPPLIER_PAYMENTS" },
  { key: "water", title: "Đo nước", functionCode: "WATER_MEASUREMENTS" },
];
export function operationAllowed(area: OperationArea, identity: { subjectType: string }, permissions: readonly FunctionPermission[], action = "View", zoneId?: string) {
  if (identity.subjectType === "CooperativeOwner") return true;
  if (identity.subjectType !== "Staff" || action === "Thresholds") return false;
  const code = operationModules.find((entry) => entry.key === area)!.functionCode;
  const grants = permissions.filter((entry) => entry.functionCode === code && entry.action === action);
  const assigned = grants.filter((entry) => entry.dataScope === "AssignedZone");
  const coversZone = (zone: string) => assigned.some((entry) => entry.scope.kind === "all-zones" || entry.scope.zoneIds.includes(zone));
  // The current backend INP/ENV guards limit zones, but do not filter OwnRecords.
  // Do not let an unsupported own-only grant widen a list, export or ID action.
  // An AssignedZone grant covering the same scope legitimately supplies access.
  if (grants.some((entry) => entry.dataScope === "OwnRecords" && (entry.scope.kind === "all-zones"
    ? !assigned.some((grant) => grant.scope.kind === "all-zones") : entry.scope.zoneIds.some((zone) => !coversZone(zone))))) return false;
  return assigned.some((entry) => entry.functionCode === code && entry.action === action
    && (area !== "supplier-payments" || entry.scope.kind === "all-zones")
    && (!zoneId || entry.scope.kind === "all-zones" || entry.scope.kind === "zones" && entry.scope.zoneIds.includes(zoneId)));
}

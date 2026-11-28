import type { FunctionPermission } from "@/features/access/domain/function-permission";
export const operationAreas = ["job-types", "seeding", "material-usages", "harvest", "cultivation-cycles", "purchase-receipts", "supplier-payments", "water", "sales-products", "sales-invoices", "customer-payments", "lot-tracing", "harvest-yield", "claim-reports", "quality-claims", "sales-returns", "sales-invoice-list", "payroll", "payroll-payments", "sales-report", "price-trend-report", "after-sales-report", "end-of-day-report", "product-report", "customer-report", "supplier-report", "financial-report", "purchase-requests", "workforce", "my-work", "seed-lots", "labor-costs"] as const;
/** `payroll-payments` is not a screen: it is the BFF area that pays wages and reads the payments (the sheet, the payslip and the employee debt tab use it). */
export type OperationArea = typeof operationAreas[number];
/** Báo cáo kiểu KiotViet chưa có màn: ẩn khỏi menu/dashboard và bị từ chối ở mọi lớp cho tới khi màn xong (xoá khỏi danh sách khi hoàn thành). */
const unfinishedAreas: readonly OperationArea[] = [];
export const operationModules: readonly { key: OperationArea; title: string; functionCode: string }[] = [
  { key: "job-types", title: "Loại công việc và đơn giá", functionCode: "PAY_RULES" },
  { key: "seeding", title: "Thả giống", functionCode: "CULTIVATION_CYCLES" },
  { key: "material-usages", title: "Sử dụng vật tư", functionCode: "CULTIVATION_CYCLES" },
  { key: "harvest", title: "Thu hoạch", functionCode: "HARVESTS" },
  { key: "cultivation-cycles", title: "Hành trình", functionCode: "CULTIVATION_CYCLES" },
  { key: "purchase-receipts", title: "Phiếu nhập vật tư", functionCode: "PURCHASE_RECEIPTS" },
  { key: "supplier-payments", title: "Thanh toán nhà cung cấp", functionCode: "SUPPLIER_PAYMENTS" },
  { key: "water", title: "Theo dõi chất lượng nước", functionCode: "WATER_MEASUREMENTS" },
  { key: "sales-products", title: "Danh mục sản phẩm hàu", functionCode: "" },
  { key: "sales-invoices", title: "Lập hóa đơn bán", functionCode: "SALES_INVOICES" },
  { key: "customer-payments", title: "Thanh toán của khách", functionCode: "CUSTOMER_PAYMENTS" },
  { key: "lot-tracing", title: "Truy xuất lô hàng", functionCode: "LOT_TRACING" },
  { key: "harvest-yield", title: "Sản lượng nuôi", functionCode: "HARVEST_LOTS" },
  { key: "claim-reports", title: "Báo vấn đề chất lượng", functionCode: "QUALITY_CLAIMS" },
  { key: "quality-claims", title: "Khiếu nại chất lượng", functionCode: "QUALITY_CLAIMS" },
  { key: "sales-returns", title: "Trả hàng bán", functionCode: "SALES_RETURNS" },
  { key: "sales-invoice-list", title: "Hóa đơn bán", functionCode: "SALES_INVOICES" },
  { key: "payroll", title: "Bảng lương", functionCode: "PAYROLL" },
  { key: "sales-report", title: "Bán hàng", functionCode: "SALES_REPORTS" },
  { key: "price-trend-report", title: "Xu hướng giá", functionCode: "SALES_REPORTS" },
  { key: "after-sales-report", title: "Vấn đề sau bán", functionCode: "SALES_REPORTS" },
  // Báo cáo kiểu KiotViet: Chủ HTX và Kế toán (nhân viên có quyền SALES_REPORTS tương ứng) xem được, theo quyết định phase 0 (D5).
  { key: "end-of-day-report", title: "Cuối ngày", functionCode: "SALES_REPORTS" },
  { key: "product-report", title: "Hàng hóa", functionCode: "SALES_REPORTS" },
  { key: "customer-report", title: "Khách hàng", functionCode: "SALES_REPORTS" },
  { key: "supplier-report", title: "Nhà cung cấp", functionCode: "SALES_REPORTS" },
  { key: "financial-report", title: "Tài chính", functionCode: "SALES_REPORTS" },
  { key: "purchase-requests", title: "Yêu cầu mua hàu", functionCode: "PURCHASE_REQUESTS" },
  { key: "workforce", title: "Phân công và chấm công", functionCode: "WORK_ASSIGNMENTS" },
  { key: "my-work", title: "Công việc và nghỉ phép", functionCode: "" },
  { key: "seed-lots", title: "Lô giống", functionCode: "PURCHASE_RECEIPTS" },
  { key: "labor-costs", title: "Chi phí nhân công", functionCode: "PAYROLL" },
];
export function operationAllowed(area: OperationArea, identity: { subjectType: string }, permissions: readonly FunctionPermission[], action = "View", zoneId?: string) {
  if (unfinishedAreas.includes(area)) return false;
  if (area === "my-work") return identity.subjectType === "Staff";
  // Bảng lương, Thanh toán lương và Chi phí nhân công: Chủ hợp tác xã làm mọi việc; Kế toán lập, sửa, xuất theo đúng quyền PAYROLL được cấp (SRS v6.2, BF-06.2).
  if (area === "payroll" || area === "payroll-payments" || area === "labor-costs") return identity.subjectType === "CooperativeOwner"
    || identity.subjectType === "Staff" && permissions.some((p) => p.functionCode === "PAYROLL" && p.action === action);
  // Báo vấn đề chất lượng chỉ dành cho thương lái: Chủ HTX không có hồ sơ khách hàng nên backend trả 403.
  if (area === "claim-reports") return identity.subjectType === "Trader";
  // Thanh toán của khách là chức năng toàn HTX (không theo vùng): Chủ HTX hoặc nhân viên có quyền CUSTOMER_PAYMENTS đúng hành động.
  if (area === "customer-payments") return identity.subjectType === "CooperativeOwner" || identity.subjectType === "Staff" && permissions.some((p) => p.functionCode === "CUSTOMER_PAYMENTS" && p.action === action && (p.scope.kind === "all-zones" || p.scope.zoneIds.length > 0));
  if (area === "sales-products") return identity.subjectType === "CooperativeOwner" || action === "View" && (identity.subjectType === "Trader" || identity.subjectType === "Staff" && permissions.some(p => p.functionCode === "SALES_INVOICES" && p.action === "Create"));
  if (area === "purchase-requests") {
    if (["Mine", "Submit", "CancelMine"].includes(action)) return identity.subjectType === "Trader";
    if (identity.subjectType === "Trader") return action === "View";
    if (identity.subjectType === "CooperativeOwner") return true;
    return identity.subjectType === "Staff" && ["View", "Review"].includes(action) && permissions.some((p) => p.functionCode === "PURCHASE_REQUESTS" && p.action === "View"
      && p.dataScope === "AssignedZone" && (p.scope.kind === "all-zones" || p.scope.zoneIds.length > 0));
  }
  // Lô giống follows the receipts: PURCHASE_RECEIPTS View reads the lots and Export takes the file, with no zone scope (a seed lot is a receipt line).
  if (area === "seed-lots") {
    if (identity.subjectType === "CooperativeOwner") return true;
    return identity.subjectType === "Staff" && ["View", "Export"].includes(action) && permissions.some((p) => p.functionCode === "PURCHASE_RECEIPTS" && p.action === action);
  }
  if (area === "workforce") {
    if (identity.subjectType === "CooperativeOwner") return true;
    // AttendanceEdit = correct attendance and review leave requests: ATTENDANCE Edit in the zone (the Owner is handled above, settings stay Owner-only).
    const attendance = action === "AttendanceCreate" || action === "AttendanceEdit";
    const codes = action === "View" ? ["WORK_ASSIGNMENTS", "ATTENDANCE"] : attendance ? ["ATTENDANCE"] : ["WORK_ASSIGNMENTS"];
    const verb = action === "AttendanceCreate" ? "Create" : action === "AttendanceEdit" ? "Edit" : action;
    return identity.subjectType === "Staff" && ["View", "Create", "Edit", "Delete", "AttendanceCreate", "AttendanceEdit"].includes(action) && permissions.some((p) => codes.includes(p.functionCode) && p.action === verb
      && p.dataScope === "AssignedZone" && (p.scope.kind === "all-zones" || (zoneId ? p.scope.zoneIds.includes(zoneId) : p.scope.zoneIds.length > 0)));
  }
  if (identity.subjectType === "CooperativeOwner") return true;
  if (identity.subjectType !== "Staff" || action === "Thresholds") return false;
  if (area === "purchase-receipts" || area === "supplier-payments") return permissions.some(p => p.functionCode === (area === "purchase-receipts" ? "PURCHASE_RECEIPTS" : "SUPPLIER_PAYMENTS") && p.action === action && (p.scope.kind === "all-zones" || p.scope.zoneIds.length > 0));
  const logAction = area === "cultivation-cycles" && ["LogsView", "LogsCreate", "LogsEdit", "LogsDelete"].includes(action);
  // Truy xuất lô: công bố nguồn gốc và sửa dữ liệu truy xuất thuộc chức năng PROVENANCE (Publish / Edit), còn xem và xuất thuộc LOT_TRACING.
  const provenance = area === "lot-tracing" && (action === "Publish" || action === "Correct");
  const code = logAction ? "CULTIVATION_LOGS" : provenance ? "PROVENANCE" : operationModules.find((entry) => entry.key === area)!.functionCode;
  const requiredAction = logAction ? action.slice(4) : action === "Correct" ? "Edit" : action;
  const grants = permissions.filter((entry) => entry.functionCode === code && entry.action === requiredAction);
  const assigned = grants.filter((entry) => entry.dataScope === "AssignedZone");
  const coversZone = (zone: string) => assigned.some((entry) => entry.scope.kind === "all-zones" || entry.scope.zoneIds.includes(zone));
  // The current backend INP/ENV guards limit zones, but do not filter OwnRecords.
  // Do not let an unsupported own-only grant widen a list, export or ID action.
  // An AssignedZone grant covering the same scope legitimately supplies access.
  if (grants.some((entry) => entry.dataScope === "OwnRecords" && (entry.scope.kind === "all-zones"
    ? !assigned.some((grant) => grant.scope.kind === "all-zones") : entry.scope.zoneIds.some((zone) => !coversZone(zone))))) return false;
  return assigned.some((entry) => entry.functionCode === code && entry.action === requiredAction
    && (!zoneId || entry.scope.kind === "all-zones" || entry.scope.kind === "zones" && entry.scope.zoneIds.includes(zoneId)));
}

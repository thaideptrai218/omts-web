/**
 * Ai được xem danh sách và hồ sơ nhân viên (chỉ đọc) ngoài Chủ hợp tác xã.
 * Kế toán (đối chiếu phiếu lương với người nhận) và Quản lý vùng (phân công, chấm công nhân viên trong vùng) đều có LABOR_WORKERS View;
 * backend lọc theo vùng được cấp và ẩn dữ liệu cá nhân, ngân hàng (canMaintain = false). Quyết định 20/11/2026: Quản lý vùng cần màn này.
 */
export function canReadEmployees(identity: { subjectType: string }, functions: readonly { functionCode: string; action: string }[]) {
  if (identity.subjectType === "CooperativeOwner") return true;
  return identity.subjectType === "Staff"
    && functions.some((entry) => entry.functionCode === "LABOR_WORKERS" && entry.action === "View");
}

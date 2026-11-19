/**
 * Ai được xem danh sách và hồ sơ nhân viên (chỉ đọc) ngoài Chủ hợp tác xã.
 * Kế toán có LABOR_WORKERS View và PAYROLL View để đối chiếu phiếu lương với người nhận; backend ẩn dữ liệu cá nhân và ngân hàng
 * (canMaintain = false). Quản lý vùng cũng có LABOR_WORKERS View nhưng không có PAYROLL nên màn Nhân viên vẫn không hiện cho họ.
 */
export function canReadEmployees(identity: { subjectType: string }, functions: readonly { functionCode: string; action: string }[]) {
  if (identity.subjectType === "CooperativeOwner") return true;
  return identity.subjectType === "Staff"
    && functions.some((entry) => entry.functionCode === "LABOR_WORKERS" && entry.action === "View")
    && functions.some((entry) => entry.functionCode === "PAYROLL" && entry.action === "View");
}

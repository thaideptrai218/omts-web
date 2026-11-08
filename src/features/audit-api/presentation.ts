export const recordNames: Record<string, string> = { SupplierPayment: "Giao dịch nhà cung cấp", PurchaseReceipt: "Phiếu nhập", PurchaseReturn: "Phiếu trả hàng", FarmingZone: "Vùng nuôi", Raft: "Bè nuôi", RaftLane: "Làn nuôi", CultivationCycle: "Chu kỳ nuôi", CultivationLog: "Nhật ký nuôi", HarvestLot: "Lô thu hoạch", SeedingRecord: "Lần thả giống", WaterMeasurement: "Phép đo nước", Account: "Tài khoản", Employee: "Nhân viên", Supplier: "Nhà cung cấp", InputItem: "Vật tư", CooperativeCertification: "Chứng nhận HTX", ZoneComplianceDocument: "Giấy tờ vùng nuôi" };
export const actionNames: Record<string, string> = { Create: "Tạo mới", Created: "Tạo mới", Update: "Cập nhật", Updated: "Cập nhật", Edit: "Chỉnh sửa", Delete: "Xóa", Deleted: "Xóa", Remove: "Gỡ bỏ", Cancel: "Hủy", Cancelled: "Hủy", Complete: "Hoàn thành", Completed: "Hoàn thành", Correct: "Hiệu chỉnh", Corrected: "Hiệu chỉnh", Start: "Mở chu kỳ", Close: "Đóng chu kỳ", Resume: "Khôi phục sử dụng", Discontinue: "Ngừng sử dụng", StatusChanged: "Đổi trạng thái", ChangeStatus: "Đổi trạng thái" };
const values: Record<string, string> = { Payment: "Thanh toán nhà cung cấp", PaidBack: "Nhà cung cấp hoàn tiền", Cash: "Tiền mặt", BankTransfer: "Chuyển khoản", Open: "Đang nuôi", Closed: "Đã kết thúc", Draft: "Nháp", Completed: "Hoàn thành", Cancelled: "Đã hủy", Active: "Đang dùng", Inactive: "Ngừng dùng", InUse: "Đang dùng", Discontinued: "Ngừng dùng" };
Object.assign(recordNames, { AccessGrant: "Phân quyền vùng", Cooperative: "Hồ sơ hợp tác xã", FarmingInputItem: "Vật tư", MaterialUsage: "Sử dụng vật tư", Role: "Vai trò", ZoneLicense: "Giấy phép vùng", WaterThreshold: "Ngưỡng chất lượng nước" });
Object.assign(actionNames, { Started: "Mở chu kỳ", Recorded: "Ghi nhận", Confirmed: "Xác nhận", Voided: "Hủy kết quả", Granted: "Cấp quyền", Registered: "Đăng ký", Updated: "Cập nhật", SeedingCompleted: "Hoàn thành thả giống", LanesChanged: "Thay đổi số làn", PhotosChanged: "Thay đổi ảnh bè", CoverPhotoChanged: "Thay đổi ảnh bìa", LogoChanged: "Thay đổi biểu trưng", Replaced: "Thay thế giấy tờ", DemoCredentialsSet: "Cập nhật tài khoản thử nghiệm" });
export const auditAction = (action: string) => actionNames[action] ?? actionNames[action.split(".").at(-1) ?? ""] ?? "Ghi nhận thao tác";
type Format = "money" | "date" | "text" | "number";
const fields: Record<string, [string, Format]> = {
  kind: ["Loại giao dịch", "text"], amount: ["Số tiền", "money"], paymentDate: ["Ngày giao dịch", "date"], method: ["Phương thức", "text"], bankReference: ["Mã giao dịch ngân hàng", "text"], note: ["Ghi chú", "text"], notes: ["Ghi chú", "text"], reason: ["Lý do", "text"], cancelReason: ["Lý do hủy", "text"],
  name: ["Tên", "text"], fullName: ["Họ và tên", "text"], displayName: ["Tên hiển thị", "text"], code: ["Mã hồ sơ", "text"], supplierName: ["Nhà cung cấp", "text"], receiptDate: ["Ngày nhập", "date"], total: ["Tổng tiền", "money"], unitPrice: ["Đơn giá", "money"], quantity: ["Số lượng", "number"],
  startDate: ["Ngày bắt đầu", "date"], closeDate: ["Ngày kết thúc", "date"], expectedHarvestDate: ["Ngày thu hoạch dự kiến", "date"], expectedSeedQuantity: ["Lượng giống dự kiến", "number"], targetYieldKg: ["Sản lượng mục tiêu (kg)", "number"], harvestDate: ["Ngày thu hoạch", "date"], cageCount: ["Số lồng", "number"], estimatedKg: ["Sản lượng ước tính (kg)", "number"], visitDate: ["Ngày kiểm tra", "date"], status: ["Trạng thái", "text"], phoneNumber: ["Số điện thoại", "text"], email: ["Email", "text"], address: ["Địa chỉ", "text"], laneCount: ["Số làn", "number"],
};
function snapshot(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") { try { return snapshot(JSON.parse(raw)); } catch { return {}; } }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([key]) => key.length > 0).map(([key, value]) => [key[0].toLowerCase() + key.slice(1), value]));
}
function display(value: unknown, kind: Format): string {
  if (value == null || value === "") return "Chưa có";
  if (typeof value === "number") return value.toLocaleString("vi-VN") + (kind === "money" ? " đồng" : "");
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value !== "string") return "Không có thông tin hiển thị";
  if (kind === "date" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10).split("-").reverse().join("/");
  return values[value] ?? value;
}
/** Only understood business fields; never expose raw JSON, internal IDs or versions. */
export function importantChanges(before: unknown, after: unknown) {
  const previous = snapshot(before), current = snapshot(after);
  return Object.entries(fields).flatMap(([key, [label, kind]]) => {
    if (!(key in previous) && !(key in current) || JSON.stringify(previous[key] ?? null) === JSON.stringify(current[key] ?? null)) return [];
    return [{ label, before: display(previous[key], kind), after: display(current[key], kind) }];
  });
}
export const auditTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" }).format(new Date(value));

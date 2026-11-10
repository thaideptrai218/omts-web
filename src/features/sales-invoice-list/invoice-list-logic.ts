import type { PickedCustomer } from "@/features/customer-lookup/customer-search";

/** Bộ lọc của danh sách hóa đơn bán (SALE-09 bước 2-3) và các phép tính thuần: ngày theo giờ Việt Nam, quy ra tham số truy vấn của BFF. */
export type Preset = "today" | "week" | "month" | "custom";
export type LotFilter = { id: string; lotCode: string };
export type Filters = {
  preset: Preset; from: string; to: string; zoneId: string; customer: PickedCustomer | null; lot: LotFilter | null;
  completed: boolean; cancelled: boolean; paid: "" | "true" | "false"; code: string; cashMine: boolean;
};
export const pageSize = 20;

export const defaultFilters = (): Filters => ({ preset: "today", from: "", to: "", zoneId: "", customer: null, lot: null, completed: true, cancelled: true, paid: "", code: "", cashMine: false });

const shift = (iso: string, days: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

/** Khoảng ngày của lựa chọn nhanh, tính từ ngày hôm nay (yyyy-mm-dd, giờ Việt Nam). Tuần bắt đầu từ thứ Hai. Tùy chỉnh dùng ngày người dùng nhập. */
export function presetRange(preset: Preset, today: string, custom: { from: string; to: string }): { from: string; to: string } {
  if (preset === "today") return { from: today, to: today };
  if (preset === "month") return { from: `${today.slice(0, 8)}01`, to: today };
  if (preset === "week") { const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); return { from: shift(today, -((weekday + 6) % 7)), to: today }; }
  return custom;
}

/** Lỗi bộ lọc đầu tiên (tiếng Việt) hoặc null nếu có thể xem; khớp kiểm tra kỳ của backend (từ <= đến, tối đa 5 năm). */
export function filterProblem(f: Filters): string | null {
  if (f.preset !== "custom") return null;
  if (!f.from || !f.to) return "Chọn đủ ngày bắt đầu và ngày kết thúc.";
  if (f.from > f.to) return "Ngày bắt đầu không được sau ngày kết thúc.";
  const [y, m, d] = f.from.split("-").map(Number);
  if (f.to > new Date(Date.UTC(y + 5, m - 1, d)).toISOString().slice(0, 10)) return "Khoảng thời gian tối đa 5 năm.";
  return null;
}

/** Tham số truy vấn gửi BFF. Cả hai trạng thái được chọn (hoặc cả hai bỏ chọn) nghĩa là không lọc theo trạng thái. */
export function toQuery(f: Filters, today: string): Record<string, string | undefined> {
  const { from, to } = presetRange(f.preset, today, f);
  const oneStatus = f.completed !== f.cancelled;
  return {
    from, to, zoneId: f.zoneId || undefined, customerId: f.customer?.id, harvestLotId: f.lot?.id, statusId: oneStatus ? (f.completed ? "3501" : "3502") : undefined,
    paid: f.paid || undefined, code: f.code.trim() || undefined, cashCollectedByMe: f.cashMine ? "true" : undefined,
  };
}

/** Bộ lọc nào đang khác mặc định, để hiển thị "Đặt lại" và thông báo rỗng đúng ngữ cảnh. */
export const isDefault = (f: Filters) => JSON.stringify(f) === JSON.stringify(defaultFilters());

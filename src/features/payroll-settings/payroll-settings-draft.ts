import { START_DAY_FIRST, START_DAY_LAST, type PayPeriod, type PayrollSettings } from "./contracts";

/** Bản nháp trên màn hình: ngày bắt đầu giữ dạng chuỗi (ô chọn) và cờ tự động tạo bảng lương. */
export type Draft = { startDay: string; automatic: boolean };

export const draftOf = (s: Pick<PayrollSettings, "payPeriodStartDay" | "automaticPayroll">): Draft => ({ startDay: String(s.payPeriodStartDay), automatic: s.automaticPayroll });

/** Ngày bắt đầu hợp lệ (số nguyên 1-28) hoặc undefined. */
export function startDayOf(draft: Draft): number | undefined {
  const day = Number(draft.startDay);
  return draft.startDay.trim() !== "" && Number.isInteger(day) && day >= START_DAY_FIRST && day <= START_DAY_LAST ? day : undefined;
}

export const isDirty = (draft: Draft, base: Pick<PayrollSettings, "payPeriodStartDay" | "automaticPayroll">) =>
  startDayOf(draft) !== base.payPeriodStartDay || draft.automatic !== base.automaticPayroll;

/** Lỗi nhập liệu (tiếng Việt) hoặc undefined nếu có thể xem trước và lưu. */
export const draftProblem = (draft: Draft) => startDayOf(draft) === undefined ? `Chọn ngày bắt đầu kỳ lương từ ${START_DAY_FIRST} đến ${START_DAY_LAST}.` : undefined;

const vnDate = (iso: string) => iso.split("-").reverse().join("/");
/** Tên kỳ theo tháng kết thúc (MM/yyyy), khớp quy ước BR-LABOR-13 của backend. */
export const periodName = (p: PayPeriod) => p.name ?? `${p.end.slice(5, 7)}/${p.end.slice(0, 4)}`;
export const periodRange = (p: PayPeriod) => `${vnDate(p.start)} – ${vnDate(p.end)}`;
export const periodLabel = (p: PayPeriod) => `${periodName(p)} (${periodRange(p)})`;

/** Số ngày của kỳ (gồm cả hai đầu); kỳ đầu tiên sau khi đổi ngày bắt đầu có thể ngắn hơn một tháng. */
export function periodDays(p: PayPeriod): number {
  return Math.round((Date.parse(`${p.end}T00:00:00Z`) - Date.parse(`${p.start}T00:00:00Z`)) / 86_400_000) + 1;
}

/** Câu hỏi xác nhận trước khi lưu, dựng từ kết quả xem trước (MSG-LABOR-36). */
export function confirmQuestion(periods: readonly PayPeriod[], automatic: boolean): string {
  const [first, second] = periods;
  const auto = automatic ? ", và hệ thống tự tạo bảng lương của mỗi kỳ mới khi kỳ bắt đầu" : "";
  return `Với thiết lập này, hai kỳ lương kế tiếp là ${periodLabel(first)} và ${periodLabel(second)}${auto}. Các bảng lương đã tạo giữ nguyên kỳ cũ. Bạn có muốn lưu không?`;
}

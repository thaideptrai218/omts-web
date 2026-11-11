import { formatVietnameseDate } from "@/shared/format/date-only";
import type { PaymentMethod, PayrollStatus, PeriodType } from "./contracts";

/** Status words follow the KiotViet payroll flow the owner asked for. */
export const statusLabel: Record<PayrollStatus, string> = { Creating: "Đang tạo", Provisional: "Tạm tính", Finalized: "Đã chốt lương", Cancelled: "Đã hủy" };
/** Default list filter: every status but "Đã hủy". */
export const defaultStatuses: readonly PayrollStatus[] = ["Creating", "Provisional", "Finalized"];
export const statusTone = (status: PayrollStatus) => status === "Finalized" ? "success" : status === "Cancelled" ? "danger" : "neutral";
export const periodLabel: Record<PeriodType, string> = { Monthly: "Hàng tháng", Custom: "Tùy chọn" };
export const methodLabel: Record<PaymentMethod, string> = { Cash: "Tiền mặt", BankTransfer: "Chuyển khoản" };

export const rangeLabel = (from: string, to: string) => `${formatVietnameseDate(from)} - ${formatVietnameseDate(to)}`;
const pad = (value: number) => String(value).padStart(2, "0");

export type MonthOption = Readonly<{ value: string; from: string; to: string; label: string }>;
/** The calendar month of `today` (yyyy-MM-dd) and the 12 before it, newest first, each as a whole-month work period. */
export function monthOptions(today: string, previous = 12): readonly MonthOption[] {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: previous + 1 }, (_, back) => {
    const first = new Date(Date.UTC(year, month - 1 - back, 1)), y = first.getUTCFullYear(), m = first.getUTCMonth() + 1;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate(), from = `${y}-${pad(m)}-01`, to = `${y}-${pad(m)}-${pad(lastDay)}`;
    return { value: `${y}-${pad(m)}`, from, to, label: rangeLabel(from, to) };
  });
}

/** Month list for the expense-recognition picker of "Chốt lương": the sheet's period end month and its neighbours. */
export function expenseMonthOptions(periodEnd: string, around = 6): readonly { value: string; label: string }[] {
  const [year, month] = periodEnd.split("-").map(Number);
  return Array.from({ length: around * 2 + 1 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + around - index, 1)), value = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
    return { value, label: `Tháng ${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}` };
  });
}

export const monthLabel = (value: string | null) => value ? `Tháng ${value.slice(5)}/${value.slice(0, 4)}` : "—";
export const formatDateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value));

export const kindLabel: Record<"Wage" | "Advance", string> = { Wage: "Trả lương", Advance: "Tạm ứng" };
export const paymentStatusLabel: Record<"Recorded" | "Cancelled", string> = { Recorded: "Đã chi", Cancelled: "Đã hủy" };

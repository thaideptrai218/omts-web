import { formatVietnameseDate } from "@/shared/format/date-only";
import type { LeftOutEmployee, PayLineKind, PaymentMethod, PayrollScope, PayrollStatus, PeriodType, SlipAdjustment } from "./contracts";

/** Status words follow the KiotViet payroll flow the owner asked for. */
export const statusLabel: Record<PayrollStatus, string> = { Creating: "Đang tạo", Provisional: "Tạm tính", Finalized: "Đã chốt lương", Cancelled: "Đã hủy" };
/** Default list filter: every status but "Đã hủy". */
export const defaultStatuses: readonly PayrollStatus[] = ["Creating", "Provisional", "Finalized"];
export const statusTone = (status: PayrollStatus) => status === "Finalized" ? "success" : status === "Cancelled" ? "danger" : "neutral";
/**
 * Payment state of a payslip, separate from the status of its sheet: a finalized payslip is "Đã chốt lương" and, on top of that, not paid, partly paid or paid.
 * The words are the same on every screen (the voucher's allocation table gets the state from the backend, the other screens work it out from net and paid).
 */
export type SlipPaymentState = "Unpaid" | "PartiallyPaid" | "Paid";
export const paymentStateLabel: Record<SlipPaymentState, string> = { Unpaid: "Chưa trả", PartiallyPaid: "Trả một phần", Paid: "Đã trả" };
export const paymentStateTone: Record<SlipPaymentState, "neutral" | "warning" | "success"> = { Unpaid: "neutral", PartiallyPaid: "warning", Paid: "success" };
/** Nothing is owed on a payslip of 0 or less, so it has no payment state. */
export const paymentStateOf = (net: number, paid: number): SlipPaymentState | undefined => net <= 0 ? undefined : paid <= 0 ? "Unpaid" : paid >= net ? "Paid" : "PartiallyPaid";

export const periodLabel: Record<PeriodType, string> = { Monthly: "Hàng tháng", Custom: "Tùy chọn" };
export const scopeLabel: Record<PayrollScope, string> = { All: "Tất cả nhân viên", Staff: "Nội bộ", SeasonalWorker: "Thời vụ", Selected: "Tùy chọn" };
/** Employee type as the API names it -> "Nội bộ" / "Thời vụ". */
export const employeeTypeLabel = (type: string) => type === "Staff" ? "Nội bộ" : type === "SeasonalWorker" ? "Thời vụ" : "—";
/** The day after `day` (yyyy-MM-dd): a sheet can be finalized from the day after its period ends. */
export function dayAfter(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
}
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

/** Clock time of an instant in Vietnam ("07:00"); empty text when there is none. */
export const formatClock = (value?: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "";

export const kindLabel: Record<"Wage" | "Advance", string> = { Wage: "Trả lương", Advance: "Tạm ứng" };
export const paymentStatusLabel: Record<"Recorded" | "Cancelled", string> = { Recorded: "Đã chi", Cancelled: "Đã hủy" };

/** Hours as the payslip shows them: whole hours and minutes ("7h20"), so Giờ x Đơn giá matches Thành tiền (the amount is worked out from minutes). */
export function formatHours(hours: number): string {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}

/** Shifts as the payslip shows them: "3 ca", "3,5 ca" (the count is in halves). */
export const formatShifts = (shifts: number) => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(shifts)} ca`;

export const lineKindLabel: Record<PayLineKind, string> = { Hourly: "Theo giờ", Shift: "Theo ca", FieldShift: "Ca ngoài hiện trường" };

/** The most one slip can take off: deductions may not pass the income they come out of (the backend answers 400 "Adjustments" otherwise). */
export const adjustmentTotals = (lines: readonly Pick<SlipAdjustment, "kind" | "amount">[]) =>
  lines.reduce((total, line) => line.kind === "Bonus" ? { ...total, bonus: total.bonus + line.amount } : { ...total, deduction: total.deduction + line.amount }, { bonus: 0, deduction: 0 });

/** One sentence per employee left out of a sheet: "Nam đã có trong BL000005 (01/11 - 30/11) nên không có trong bảng này." */
export const leftOutLines = (left: readonly LeftOutEmployee[] | null | undefined): string[] =>
  (left ?? []).map((item) => `${item.employeeName} đã có trong ${item.payrollCode} (${rangeLabel(item.from, item.to)}) nên không có trong bảng này.`);

/** Link to the payroll sheet, opened on that sheet in the Bảng lương screen. */
export const sheetHref = (payrollId: string, code: string) => `/operations/payroll?recordId=${payrollId}&search=${encodeURIComponent(code)}`;

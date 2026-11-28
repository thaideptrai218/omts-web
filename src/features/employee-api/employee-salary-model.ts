import { formatVndWithSymbol } from "@/shared/format/vnd";
import type { EmployeeSalary, SalarySetup, SalaryType, SaveSalaryRequest } from "./employee-salary-contract";
import { maxMonthlySalary, saveSalaryRequestSchema } from "./employee-salary-contract";

export const salaryTypeLabel = (type: SalaryType | null | undefined) => type === "FixedMonthly" ? "Cố định tháng" : type === "PerShift" ? "Theo ca" : type === "Hourly" ? "Theo giờ" : "Chưa thiết lập";
export const salaryTypes: readonly SalaryType[] = ["FixedMonthly", "PerShift", "Hourly"];
export const HOURLY_AMOUNT_TEXT = "Theo đơn giá giờ của loại công việc";
export const PER_SHIFT_AMOUNT_TEXT = "Theo đơn giá ca của loại công việc";
export const PAY_FIELD_SHIFTS_LABEL = "Tính tiền đi làm theo ca";

/** The amount of a setup as the screen shows it: the money for a fixed salary, the rule for a per-shift or hourly one. */
export const salaryAmountText = (setup: Pick<SalarySetup, "type" | "monthlyAmount"> | null, type: SalaryType | null) => {
  const kind = setup?.type ?? type;
  return kind === "Hourly" ? HOURLY_AMOUNT_TEXT : kind === "PerShift" ? PER_SHIFT_AMOUNT_TEXT : setup?.monthlyAmount != null ? formatVndWithSymbol(setup.monthlyAmount) : "—";
};

/** The tab has nothing to show yet: no setup and no default type for this kind of employee. */
export const salaryNotSet = (view: Pick<EmployeeSalary, "current" | "currentType">) => view.current === null && view.currentType === null;

export type SalaryForm = { type: SalaryType; amount: number | null; payFieldShifts: boolean; effectiveFrom: string };

/** The form opens on what applies now (or a fixed monthly salary when nothing is set), dated today; a fixed salary pays field shifts unless it was set not to. */
export const salaryFormOf = (view: Pick<EmployeeSalary, "current" | "currentType">, today: string): SalaryForm => ({
  type: view.current?.type ?? view.currentType ?? "FixedMonthly", amount: view.current?.monthlyAmount ?? null, payFieldShifts: view.current?.type === "FixedMonthly" ? view.current.payFieldShifts !== false : true, effectiveFrom: today,
});

export type SalaryIssues = Partial<Record<"amount" | "effectiveFrom", string>>;

/** What is wrong with the form: a fixed monthly salary needs a whole-VND amount within the limit, and every setup needs the date it applies from. */
export function salaryFormIssues(form: SalaryForm): SalaryIssues {
  const issues: SalaryIssues = {};
  if (!form.effectiveFrom) issues.effectiveFrom = "Chọn ngày áp dụng.";
  if (form.type === "FixedMonthly") {
    if (!form.amount || form.amount <= 0) issues.amount = "Nhập mức lương lớn hơn 0.";
    else if (form.amount > maxMonthlySalary) issues.amount = `Mức lương tối đa ${formatVndWithSymbol(maxMonthlySalary)}.`;
  }
  return issues;
}

/** Validates the form and builds the request: a fixed monthly salary needs a whole-VND amount and says whether it pays field shifts; the other types carry neither. */
export function parseSalaryForm(form: SalaryForm, rowVersion: string): { ok: true; body: SaveSalaryRequest } | { ok: false; issues: SalaryIssues } {
  const issues = salaryFormIssues(form);
  if (Object.keys(issues).length) return { ok: false, issues };
  const fixed = form.type === "FixedMonthly";
  const parsed = saveSalaryRequestSchema.safeParse({ type: form.type, ...(fixed ? { monthlyAmount: form.amount!, payFieldShifts: form.payFieldShifts } : {}), effectiveFrom: form.effectiveFrom, rowVersion });
  return parsed.success ? { ok: true, body: parsed.data } : { ok: false, issues: { effectiveFrom: "Kiểm tra lại ngày áp dụng và mức lương." } };
}

import { formatVndWithSymbol } from "@/shared/format/vnd";
import type { EmployeeSalary, SalarySetup, SalaryType, SaveSalaryRequest } from "./employee-salary-contract";
import { maxMonthlySalary, saveSalaryRequestSchema } from "./employee-salary-contract";

export const salaryTypeLabel = (type: SalaryType | null | undefined) => type === "FixedMonthly" ? "Cố định tháng" : type === "Hourly" ? "Theo giờ" : "Chưa thiết lập";
export const salaryTypes: readonly SalaryType[] = ["FixedMonthly", "Hourly"];
export const HOURLY_AMOUNT_TEXT = "Theo đơn giá giờ của loại công việc";

/** The amount of a setup as the screen shows it: the money for a fixed salary, the rule for an hourly one. */
export const salaryAmountText = (setup: Pick<SalarySetup, "type" | "monthlyAmount"> | null, type: SalaryType | null) =>
  (setup?.type ?? type) === "Hourly" ? HOURLY_AMOUNT_TEXT : setup?.monthlyAmount != null ? formatVndWithSymbol(setup.monthlyAmount) : "—";

/** The tab has nothing to show yet: no setup and no default type for this kind of employee. */
export const salaryNotSet = (view: Pick<EmployeeSalary, "current" | "currentType">) => view.current === null && view.currentType === null;

export type SalaryForm = { type: SalaryType; amount: number | null; effectiveFrom: string };

/** The form opens on what applies now (or a fixed monthly salary when nothing is set), dated today. */
export const salaryFormOf = (view: Pick<EmployeeSalary, "current" | "currentType">, today: string): SalaryForm => ({
  type: view.current?.type ?? view.currentType ?? "FixedMonthly", amount: view.current?.monthlyAmount ?? null, effectiveFrom: today,
});

export type SalaryIssues = Partial<Record<"amount" | "effectiveFrom", string>>;

/** Validates the form and builds the request: a fixed monthly salary needs a whole-VND amount, an hourly one carries none. */
export function parseSalaryForm(form: SalaryForm, rowVersion: string): { ok: true; body: SaveSalaryRequest } | { ok: false; issues: SalaryIssues } {
  const issues: SalaryIssues = {};
  if (!form.effectiveFrom) issues.effectiveFrom = "Chọn ngày áp dụng.";
  if (form.type === "FixedMonthly") {
    if (!form.amount || form.amount <= 0) issues.amount = "Nhập mức lương lớn hơn 0.";
    else if (form.amount > maxMonthlySalary) issues.amount = `Mức lương tối đa ${formatVndWithSymbol(maxMonthlySalary)}.`;
  }
  if (Object.keys(issues).length) return { ok: false, issues };
  const parsed = saveSalaryRequestSchema.safeParse({ type: form.type, ...(form.type === "FixedMonthly" ? { monthlyAmount: form.amount! } : {}), effectiveFrom: form.effectiveFrom, rowVersion });
  return parsed.success ? { ok: true, body: parsed.data } : { ok: false, issues: { effectiveFrom: "Kiểm tra lại ngày áp dụng và mức lương." } };
}

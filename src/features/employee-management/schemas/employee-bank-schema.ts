import { z } from "zod";
import type { EmployeeBankAccount } from "../domain/employee-working-details";
export const employeeBankSchema = z.object({
  bankName: z.string().trim().max(100, "Tên ngân hàng tối đa 100 ký tự."),
  accountNumber: z.string().trim(),
  accountHolderName: z.string().trim().max(100, "Tên chủ tài khoản tối đa 100 ký tự."),
}).superRefine((bank, context) => {
  const hasDetails = Object.values(bank).some(Boolean);
  if (!hasDetails) return;
  for (const field of ["bankName", "accountNumber", "accountHolderName"] as const) {
    const labels = { bankName: "ngân hàng", accountNumber: "số tài khoản", accountHolderName: "tên chủ tài khoản" };
    if (!bank[field]) context.addIssue({ code: "custom", path: [field], message: `Nhập ${labels[field]} hoặc để trống toàn bộ thông tin ngân hàng.` });
  }
  if (bank.accountNumber && !/^[0-9]{6,20}$/u.test(bank.accountNumber)) {
    context.addIssue({ code: "custom", path: ["accountNumber"], message: "Số tài khoản gồm 6–20 chữ số." });
  }
});

export type EmployeeBankFields = z.infer<typeof employeeBankSchema>;

export function employeeBankFields(bank: EmployeeBankAccount | null): EmployeeBankFields {
  return bank ? { ...bank } : { bankName: "", accountNumber: "", accountHolderName: "" };
}

// Call after schema validation: a blank group becomes null, never a partial bank.
export function toEmployeeBankAccount(bank: EmployeeBankFields): EmployeeBankAccount | null {
  if (!Object.values(bank).some((value) => value.trim())) return null;
  return {
    bankName: bank.bankName.trim(),
    accountNumber: bank.accountNumber.trim(),
    accountHolderName: bank.accountHolderName.trim().toUpperCase(),
  };
}

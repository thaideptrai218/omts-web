import { z } from "zod";
import type { EmployeeBankAccount } from "../domain/employee-working-details";
import { formatMessage } from "@/shared/messages/message-catalog";

const invalid = formatMessage({ code: "MSG01" });
export const employeeBankSchema = z.object({
  bankName: z.string().trim().max(100, invalid),
  accountNumber: z.string().trim(),
  accountHolderName: z.string().trim().max(100, invalid),
}).superRefine((bank, context) => {
  const hasDetails = Object.values(bank).some(Boolean);
  if (!hasDetails) return;
  for (const field of ["bankName", "accountNumber", "accountHolderName"] as const) {
    if (!bank[field]) context.addIssue({ code: "custom", path: [field], message: invalid });
  }
  if (bank.accountNumber && !/^[0-9]{6,20}$/u.test(bank.accountNumber)) {
    context.addIssue({ code: "custom", path: ["accountNumber"], message: invalid });
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

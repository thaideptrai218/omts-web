import type { FieldErrors } from "react-hook-form";
import type {
  EmployeeAccountSummary,
  EmployeeProfile,
} from "@/features/employee-management/domain/employee-management";
import type { EmployeeEditorValues } from "@/features/employee-management/schemas/employee-editor-schema";
import { employeeBankFields } from "../schemas/employee-bank-schema";
import { employeePersonalHints } from "./employee-personal-hints";

export const employeeInputStyles =
  "mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 text-text " +
  "placeholder:text-text-muted disabled:bg-surface-subtle disabled:text-text-muted aria-[invalid=true]:border-danger";
export const employeeTextareaStyles = `${employeeInputStyles} min-h-28 py-3`;

/** Form defaults for an existing employee, or a blank "employed" record when creating. */
export function createEmployeeEditorValues(employee?: EmployeeProfile): EmployeeEditorValues {
  return {
    accountId: employee?.account?.id ?? "",
    address: employee?.address ?? "",
    area: employee?.area ?? "",
    birthday: employee?.birthday ?? "",
    fullName: employee?.fullName ?? "",
    notes: employee?.notes ?? "",
    otherInformation: employee?.otherInformation ?? "",
    phone: employee?.phone ?? "",
    status: employee?.status ?? "employed",
    wardCommune: employee?.wardCommune ?? "",
    workingZoneIds: [...(employee?.workingZoneIds ?? [])],
    bankAccount: employeeBankFields(employee?.bankAccount ?? null),
  };
}

/** Linkable accounts: the currently linked one first, then unlinked ones, without duplicates. */
export function buildEmployeeAccountOptions(
  employee: EmployeeProfile | undefined,
  availableAccounts: readonly EmployeeAccountSummary[],
) {
  const options = employee?.account
    ? [employee.account, ...availableAccounts]
    : [...availableAccounts];
  return options.filter(
    (account, index) =>
      options.findIndex((candidate) => candidate.id === account.id) === index,
  );
}

export type EmployeeControlProps = Readonly<{
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
}>;

/** Accessible id/invalid/describedby wiring that matches the hint and error ids rendered by EmployeeEditorField. */
export function buildEmployeeControlProps(
  fieldPrefix: string,
  field: keyof EmployeeEditorValues,
  errors: FieldErrors<EmployeeEditorValues>,
): EmployeeControlProps {
  const id = `${fieldPrefix}-${field}`;
  const describedBy = [
    employeePersonalHints[field] ? `${id}-hint` : "",
    errors[field] ? `${id}-error` : "",
  ].filter(Boolean).join(" ");

  return {
    id,
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": describedBy || undefined,
  };
}

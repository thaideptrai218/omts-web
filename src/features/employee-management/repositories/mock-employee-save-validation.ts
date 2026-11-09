import type {
  EmployeeAccountSummary,
  EmployeeProfile,
  SaveEmployeeInput,
  SaveEmployeeResult,
} from "@/features/employee-management/domain/employee-management";
import type { createEmployeeEditorSchema } from "@/features/employee-management/schemas/employee-editor-schema";
import type { EmployeeZoneOption } from "../domain/employee-working-details";
import type { EmployeeIssueTarget } from "../domain/employee-problem";
import { employeeBankFields, toEmployeeBankAccount } from "../schemas/employee-bank-schema";
import { employeePersonalFields } from "../schemas/employee-personal-schema";
import { normalizeEmployeePhone } from "../schemas/employee-phone";
import { cloneAccount, sameName } from "./mock-employee-store-helpers";

const validationTargets = new Set<string>([...employeePersonalFields, "bankAccount", "workingZoneIds"]);

type EmployeeEditorSchema = ReturnType<typeof createEmployeeEditorSchema>;
export type ParsedEmployeeEditorValues = ReturnType<EmployeeEditorSchema["parse"]>;

/** Either the first server-style rejection, or the validated values needed to publish. */
export type MockEmployeeSaveValidation =
  | Readonly<{ rejection: SaveEmployeeResult }>
  | Readonly<{
      rejection?: undefined;
      current: EmployeeProfile | undefined;
      data: ParsedEmployeeEditorValues;
      normalizedPhone: string;
      selectedAccount: EmployeeAccountSummary | undefined;
    }>;

/**
 * Runs the mock backend's save checks in the original order: schema, phone,
 * existence, status, version conflict, zones, duplicate person, account link.
 */
export function validateMockEmployeeSave(
  input: SaveEmployeeInput,
  {
    accounts,
    conflict,
    editorSchema,
    employees,
    zones,
  }: Readonly<{
    accounts: readonly EmployeeAccountSummary[];
    conflict(employee: EmployeeProfile): SaveEmployeeResult;
    editorSchema: EmployeeEditorSchema;
    employees: readonly EmployeeProfile[];
    zones: readonly EmployeeZoneOption[];
  }>,
): MockEmployeeSaveValidation {
  const parsed = editorSchema.safeParse({
    ...input,
    accountId: input.accountId ?? "",
    bankAccount: employeeBankFields(input.bankAccount),
  });
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path[0]))]
      .filter((field): field is EmployeeIssueTarget => typeof field === "string" && validationTargets.has(field));
    if (fields.some((field) => field !== "fullName" && field !== "phone")) {
      return { rejection: { status: "invalid-fields", code: "MSG01", fields } };
    }
    const field = parsed.error.issues[0]?.path[0];
    return {
      rejection: {
        field:
          field === "fullName" || field === "phone" || field === "status"
            ? field
            : "fullName",
        message: { code: "MSG01" },
        status: "invalid-input",
      },
    };
  }

  const normalizedPhone = normalizeEmployeePhone(parsed.data.phone);
  if (normalizedPhone === null) return { rejection: { status: "invalid-input", field: "phone", message: { code: "MSG01" } } };

  const current = input.id
    ? employees.find((employee) => employee.id === input.id)
    : undefined;
  if (input.id && !current) {
    return {
      rejection: {
        field: "fullName",
        message: { code: "MSG01" },
        status: "invalid-input",
      },
    };
  }
  if (!current && parsed.data.status !== "employed") {
    return {
      rejection: {
        field: "status",
        message: { code: "MSG01" },
        status: "invalid-input",
      },
    };
  }
  if (current && input.recordVersion !== current.recordVersion) return { rejection: conflict(current) };
  if (current && parsed.data.status !== current.status) {
    return { rejection: { status: "invalid-input", field: "status", message: { code: "MSG01" } } };
  }
  if (parsed.data.workingZoneIds.some((id) => !zones.some((zone) => zone.id === id && zone.status === "in-use"))) {
    return { rejection: { status: "invalid-fields", code: "MSG01", fields: ["workingZoneIds"] } };
  }

  const duplicate = employees.find(
    (employee) =>
      employee.id !== input.id &&
      sameName(employee.fullName, parsed.data.fullName) &&
      normalizeEmployeePhone(employee.phone) === normalizedPhone,
  );
  if (duplicate) {
    return {
      rejection: {
        existingEmployeeId: duplicate.id,
        message: {
          code: "MSG03",
          params: { object_name: "Hồ sơ nhân viên" },
        },
        status: "duplicate",
      },
    };
  }

  const selectedAccount = input.accountId
    ? accounts.find((account) => account.id === input.accountId)
    : undefined;
  if (input.accountId && !selectedAccount) {
    return {
      rejection: {
        field: "accountId",
        message: { code: "MSG01" },
        status: "invalid-input",
      },
    };
  }

  const employeeUsingAccount = input.accountId
    ? employees.find(
        (employee) =>
          employee.id !== input.id && employee.account?.id === input.accountId,
      )
    : undefined;
  if (employeeUsingAccount) {
    return {
      rejection: {
        existingEmployeeId: employeeUsingAccount.id,
        message: {
          code: "MSG24",
          params: { employee_name: employeeUsingAccount.fullName },
        },
        status: "account-already-linked",
      },
    };
  }

  return { current, data: parsed.data, normalizedPhone, selectedAccount };
}

/**
 * Builds the profile to publish from validated values. Existing employees keep
 * their id, linked account (unless a new one is selected) and employment end date.
 */
export function buildSavedEmployee({
  current,
  data,
  nextEmployeeId,
  nextVersion,
  normalizedPhone,
  selectedAccount,
}: Readonly<{
  current: EmployeeProfile | undefined;
  data: ParsedEmployeeEditorValues;
  nextEmployeeId: () => string;
  nextVersion: () => string;
  normalizedPhone: string;
  selectedAccount: EmployeeAccountSummary | undefined;
}>): EmployeeProfile {
  return {
    account: selectedAccount
      ? cloneAccount(selectedAccount)
      : current?.account ? cloneAccount(current.account) : null,
    address: data.address.trim(),
    area: data.area.trim(),
    birthday: data.birthday,
    fullName: data.fullName,
    id: current?.id ?? nextEmployeeId(),
    notes: data.notes.trim(),
    otherInformation: data.otherInformation.trim(),
    phone: normalizedPhone,
    recordVersion: nextVersion(),
    status: current ? data.status : "employed",
    employmentEndDate: current?.employmentEndDate ?? null,
    wardCommune: data.wardCommune.trim(),
    workingZoneIds: [...data.workingZoneIds],
    bankAccount: toEmployeeBankAccount(data.bankAccount),
  };
}

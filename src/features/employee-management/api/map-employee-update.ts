import type { EmployeeRecord } from "@/features/employee-management/domain/employee-record";
import { employeeEditorSchema, type EmployeeEditorValues } from "@/features/employee-management/schemas/employee-editor-schema";
import { employeeUpdateRequestSchema, type EmployeeUpdateRequestDto } from "./employee-update.schema";
import { employeeBankFields, toEmployeeBankAccount } from "../schemas/employee-bank-schema";

type UpdateMappingResult =
  | Readonly<{ status: "ready"; employeeId: string; request: EmployeeUpdateRequestDto }>
  | Readonly<{ status: "invalid-input" | "unlink-required" | "employment-action-required" }>;

export function employeeRecordToEditorValues(record: EmployeeRecord): EmployeeEditorValues {
  return {
    accountId: record.account?.id ?? "",
    fullName: record.fullName, phone: record.phone ?? "", birthday: record.birthday ?? "",
    address: record.address ?? "", area: record.area ?? "", wardCommune: record.wardCommune ?? "",
    otherInformation: record.otherInformation ?? "", notes: record.notes ?? "", status: record.status,
    workingZoneIds: record.workingZones.map((zone) => zone.id),
    bankAccount: employeeBankFields(record.bankAccount),
  };
}

function optionalText(value: string, original: string | null) {
  // Keep an untouched null/empty value exactly as it was read.
  return value === (original ?? "") ? original : value.trim() || null;
}

export function mapEmployeeUpdate(
  record: EmployeeRecord,
  values: EmployeeEditorValues,
): UpdateMappingResult {
  const draft = employeeEditorSchema.safeParse(values);
  if (!draft.success) return { status: "invalid-input" };
  const input = draft.data;
  if (input.status !== record.status) return { status: "employment-action-required" };
  if (record.account !== null && input.accountId === "") return { status: "unlink-required" };

  const parsed = employeeUpdateRequestSchema.safeParse({
    fullName: input.fullName, phoneNumber: input.phone, birthday: input.birthday || null,
    address: optionalText(input.address, record.address), area: optionalText(input.area, record.area),
    ward: optionalText(input.wardCommune, record.wardCommune),
    otherInformation: optionalText(input.otherInformation, record.otherInformation),
    notes: optionalText(input.notes, record.notes),
    workingZoneIds: [...input.workingZoneIds],
    bankAccount: toEmployeeBankAccount(input.bankAccount),
    accountId: input.accountId || null,
    rowVersion: record.recordVersion,
  });
  return parsed.success
    ? { status: "ready", employeeId: record.id, request: parsed.data }
    : { status: "invalid-input" };
}

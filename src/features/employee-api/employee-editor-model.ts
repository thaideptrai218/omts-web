import { employeeBankFields, toEmployeeBankAccount } from "@/features/employee-management/schemas/employee-bank-schema";
import type { employeeEditorSchema } from "@/features/employee-management/schemas/employee-editor-schema";
import { normalizeEmployeePhone } from "@/features/employee-management/schemas/employee-phone";
import type { z } from "zod";
import type { Employee } from "./contracts";

/** Labels and pure helpers shared by the employee directory and editor. */
export const employmentLabel = (value: string) => (value === "Employed" ? "Đang làm việc" : "Đã nghỉ việc");
export const accountLabel = (value: string) => (value === "Active" ? "Hoạt động" : "Đã khóa");
/** "YYYY-MM-DD" -> "DD/MM/YYYY"; "—" when empty. */
export const dateLabel = (value: string | null) => (value ? value.split("-").reverse().join("/") : "—");

/** Backend field name -> [form field name, Vietnamese label]. */
export const fieldLabels = {
  "Full name": ["fullName", "Họ và tên"],
  "Phone number": ["phone", "Số điện thoại"],
  Birthday: ["birthday", "Ngày sinh"],
  Address: ["address", "Địa chỉ"],
  Area: ["area", "Khu vực"],
  Ward: ["wardCommune", "Phường/Xã"],
  "Other information": ["otherInformation", "Thông tin khác"],
  Notes: ["notes", "Ghi chú"],
  "Working zones": ["workingZoneIds", "Vùng làm việc"],
  "Bank account": ["bankAccount", "Thông tin ngân hàng"],
  Account: ["accountId", "Tài khoản đăng nhập"],
  RowVersion: ["rowVersion", "Phiên bản hồ sơ"],
} as const;

/** Form field path -> Vietnamese label, used to prefix client-side validation messages. */
export const localFieldLabels: Record<string, string> = {
  ...Object.fromEntries(Object.values(fieldLabels)),
  "bankAccount.bankName": "Ngân hàng",
  "bankAccount.accountNumber": "Số tài khoản",
  "bankAccount.accountHolderName": "Chủ tài khoản",
};

export type EmployeeFormValues = ReturnType<typeof valuesOf>;

/** Editable form values for an employee (or blank values for a new one). */
export function valuesOf(record: Employee | null) {
  return {
    fullName: record?.fullName ?? "",
    phone: record?.phoneNumber ?? "",
    birthday: record?.birthday ?? "",
    address: record?.address ?? "",
    area: record?.area ?? "",
    wardCommune: record?.ward ?? "",
    otherInformation: record?.otherInformation ?? "",
    notes: record?.notes ?? "",
    accountId: record?.account?.id ?? "",
    workingZoneIds: record?.workingZones.map((zone) => zone.id) ?? [],
    bankAccount: employeeBankFields(record?.bankAccount ?? null),
  };
}

/** Maps validated form data to the create/update body; blank optional fields become null. */
export function buildEmployeeSaveBody(data: z.infer<typeof employeeEditorSchema>, baseline: Employee | null) {
  return {
    fullName: data.fullName,
    phoneNumber: normalizeEmployeePhone(data.phone)!,
    birthday: data.birthday || null,
    address: data.address || null,
    area: data.area || null,
    ward: data.wardCommune || null,
    otherInformation: data.otherInformation || null,
    notes: data.notes || null,
    workingZoneIds: data.workingZoneIds,
    bankAccount: toEmployeeBankAccount(data.bankAccount),
    accountId: data.accountId || null,
    ...(baseline ? { rowVersion: baseline.rowVersion } : {}),
  };
}

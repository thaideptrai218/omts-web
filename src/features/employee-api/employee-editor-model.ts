import { employeeBankFields, toEmployeeBankAccount } from "@/features/employee-management/schemas/employee-bank-schema";
import { z } from "zod";
import { createEmployeePersonalSchema } from "@/features/employee-management/schemas/employee-personal-schema";
import { employeeBankSchema } from "@/features/employee-management/schemas/employee-bank-schema";
import { employeeBusinessDate, employeeDateOnlySchema } from "@/features/employee-management/schemas/employee-date-only";
import { normalizeEmployeePhone } from "@/features/employee-management/schemas/employee-phone";
import { validVietnamesePhone, vietnamesePhoneMessage } from "@/components/form/phone-input-rules";

import type { Employee } from "./contracts";

/** Labels and pure helpers shared by the employee directory and editor. */
export const employmentLabel = (value: string) => (value === "Employed" ? "Đang làm việc" : "Đã nghỉ việc");
export const accountLabel = (value: string) => (value === "Active" ? "Hoạt động" : "Đã khóa");
/** "YYYY-MM-DD" -> "DD/MM/YYYY"; "—" when empty. */
export const dateLabel = (value: string | null | undefined) => (value ? value.split("-").reverse().join("/") : "—");

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
  Code: ["code", "Mã nhân viên"],
  Gender: ["gender", "Giới tính"],
  "ID number": ["idNumber", "CCCD"],
  "Start date": ["startDate", "Ngày bắt đầu làm việc"],
  "Working zones": ["workingZoneIds", "Vùng làm việc"],
  "Bank account": ["bankAccount", "Thông tin ngân hàng"],
  "Employee type": ["employeeType", "Loại nhân viên"],
  "Employee type from": ["employeeTypeFrom", "Áp dụng từ ngày"],
  "Job types": ["jobTypeIds", "Loại công việc"],
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
    code: record?.code ?? "",
    fullName: record?.fullName ?? "",
    phone: record?.phoneNumber ?? "",
    birthday: record?.birthday ?? "",
    gender: record?.gender ?? ("" as "" | "Male" | "Female" | "Other"),
    idNumber: record?.idNumber ?? "",
    startDate: record?.startDate ?? "",
    address: record?.address ?? "",
    area: record?.area ?? "",
    wardCommune: record?.ward ?? "",
    otherInformation: record?.otherInformation ?? "",
    notes: record?.notes ?? "",
    employeeType: record?.employeeType ?? "",
    employeeTypeFrom: "",
    jobTypeIds: record?.jobTypes.map(job => job.id) ?? [],
    workingZoneIds: record?.workingZones.map((zone) => zone.id) ?? [],
    bankAccount: employeeBankFields(record?.bankAccount ?? null),
  };
}

/** Maps validated form data to the create/update body; blank optional fields become null. */
export function buildEmployeeSaveBody(data: z.infer<typeof employeeApiEditorSchema>, baseline: Employee | null) {
  return {
    // Blank code: generated on create, unchanged on update (null keeps the stored value).
    code: data.code ? data.code.toUpperCase() : null,
    fullName: data.fullName,
    phoneNumber: normalizeEmployeePhone(data.phone)!,
    birthday: data.birthday || null,
    gender: data.gender || null,
    // An empty string is how the backend is told to clear a stored ID number; null keeps it.
    idNumber: data.idNumber || (baseline?.idNumber ? "" : null),
    startDate: data.startDate || null,
    address: data.address || null,
    area: data.area || null,
    ward: data.wardCommune || null,
    otherInformation: data.otherInformation || null,
    notes: data.notes || null,
    workingZoneIds: data.workingZoneIds,
    bankAccount: toEmployeeBankAccount(data.bankAccount),
    ...(data.employeeType ? { employeeType: data.employeeType } : {}),
    ...(baseline && data.employeeType && data.employeeType !== baseline.employeeType ? { employeeTypeFrom: data.employeeTypeFrom } : {}),
    jobTypeIds: data.jobTypeIds,
    ...(baseline ? { rowVersion: baseline.rowVersion } : {}),
  };
}

/** API form validation stays separate from the legacy mock editor. */
export const employeeApiEditorSchema = createEmployeePersonalSchema().extend({
 phone: z.string().trim().refine(value => !value || validVietnamesePhone(value), vietnamesePhoneMessage),
 code: z.string().trim().regex(/^([A-Za-z0-9-]{1,20})?$/u, "Mã gồm chữ, số và dấu gạch ngang, tối đa 20 ký tự."),
 gender: z.enum(["", "Male", "Female", "Other"], { error: "Chọn giới tính." }),
 idNumber: z.string().trim().regex(/^(\d{9}|\d{12})?$/u, "CCCD gồm 9 hoặc 12 chữ số."),
 startDate: z.string().refine(value => !value || (employeeDateOnlySchema.safeParse(value).success && value <= employeeBusinessDate(new Date())), "Ngày bắt đầu không hợp lệ hoặc ở tương lai."),
 employeeType: z.enum(["", "SeasonalWorker", "Staff"], { error: "Chọn loại nhân viên." }),
 employeeTypeFrom: z.string().refine(value => !value || employeeDateOnlySchema.safeParse(value).success, "Ngày áp dụng không hợp lệ."),
 jobTypeIds: z.array(z.guid({ error: "Chọn loại công việc hợp lệ." })).refine(ids => new Set(ids).size === ids.length, "Không chọn trùng loại công việc."),
 workingZoneIds: z.array(z.guid({ error: "Chọn vùng làm việc hợp lệ." })).refine(ids => new Set(ids).size === ids.length, "Không chọn trùng vùng làm việc."),
 bankAccount: employeeBankSchema,
});
export const genderLabel = (value: string | null | undefined) => value === "Male" ? "Nam" : value === "Female" ? "Nữ" : value === "Other" ? "Khác" : "";
export const employeeTypeLabel = (value: string | null) => value === "Staff" ? "Nhân viên" : value === "SeasonalWorker" ? "Thời vụ" : "—";

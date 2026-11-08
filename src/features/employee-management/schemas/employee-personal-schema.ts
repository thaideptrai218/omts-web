import { z } from "zod";
import { formatMessage } from "@/shared/messages/message-catalog";
import { employeeBusinessDate, employeeDateOnlySchema } from "./employee-date-only";
import { normalizeEmployeePhone } from "./employee-phone";

export const employeeTextLimits = {
  fullName: 100, address: 500, area: 100, wardCommune: 100, otherInformation: 1000, notes: 1000,
} as const;
export const employeePersonalFields = ["fullName", "phone", "birthday", "address", "area", "wardCommune", "otherInformation", "notes"] as const;

function text(field: keyof typeof employeeTextLimits, label: string) {
  return z.string().trim().max(employeeTextLimits[field], `${label} tối đa ${employeeTextLimits[field]} ký tự. ${formatMessage({ code: "MSG01" })}`);
}

export function createEmployeePersonalSchema(now: () => Date = () => new Date()) {
  return z.object({
    fullName: text("fullName", "Họ và tên").min(1, `Hãy nhập họ và tên nhân viên. ${formatMessage({ code: "MSG01" })}`),
    phone: z.string().trim().refine((value) => normalizeEmployeePhone(value) !== null,
      `Số điện thoại không hợp lệ. ${formatMessage({ code: "MSG01" })}`),
    birthday: z.string().refine((value) => value === "" ||
      (employeeDateOnlySchema.safeParse(value).success && value <= employeeBusinessDate(now())),
    `Ngày sinh phải là ngày hợp lệ và không sau hôm nay. ${formatMessage({ code: "MSG01" })}`),
    address: text("address", "Địa chỉ"), area: text("area", "Khu vực"), wardCommune: text("wardCommune", "Phường/Xã"),
    otherInformation: text("otherInformation", "Thông tin khác"), notes: text("notes", "Ghi chú"),
  });
}

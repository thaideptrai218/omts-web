import { z } from "zod";
import { normalizeEmployeePhone } from "@/features/employee-management/schemas/employee-phone";

export const cooperativeFields = [["fullName", "Tên hợp tác xã"], ["taxCode", "Mã số thuế"], ["officeAddress", "Địa chỉ trụ sở"],
  ["phoneNumber", "Số điện thoại"], ["email", "Email"], ["website", "Website"], ["legalRepresentative", "Người đại diện pháp luật"]] as const;
const text = z.string().trim().min(1, "Hãy nhập thông tin này.").max(255, "Tối đa 255 ký tự.");
export const cooperativeInputSchema = z.strictObject({
  fullName: text, taxCode: z.string().trim().regex(/^\d{10}(?:-\d{3})?$/, "Mã số thuế gồm 10 chữ số hoặc 10 chữ số-3 chữ số."),
  officeAddress: z.string().trim().min(1, "Hãy nhập địa chỉ.").max(500, "Tối đa 500 ký tự."),
  phoneNumber: z.string().trim().refine((value) => normalizeEmployeePhone(value) !== null, "Số điện thoại chưa hợp lệ."),
  email: z.string().trim().max(255).refine((value) => !value || z.email().safeParse(value).success, "Email chưa đúng định dạng."),
  website: z.string().trim().max(255).refine((value) => {
    if (!value) return true;
    try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
  }, "Website phải có địa chỉ http:// hoặc https:// hợp lệ."),
  legalRepresentative: text,
  businessLines: z.array(text).min(1, "Hãy thêm ít nhất một ngành nghề.").refine((value) => JSON.stringify(value).length <= 2000, "Danh sách ngành nghề quá dài (tối đa 2.000 ký tự khi lưu)."),
  rowVersion: z.string().min(1).max(128),
});
const nullableText = z.string().nullable();
export const cooperativeWireSchema = z.object({ id: z.guid(), fullName: z.string(), taxCode: nullableText, officeAddress: nullableText,
  phoneNumber: nullableText, email: nullableText, website: nullableText, legalRepresentative: nullableText,
  businessLines: z.array(z.string()), logoUrl: nullableText, status: z.string(), rowVersion: z.string().min(1).max(128) });
export const cooperativeViewSchema = cooperativeWireSchema.extend({ logoUrl: z.string().regex(/^\/api\/cooperative\/profile\/logo\?version=[A-Za-z0-9%_.~=-]+$/).nullable() });
export type CooperativeView = z.infer<typeof cooperativeViewSchema>;
export type CooperativeInput = z.infer<typeof cooperativeInputSchema>;
export function cooperativeValues(record: CooperativeView): CooperativeInput {
  return { ...Object.fromEntries(cooperativeFields.map(([key]) => [key, record[key] ?? ""])), businessLines: [...record.businessLines], rowVersion: record.rowVersion } as CooperativeInput;
}

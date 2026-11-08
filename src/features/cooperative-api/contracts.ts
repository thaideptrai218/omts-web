import { z } from "zod";
import { normalizeEmployeePhone } from "@/features/employee-management/schemas/employee-phone";

export const cooperativeFields = [["fullName", "Tên hợp tác xã"], ["shortName", "Tên viết tắt"], ["taxCode", "Mã số thuế"], ["officeAddress", "Địa chỉ trụ sở"],
  ["phoneNumber", "Số điện thoại"], ["email", "Email"], ["website", "Website"], ["legalRepresentative", "Người đại diện pháp luật"], ["socialLink", "Liên kết mạng xã hội"]] as const;
const text = z.string().trim().min(1, "Hãy nhập thông tin này.").max(255, "Tối đa 255 ký tự.");
export const cooperativeInputSchema = z.strictObject({
  fullName: text, shortName: text.max(20, "Tối đa 20 ký tự."), yearEstablished: z.number().int().min(1900).max(Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric" }).format(new Date()))).nullable(),
  socialLink: z.string().trim().max(255).refine(value => { if (!value) return true; try { return new URL(value).protocol === "https:"; } catch { return false; } }, "Liên kết phải dùng https://."),
  introductionVi: z.string().trim().max(4000, "Tối đa 4.000 ký tự."), introductionEn: z.string().trim().max(4000, "Tối đa 4.000 ký tự."), taxCode: z.string().trim().regex(/^\d{10}(?:-\d{3})?$/, "Mã số thuế gồm 10 chữ số hoặc 10 chữ số-3 chữ số."),
  officeAddress: z.string().trim().min(1, "Hãy nhập địa chỉ.").max(500, "Tối đa 500 ký tự."),
  phoneNumber: z.string().trim().refine((value) => normalizeEmployeePhone(value) !== null, "Số điện thoại chưa hợp lệ."),
  email: z.string().trim().max(255).refine((value) => !value || z.email().safeParse(value).success, "Email chưa đúng định dạng."),
  website: z.string().trim().max(255).refine((value) => {
    if (!value) return true;
    try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
  }, "Website phải có địa chỉ http:// hoặc https:// hợp lệ."),
  legalRepresentative: z.string().trim().max(255),
  businessLines: z.array(text).refine((value) => JSON.stringify(value).length <= 2000, "Danh sách ngành nghề quá dài (tối đa 2.000 ký tự khi lưu)."),
  rowVersion: z.string().min(1).max(128),
});
const nullableText = z.string().nullable();
const certificate = z.object({ id: z.guid(), name: z.string(), number: z.string().nullable(), issuer: z.string().nullable(), expiryDate: z.iso.date().nullable(), state: z.enum(["Valid", "ExpiringSoon", "Expired"]), fileUrl: z.string().nullable(), rowVersion: z.string() });
const publicCertificate = certificate.omit({ id: true, rowVersion: true });
export const publicPreviewSchema = z.object({ fullName: z.string(), shortName: nullableText, yearEstablished: z.number().int().nullable(), officeAddress: nullableText, phoneNumber: nullableText, email: nullableText, website: nullableText, socialLink: nullableText, logoUrl: nullableText, coverPhotoUrl: nullableText, introductionVi: nullableText, introductionEn: nullableText, certifications: z.array(publicCertificate) });
export const cooperativeWireSchema = z.object({ id: z.guid(), fullName: z.string(), taxCode: nullableText, officeAddress: nullableText,
  phoneNumber: nullableText, email: nullableText, website: nullableText, legalRepresentative: nullableText,
  businessLines: z.array(z.string()), logoUrl: nullableText, status: z.string().optional(), shortName: nullableText.optional().default(null), yearEstablished: z.number().int().nullable().optional().default(null), socialLink: nullableText.optional().default(null), introductionVi: nullableText.optional().default(null), introductionEn: nullableText.optional().default(null), coverPhotoUrl: nullableText.optional().default(null), asOf: z.iso.date().optional(), certifications: z.array(certificate).optional().default([]), publicPreview: publicPreviewSchema.optional(), rowVersion: z.string().min(1).max(128) });
export const cooperativeViewSchema = cooperativeWireSchema.extend({ coverPhotoUrl: z.string().regex(/^\/api\/cooperative\/profile\/cover-photo\?version=[A-Za-z0-9%_.~=-]+$/).nullable().default(null), logoUrl: z.string().regex(/^\/api\/cooperative\/profile\/logo\?version=[A-Za-z0-9%_.~=-]+$/).nullable() });
export type CooperativeView = z.infer<typeof cooperativeViewSchema>;
export type CooperativeInput = z.infer<typeof cooperativeInputSchema>;
export function cooperativeValues(record: CooperativeView): CooperativeInput {
  return { ...Object.fromEntries(cooperativeFields.map(([key]) => [key, record[key] ?? ""])), yearEstablished: record.yearEstablished, introductionVi: record.introductionVi ?? "", introductionEn: record.introductionEn ?? "", businessLines: [...record.businessLines], rowVersion: record.rowVersion } as CooperativeInput;
}

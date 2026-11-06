import { z } from "zod";

const optionalEmailSchema = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || z.email().safeParse(value).success,
    "Email chưa đúng định dạng.",
  );

const optionalWebsiteSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (value.length === 0) return true;

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Website phải bắt đầu bằng http:// hoặc https:// và có địa chỉ hợp lệ.");

export const cooperativeProfileSchema = z.object({
  bankAccountHolder: z.string().trim().min(1, "Hãy nhập tên chủ tài khoản."),
  bankAccountNumber: z.string().trim().min(1, "Hãy nhập số tài khoản."),
  bankId: z.string().trim().min(1, "Hãy chọn ngân hàng."),
  businessActivities: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Hãy nhập ngành nghề hoặc xóa dòng trống.")
        .max(255, "Mỗi ngành nghề không được vượt quá 255 ký tự."),
    )
    .min(1, "Hãy thêm ít nhất một ngành nghề kinh doanh."),
  cooperativeName: z.string().trim().min(1, "Hãy nhập tên đầy đủ của hợp tác xã."),
  email: optionalEmailSchema,
  legalRepresentative: z
    .string()
    .trim()
    .min(1, "Hãy nhập người đại diện theo pháp luật."),
  officeAddress: z.string().trim().min(1, "Hãy nhập địa chỉ văn phòng."),
  phone: z.string().trim().min(1, "Hãy nhập số điện thoại."),
  taxId: z
    .string()
    .trim()
    .regex(/^\d{10}(?:-\d{3})?$/, "Mã số thuế phải gồm 10 chữ số hoặc 10 chữ số-3 chữ số."),
  website: optionalWebsiteSchema,
});

export type CooperativeProfileFormValues = z.infer<
  typeof cooperativeProfileSchema
>;

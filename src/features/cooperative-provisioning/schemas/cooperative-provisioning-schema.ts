import { z } from "zod";

export const cooperativeProvisioningSchema = z.object({
  cooperativeName: z
    .string()
    .trim()
    .min(1, "Hãy nhập tên ban đầu của hợp tác xã."),
  ownerIdentityContact: z
    .string()
    .trim()
    .min(1, "Hãy nhập thông tin danh tính hoặc liên hệ của Chủ hợp tác xã."),
  preliminaryCode: z
    .string()
    .trim()
    .min(1, "Hãy nhập mã sơ bộ của hợp tác xã."),
});

export type CooperativeProvisioningFormValues = z.infer<
  typeof cooperativeProvisioningSchema
>;

export function validateEvidenceImage(file: File): string | undefined {
  if (!file.type.startsWith("image/")) {
    return "Tệp đã chọn không phải là ảnh.";
  }

  return undefined;
}

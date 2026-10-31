import { z } from "zod";

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || z.email().safeParse(value).success, {
    message: "Email chưa đúng định dạng.",
  });

export const accountEditorSchema = z
  .object({
    deliveryChannel: z.enum(["email", "phone"]),
    email: optionalEmail,
    fullName: z.string().trim().min(1, "Vui lòng nhập họ và tên nhân viên."),
    phone: z.string().trim(),
  })
  .superRefine((values, context) => {
    if (!values.email && !values.phone) {
      const message = "Vui lòng nhập email hoặc số điện thoại.";
      context.addIssue({ code: "custom", message, path: ["email"] });
      context.addIssue({ code: "custom", message, path: ["phone"] });
      return;
    }

    const selectedContact =
      values.deliveryChannel === "email" ? values.email : values.phone;
    if (!selectedContact) {
      context.addIssue({
        code: "custom",
        message: "Kênh nhận thông tin phải có địa chỉ liên hệ tương ứng.",
        path: ["deliveryChannel"],
      });
    }
  });

export type AccountEditorValues = z.infer<typeof accountEditorSchema>;

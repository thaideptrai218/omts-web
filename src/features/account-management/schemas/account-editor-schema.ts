import { z } from "zod";

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || z.email().safeParse(value).success, {
    message: "Email chưa đúng định dạng.",
  });

export const accountEditorSchema = z.object({
  displayName: z.string().trim().min(1, "Vui lòng nhập tên hiển thị."),
  email: optionalEmail,
  phone: z.string().trim().min(1, "Vui lòng nhập số điện thoại."),
  username: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên đăng nhập.")
    .regex(/^[a-zA-Z0-9._-]+$/, "Chỉ dùng chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang."),
});

export type AccountEditorValues = z.infer<typeof accountEditorSchema>;

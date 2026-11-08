import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Hãy nhập tên đăng nhập, số điện thoại hoặc email."),
  password: z.string().min(1, "Hãy nhập mật khẩu."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

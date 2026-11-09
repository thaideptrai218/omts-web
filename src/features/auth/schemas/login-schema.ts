import { z } from "zod";

export const loginSchema = z.object({
  // Sign-in is by phone number. An email address never identifies an account.
  identifier: z.string().trim().min(1, "Hãy nhập số điện thoại.").refine((value) => !value.includes("@"), "Hãy đăng nhập bằng số điện thoại, không dùng email."),
  password: z.string().min(1, "Hãy nhập mật khẩu."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

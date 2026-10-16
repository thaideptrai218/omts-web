import { z } from "zod";
import {
  addNewPasswordIssues,
  newPasswordFieldsSchema,
  newPasswordSchema,
} from "@/shared/security/new-password-schema";

export const changePasswordSchema = newPasswordSchema;

export const currentPasswordChangeSchema = newPasswordFieldsSchema
  .extend({ currentPassword: z.string() })
  .superRefine((values, context) => {
    if (values.currentPassword.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Hãy nhập mật khẩu hiện tại.",
        path: ["currentPassword"],
      });
    }

    addNewPasswordIssues(values, context);
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type CurrentPasswordChangeFormValues = z.infer<
  typeof currentPasswordChangeSchema
>;

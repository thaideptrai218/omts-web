import { z } from "zod";
import { getPasswordRuleState } from "@/features/account-security/domain/password-policy";

const newPasswordFieldsSchema = z.object({
  confirmPassword: z.string(),
  newPassword: z.string(),
});

type NewPasswordFields = z.infer<typeof newPasswordFieldsSchema>;

function validateNewPasswordFields(
  values: NewPasswordFields,
  context: z.RefinementCtx,
) {
    if (values.newPassword.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Hãy nhập mật khẩu mới.",
        path: ["newPassword"],
      });
    } else {
      const rules = getPasswordRuleState(values.newPassword);

      if (!rules.hasMinimumLength) {
        context.addIssue({
          code: "custom",
          message: "Mật khẩu mới phải có ít nhất 8 ký tự.",
          path: ["newPassword"],
        });
      }

      if (!rules.hasLetter) {
        context.addIssue({
          code: "custom",
          message: "Mật khẩu mới phải có ít nhất một chữ cái.",
          path: ["newPassword"],
        });
      }

      if (!rules.hasDigit) {
        context.addIssue({
          code: "custom",
          message: "Mật khẩu mới phải có ít nhất một chữ số.",
          path: ["newPassword"],
        });
      }
    }

    if (values.confirmPassword.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Hãy nhập lại mật khẩu mới.",
        path: ["confirmPassword"],
      });
    } else if (values.confirmPassword !== values.newPassword) {
      context.addIssue({
        code: "custom",
        message: "Mật khẩu nhập lại chưa khớp.",
        path: ["confirmPassword"],
      });
    }
}

export const changePasswordSchema = newPasswordFieldsSchema.superRefine(
  validateNewPasswordFields,
);

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

    validateNewPasswordFields(values, context);
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type CurrentPasswordChangeFormValues = z.infer<
  typeof currentPasswordChangeSchema
>;

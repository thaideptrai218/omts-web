import { z } from "zod";
import { registrationMethods } from "@/features/registration/domain/registration-method";
import { getPasswordRuleState } from "@/shared/security/password-policy";

export type RegistrationPhoneValidator = (value: string) => boolean;

type RegistrationSchemaOptions = Readonly<{
  isValidPhoneNumber: RegistrationPhoneValidator;
}>;

const registrationFieldsSchema = z.object({
  confirmPassword: z.string(),
  identifier: z.string(),
  method: z.enum(registrationMethods),
  password: z.string(),
});

export type RegistrationFormValues = z.infer<
  typeof registrationFieldsSchema
>;

function addPasswordIssues(
  values: RegistrationFormValues,
  context: z.RefinementCtx,
) {
  if (values.password.length === 0) {
    context.addIssue({
      code: "custom",
      message: "Hãy nhập mật khẩu.",
      path: ["password"],
    });
  } else {
    const rules = getPasswordRuleState(values.password);

    if (!rules.hasMinimumLength) {
      context.addIssue({
        code: "custom",
        message: "Mật khẩu phải có ít nhất 8 ký tự.",
        path: ["password"],
      });
    }

    if (!rules.hasLetter) {
      context.addIssue({
        code: "custom",
        message: "Mật khẩu phải có ít nhất một chữ cái.",
        path: ["password"],
      });
    }

    if (!rules.hasDigit) {
      context.addIssue({
        code: "custom",
        message: "Mật khẩu phải có ít nhất một chữ số.",
        path: ["password"],
      });
    }
  }

  if (values.confirmPassword.length === 0) {
    context.addIssue({
      code: "custom",
      message: "Hãy nhập lại mật khẩu.",
      path: ["confirmPassword"],
    });
  } else if (values.confirmPassword !== values.password) {
    context.addIssue({
      code: "custom",
      message: "Mật khẩu nhập lại chưa khớp.",
      path: ["confirmPassword"],
    });
  }
}

export function createRegistrationSchema({
  isValidPhoneNumber,
}: RegistrationSchemaOptions) {
  return registrationFieldsSchema.superRefine((values, context) => {
    const identifier = values.identifier.trim();

    if (identifier.length === 0) {
      context.addIssue({
        code: "custom",
        message:
          values.method === "email"
            ? "Hãy nhập email."
            : "Hãy nhập số điện thoại.",
        path: ["identifier"],
      });
    } else if (values.method === "email") {
      if (!z.email().safeParse(identifier).success) {
        context.addIssue({
          code: "custom",
          message: "Email chưa đúng định dạng.",
          path: ["identifier"],
        });
      }
    } else if (!isValidPhoneNumber(identifier)) {
      context.addIssue({
        code: "custom",
        message: "Số điện thoại chưa đúng định dạng.",
        path: ["identifier"],
      });
    }

    addPasswordIssues(values, context);
  });
}

import {
  newPasswordSchema,
  type NewPasswordFields,
} from "@/shared/security/new-password-schema";

export const recoveryPasswordSchema = newPasswordSchema;

export type RecoveryPasswordFormValues = NewPasswordFields;

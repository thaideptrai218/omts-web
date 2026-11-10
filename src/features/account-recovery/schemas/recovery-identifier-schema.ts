import { z } from "zod";

// Recovery codes go to the phone number only; an email address never receives one.
export const recoveryIdentifierSchema = z
  .object({
    channel: z.literal("sms"),
    identifier: z.string(),
  })
  .superRefine((values, context) => {
    if (values.identifier.trim().length === 0) {
      context.addIssue({
        code: "custom",
        message: "Hãy nhập số điện thoại.",
        path: ["identifier"],
      });
    }
  });

export type RecoveryIdentifierFormValues = z.infer<
  typeof recoveryIdentifierSchema
>;

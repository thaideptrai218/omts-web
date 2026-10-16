import { z } from "zod";

import type { VerificationChannel } from "@/features/verification/domain/verification-types";

const recoveryChannels = ["email", "sms"] as const satisfies readonly VerificationChannel[];

export const recoveryIdentifierSchema = z
  .object({
    channel: z.enum(recoveryChannels),
    identifier: z.string(),
  })
  .superRefine((values, context) => {
    const identifier = values.identifier.trim();

    if (identifier.length === 0) {
      context.addIssue({
        code: "custom",
        message:
          values.channel === "email"
            ? "Hãy nhập email."
            : "Hãy nhập số điện thoại.",
        path: ["identifier"],
      });
      return;
    }

    if (values.channel === "email" && !z.email().safeParse(identifier).success) {
      context.addIssue({
        code: "custom",
        message: "Email chưa đúng định dạng.",
        path: ["identifier"],
      });
    }
  });

export type RecoveryIdentifierFormValues = z.infer<
  typeof recoveryIdentifierSchema
>;

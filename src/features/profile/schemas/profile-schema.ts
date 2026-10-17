import { z } from "zod";
import type { ProfileIdentifierKind } from "@/features/profile/domain/personal-profile";

export type ProfilePhoneValidator = (value: string) => boolean;

export const profileDetailsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Hãy nhập tên hiển thị."),
});

export type ProfileDetailsFormValues = z.infer<typeof profileDetailsSchema>;

type IdentifierCandidateSchemaOptions = Readonly<{
  currentValue: string | null;
  isValidPhoneNumber: ProfilePhoneValidator;
  kind: ProfileIdentifierKind;
}>;

export function createProfileIdentifierCandidateSchema({
  currentValue,
  isValidPhoneNumber,
  kind,
}: IdentifierCandidateSchemaOptions) {
  return z
    .object({ value: z.string() })
    .superRefine((values, context) => {
      const value = values.value.trim();
      const fieldLabel = kind === "email" ? "email" : "số điện thoại";

      if (value.length === 0) {
        context.addIssue({
          code: "custom",
          message: `Hãy nhập ${fieldLabel} mới.`,
          path: ["value"],
        });
        return;
      }

      if (value === currentValue?.trim()) {
        context.addIssue({
          code: "custom",
          message: `${kind === "email" ? "Email" : "Số điện thoại"} mới phải khác giá trị hiện tại.`,
          path: ["value"],
        });
        return;
      }

      if (kind === "email" && !z.email().safeParse(value).success) {
        context.addIssue({
          code: "custom",
          message: "Email chưa đúng định dạng.",
          path: ["value"],
        });
      }

      if (kind === "phone" && !isValidPhoneNumber(value)) {
        context.addIssue({
          code: "custom",
          message: "Số điện thoại chưa đúng định dạng.",
          path: ["value"],
        });
      }
    });
}

export type ProfileIdentifierCandidateValues = Readonly<{ value: string }>;

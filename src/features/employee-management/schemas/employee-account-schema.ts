import { z } from "zod";
import { accountEditorSchema } from "@/features/account-management/schemas/account-editor-schema";
import { normalizeEmployeePhone } from "./employee-phone";
import { formatMessage } from "@/shared/messages/message-catalog";

const invalid = formatMessage({ code: "MSG01" });
export const employeeAccountSchema = accountEditorSchema.safeExtend({
  fullName: z.string().trim().min(1, invalid).max(200, invalid),
  email: z.string().trim().max(255, invalid).refine((value) => !value || z.email().safeParse(value).success, invalid),
  phone: z.string().trim().refine((value) => !value || normalizeEmployeePhone(value) !== null, invalid),
});

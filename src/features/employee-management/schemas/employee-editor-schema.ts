import { z } from "zod";
import { employeeBankSchema } from "./employee-bank-schema";
import { formatMessage } from "@/shared/messages/message-catalog";
import { createEmployeePersonalSchema } from "./employee-personal-schema";

export function createEmployeeEditorSchema(now?: () => Date) {
  return createEmployeePersonalSchema(now).extend({
    accountId: z.string(),
    status: z.enum(["employed", "left"]),
    workingZoneIds: z.array(z.string().min(1)).refine((ids) => new Set(ids).size === ids.length, formatMessage({ code: "MSG01" })),
    bankAccount: employeeBankSchema,
  });
}

export const employeeEditorSchema = createEmployeeEditorSchema();

export type EmployeeEditorValues = z.infer<typeof employeeEditorSchema>;

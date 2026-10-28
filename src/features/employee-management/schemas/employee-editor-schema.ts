import { z } from "zod";
import { employeeBankSchema } from "./employee-bank-schema";
import { formatMessage } from "@/shared/messages/message-catalog";

export const employeeEditorSchema = z.object({
  accountId: z.string(),
  address: z.string(),
  area: z.string(),
  birthday: z.string(),
  fullName: z.string().trim().min(1, "Hãy nhập họ và tên nhân viên."),
  notes: z.string(),
  otherInformation: z.string(),
  phone: z.string().trim().min(1, "Hãy nhập số điện thoại."),
  status: z.enum(["employed", "left"]),
  wardCommune: z.string(),
  workingZoneIds: z.array(z.string().min(1)).refine((ids) => new Set(ids).size === ids.length, formatMessage({ code: "MSG01" })),
  bankAccount: employeeBankSchema,
});

export type EmployeeEditorValues = z.infer<typeof employeeEditorSchema>;

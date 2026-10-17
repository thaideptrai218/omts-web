import { z } from "zod";

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
});

export type EmployeeEditorValues = z.infer<typeof employeeEditorSchema>;

import { z } from "zod";
import { apiIdSchema, apiTextSchema } from "@/features/auth/api/auth-contract.schemas";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";
import { employeeDateOnlySchema } from "./employee-contract.schemas";
import { normalizeEmployeePhone } from "../schemas/employee-phone";

// Full personal-data PUT only; status changes, unlink and account creation
// have separate endpoints. This does not replace the product form schema.
export const employeeUpdateRequestSchema = z.strictObject({
  fullName: apiTextSchema.max(100),
  phoneNumber: z.string().refine((value) => normalizeEmployeePhone(value) !== null),
  birthday: employeeDateOnlySchema.nullable(),
  address: z.string().max(500).nullable(),
  area: z.string().max(100).nullable(),
  ward: z.string().max(100).nullable(),
  otherInformation: z.string().max(1000).nullable(),
  notes: z.string().max(1000).nullable(),
  workingZoneIds: z.array(apiIdSchema),
  bankAccount: z.strictObject({
    bankName: apiTextSchema.max(100),
    accountNumber: z.string().regex(/^\d{6,20}$/u),
    accountHolderName: apiTextSchema.max(100),
  }).nullable(),
  accountId: apiIdSchema.nullable().optional(),
  rowVersion: employeeRowVersionSchema,
});

export type EmployeeUpdateRequestDto = z.infer<typeof employeeUpdateRequestSchema>;

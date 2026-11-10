import { z } from "zod";
import { apiIdSchema, apiTextSchema } from "@/features/auth/api/auth-contract.schemas";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";
import { employeeDateOnlySchema, employeeTypeSchema } from "./employee-contract.schemas";
import { normalizeEmployeePhone } from "../schemas/employee-phone";

// Full personal-data PUT only; status changes and account creation
// have separate endpoints. This does not replace the product form schema.
export const employeeUpdateRequestSchema = z.strictObject({
  fullName: apiTextSchema.max(100),
  phoneNumber: z.string().refine((value) => !value.trim() || normalizeEmployeePhone(value) !== null).nullish(),
  birthday: employeeDateOnlySchema.nullish(),
  address: z.string().max(500).nullish(),
  area: z.string().max(100).nullish(),
  ward: z.string().max(100).nullish(),
  otherInformation: z.string().max(1000).nullish(),
  notes: z.string().max(1000).nullish(),
  workingZoneIds: z.array(apiIdSchema).refine((ids) => new Set(ids).size === ids.length),
  employeeType: employeeTypeSchema.optional(),
  employeeTypeFrom: employeeDateOnlySchema.nullish(),
  jobTypeIds: z.array(apiIdSchema).refine((ids) => new Set(ids).size === ids.length).optional(),
  bankAccount: z.strictObject({
    bankName: apiTextSchema.max(100),
    accountNumber: z.string().regex(/^\d{6,20}$/u),
    accountHolderName: apiTextSchema.max(100),
  }).nullish(),
  rowVersion: employeeRowVersionSchema,
});

export type EmployeeUpdateRequestDto = z.infer<typeof employeeUpdateRequestSchema>;

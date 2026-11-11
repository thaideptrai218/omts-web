import { z } from "zod";
import { apiIdSchema, apiTextSchema } from "@/features/auth/api/auth-contract.schemas";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";
import { employeeDateOnlySchema, employeeGenderSchema, employeeTypeSchema } from "./employee-contract.schemas";
import { normalizeEmployeePhone } from "../schemas/employee-phone";

// Full personal-data PUT only; status changes and account creation
// have separate endpoints. This does not replace the product form schema.
// null/undefined keep the stored value on PUT. An empty string clears idNumber only; gender and startDate cannot be cleared once set.
export const employeeUpdateRequestSchema = z.strictObject({
  // Letters, digits and "-" up to 20; the backend stores it upper-case. Blank on create = generated, blank on PUT = unchanged.
  code: z.string().regex(/^([A-Za-z0-9-]{1,20})?$/u).nullish(),
  fullName: apiTextSchema.max(100),
  phoneNumber: z.string().refine((value) => !value.trim() || normalizeEmployeePhone(value) !== null).nullish(),
  birthday: employeeDateOnlySchema.nullish(),
  gender: employeeGenderSchema.nullish(),
  idNumber: z.string().regex(/^(\d{9}|\d{12})?$/u).nullish(),
  startDate: employeeDateOnlySchema.nullish(),
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

import { z } from "zod";
import { apiIdSchema } from "@/features/auth/api/auth-contract.schemas";

// Exact labels emitted by EmployeeInput/EmployeeService at backend953f597.
export const employeeBackendFieldSchema = z.enum([
  "Full name", "Phone number", "Birthday", "Address", "Area", "Ward",
  "Other information", "Notes", "Working zones", "Bank account", "Account", "RowVersion",
]);

export const employeeProblemMetadataSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("invalid-fields"), fields: z.array(employeeBackendFieldSchema).min(1).max(12) }),
  z.strictObject({ kind: z.literal("duplicate-employee"), existingEmployeeId: apiIdSchema }),
  z.strictObject({ kind: z.literal("account-already-linked"), existingEmployeeId: apiIdSchema }),
]);
export type EmployeeProblemMetadata = z.infer<typeof employeeProblemMetadataSchema>;

// InvalidModelStateResponse strips '$.' but keeps a JSON property name.
// Normalize declared flat DTO fields only; no arbitrary path/case guessing.
const modelStateAliases: Readonly<Record<string, string>> = Object.freeze({
  fullName: "Full name", phoneNumber: "Phone number", birthday: "Birthday", address: "Address",
  area: "Area", ward: "Ward", otherInformation: "Other information", notes: "Notes",
  workingZoneIds: "Working zones", bankAccount: "Bank account", accountId: "Account", rowVersion: "RowVersion",
});
const wireFieldSchema = z.string().max(64).transform((field) =>
  Object.hasOwn(modelStateAliases, field) ? modelStateAliases[field] : field,
).pipe(employeeBackendFieldSchema);

const validationProblem = z.object({
  field: wireFieldSchema,
  fields: z.array(wireFieldSchema).min(1).max(12).optional(),
});
const employeeIdProblem = z.object({ existingEmployeeId: apiIdSchema, existingId: z.never().optional() });

// Deliberate allowlist, not a parser of raw detail/params or an authorization
// decision. Only profile create/update/unlink contracts are projected.
export function projectEmployeeProblemMetadata(
  endpoint: string, httpStatus: number, code: unknown, body: unknown,
): EmployeeProblemMetadata | undefined {
  if (endpoint !== "employeeCreate" && endpoint !== "employeeUpdate" && endpoint !== "employeeUnlink") return undefined;
  if (httpStatus === 400 && code === "MSG01") {
    const parsed = validationProblem.safeParse(body);
    if (!parsed.success) return undefined;
    const { field, fields } = parsed.data;
    if (fields && fields[0] !== field) return undefined;
    const selected = [...new Set(fields ?? [field])];
    if (endpoint === "employeeUnlink" && selected.some((value) => value !== "RowVersion")) return undefined;
    return { kind: "invalid-fields", fields: selected };
  }
  if ((endpoint === "employeeCreate" || endpoint === "employeeUpdate") && httpStatus === 409 && (code === "MSG03" || code === "MSG24")) {
    const parsed = employeeIdProblem.safeParse(body);
    if (!parsed.success) return undefined;
    return { kind: code === "MSG03" ? "duplicate-employee" : "account-already-linked", existingEmployeeId: parsed.data.existingEmployeeId };
  }
  return undefined;
}

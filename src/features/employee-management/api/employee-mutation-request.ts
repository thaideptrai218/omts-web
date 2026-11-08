import { z } from "zod";
import { apiIdSchema } from "@/features/auth/api/auth-contract.schemas";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";
import { employeeUpdateRequestSchema } from "./employee-update.schema";

// Prepared upstream requests only. No origin, auth header, HTTP execution,
// retry or runtime binding; those belong to the future BFF adapter.
type EmployeePutRequest = Readonly<{
  method: "PUT";
  path: string;
  headers: Readonly<{ Accept: "application/json"; "Content-Type": "application/json" }>;
  body: string;
}>;

type EmployeeUnlinkRequest = Readonly<{
  method: "DELETE";
  path: string;
  headers: Readonly<{ Accept: "application/json" }>;
  body?: never;
}>;

export type EmployeeMutationRequest = EmployeePutRequest | EmployeeUnlinkRequest;
type PreparationResult<T> = Readonly<{ status: "prepared"; request: T }> | Readonly<{ status: "invalid-input" }>;

const unlinkInputSchema = z.strictObject({
  employeeId: apiIdSchema,
  recordVersion: employeeRowVersionSchema,
});

export function prepareEmployeePutRequest(employeeId: unknown, body: unknown): PreparationResult<EmployeePutRequest> {
  const id = apiIdSchema.safeParse(employeeId);
  const payload = employeeUpdateRequestSchema.safeParse(body);
  if (!id.success || !payload.success) return { status: "invalid-input" };
  return {
    status: "prepared",
    request: {
      method: "PUT", path: `/api/employees/${id.data}`,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload.data),
    },
  };
}

export function prepareEmployeeUnlinkRequest(input: unknown): PreparationResult<EmployeeUnlinkRequest> {
  const parsed = unlinkInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid-input" };
  const { employeeId, recordVersion } = parsed.data;
  return {
    status: "prepared",
    request: {
      method: "DELETE",
      path: `/api/employees/${employeeId}/account?rowVersion=${encodeURIComponent(recordVersion)}`,
      headers: { Accept: "application/json" },
    },
  };
}

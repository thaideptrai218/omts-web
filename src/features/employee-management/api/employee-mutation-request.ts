import { apiIdSchema } from "@/features/auth/api/auth-contract.schemas";
import { employeeUpdateRequestSchema } from "./employee-update.schema";

// Prepared upstream requests only. No origin, auth header, HTTP execution,
// retry or runtime binding; those belong to the future BFF adapter.
type EmployeePutRequest = Readonly<{
  method: "PUT";
  path: string;
  headers: Readonly<{ Accept: "application/json"; "Content-Type": "application/json" }>;
  body: string;
}>;

export type EmployeeMutationRequest = EmployeePutRequest;
type PreparationResult<T> = Readonly<{ status: "prepared"; request: T }> | Readonly<{ status: "invalid-input" }>;

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

// Compatibility export for the unmounted legacy transport registry. This endpoint no longer exists.
export function prepareEmployeeUnlinkRequest(_input: unknown): { readonly status: "invalid-input" } {
  void _input;
  return { status: "invalid-input" };
}

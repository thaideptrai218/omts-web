import type { EmployeeMutationRequest } from "./employee-mutation-request";
import { mapEmployeeSavedResponse } from "./map-employee-response";

// Success decoder only. The future transport must route non-200 responses
// through its error handling; this function does not interpret MSG06 or retry.
export function mapEmployeeMutationSuccess(
  method: EmployeeMutationRequest["method"],
  httpStatus: number,
  body: unknown,
  expectedEmployeeId: string,
) {
  if (httpStatus !== 200) return { status: "unexpected-status" } as const;
  const result = mapEmployeeSavedResponse(body, expectedEmployeeId);
  if (result.status === "mapped" && method === "DELETE" && result.value.account !== null) {
    return { status: "invalid-response" } as const;
  }
  return result;
}

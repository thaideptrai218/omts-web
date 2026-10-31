import type { EmployeeReadRequest } from "./employee-read-request";
import { mapEmployeeDetailResponse, mapEmployeePageResponse, mapLinkableEmployeeAccountsResponse } from "./map-employee-response";
import type { EmployeeLinkableAccount, EmployeePage, EmployeeRecord } from "@/features/employee-management/domain/employee-record";

export type EmployeeReadProjection =
  | Readonly<{ status: "loaded"; page: EmployeePage }>
  | Readonly<{ status: "loaded"; employee: EmployeeRecord }>
  | Readonly<{ status: "loaded"; accounts: readonly EmployeeLinkableAccount[] }>
  | Readonly<{ status: "unexpected-status" | "invalid-response" | "employee-mismatch" }>;

// Success projection only; non-200 errors are handled separately by the server.
export function mapEmployeeReadSuccess(request: EmployeeReadRequest, httpStatus: number, body: unknown): EmployeeReadProjection {
  if (httpStatus !== 200) return { status: "unexpected-status" } as const;
  if (request.endpoint === "employeeList") {
    const mapped = mapEmployeePageResponse(body);
    if (mapped.status !== "mapped") return mapped;
    if (mapped.value.page !== request.query.page || mapped.value.pageSize !== request.query.pageSize) {
      return { status: "invalid-response" } as const;
    }
    return { status: "loaded" as const, page: mapped.value };
  }
  if (request.endpoint === "employeeRead") {
    const mapped = mapEmployeeDetailResponse(body, request.employeeId);
    return mapped.status === "mapped" ? { status: "loaded" as const, employee: mapped.value } : mapped;
  }
  const mapped = mapLinkableEmployeeAccountsResponse(body);
  return mapped.status === "mapped" ? { status: "loaded" as const, accounts: mapped.value } : mapped;
}

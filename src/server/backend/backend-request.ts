import "server-only";
import { z } from "zod";
import { apiIdSchema } from "@/features/auth/api/auth-contract.schemas";
import { employeeUpdateRequestSchema } from "@/features/employee-management/api/employee-update.schema";
import { prepareEmployeePutRequest } from "@/features/employee-management/api/employee-mutation-request";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";
import {
  employeeListRequestSchema, employeeDetailRequestSchema, employeePickerRequestSchema,
  type EmployeeListQuery,
} from "@/features/employee-management/api/employee-read-request";
import { farmingZoneListQuerySchema, type FarmingZoneListQuery } from "@/features/farming-zones/api/farming-zone-read-request";

// Resource limits, not business-field validation. Services validate their wire DTOs.
export const MAX_REQUEST_BYTES = 64 * 1024;
const token = z.string().min(1).max(16_384).regex(/^[A-Za-z0-9._~+/-]+=*$/);
const body = z.record(z.string(), z.json());
const requestSchema = z.union([
  z.strictObject({ endpoint: z.literal("login"), body }),
  z.strictObject({ endpoint: z.literal("profileUpdate"), accessToken: token, body }),
  z.strictObject({ endpoint: z.literal("passwordChange"), accessToken: token, body }),
  z.strictObject({ endpoint: z.enum(["identity", "permissions", "profileRead", "logout"]), accessToken: token }),
  z.strictObject({ endpoint: z.literal("employeeUpdate"), employeeId: apiIdSchema, accessToken: token, body: employeeUpdateRequestSchema }),
  z.strictObject({ endpoint: z.literal("employeeUnlink"), employeeId: apiIdSchema, accessToken: token, recordVersion: employeeRowVersionSchema }),
  employeeListRequestSchema.extend({ accessToken: token }),
  employeeDetailRequestSchema.extend({ accessToken: token }),
  employeePickerRequestSchema.extend({ accessToken: token }),
  z.strictObject({ endpoint: z.literal("farmingZoneList"), accessToken: token, query: farmingZoneListQuerySchema }),
]);

export type BackendRequest = z.infer<typeof requestSchema>;
export type PreparedBackendRequest = Readonly<{
  endpoint: BackendRequest["endpoint"];
  headers: Readonly<Record<string, string>>;
  body?: string;
  parameters?: Readonly<{ employeeId?: string; recordVersion?: string; query?: EmployeeListQuery | FarmingZoneListQuery }>;
}>;

export function prepareBackendRequest(input: unknown): PreparedBackendRequest | undefined {
  try {
    const parsed = requestSchema.safeParse(input);
    if (!parsed.success) return undefined;
    const request = parsed.data;
    const headers: Record<string, string> = { Accept: "application/json" };
    if ("accessToken" in request) headers.Authorization = `Bearer ${request.accessToken}`;
    const employeePut = request.endpoint === "employeeUpdate"
      ? prepareEmployeePutRequest(request.employeeId, request.body) : undefined;
    if (employeePut && employeePut.status !== "prepared") return undefined;
    const serialized = employeePut?.status === "prepared" ? employeePut.request.body
      : "body" in request ? JSON.stringify(request.body) : undefined;
    if (serialized !== undefined) {
      if (Buffer.byteLength(serialized, "utf8") > MAX_REQUEST_BYTES) return undefined;
      headers["Content-Type"] = "application/json";
    }
    const parameters = request.endpoint === "employeeList" || request.endpoint === "farmingZoneList" ? { query: Object.freeze(request.query) }
      : request.endpoint === "employeeUnlink"
      ? { employeeId: request.employeeId, recordVersion: request.recordVersion }
      : request.endpoint === "employeeUpdate" || request.endpoint === "employeeRead" ? { employeeId: request.employeeId } : undefined;
    return Object.freeze({ endpoint: request.endpoint, headers: Object.freeze(headers), body: serialized,
      ...(parameters ? { parameters: Object.freeze(parameters) } : {}) });
  } catch {
    // Invalid/cyclic input or getters must not escape with credentials in a cause.
    return undefined;
  }
}

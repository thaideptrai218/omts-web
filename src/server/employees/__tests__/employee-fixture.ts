import { vi } from "vitest";
import { employeeDetailFixture, employeeId } from "@/features/employee-management/api/employee-wire.fixtures";
import { mapEmployeeDetailResponse } from "@/features/employee-management/api/map-employee-response";
import { employeeRecordToEditorValues, mapEmployeeUpdate } from "@/features/employee-management/api/map-employee-update";
import { newSession, accountId } from "../../auth/__tests__/session-fixture";
import { ResolvedServerSession, type ServerSessionResolution } from "../../auth/server-session-resolver";
import type { StoredSession } from "../../auth/session-store";
import type { BackendRequest } from "../../backend/backend-request";
import type { BackendRequestOptions } from "../../backend/backend-transport";
import type { BackendTransportResult } from "../../backend/backend-result";

export { employeeDetailFixture, employeeId };
export const accessCanary = crypto.randomUUID();
export const environment = {
  NODE_ENV: "test", OMTS_DATA_SOURCE: "api", OMTS_API_BASE_URL: "http://127.0.0.1:5280", OMTS_API_TIMEOUT_MS: "1000",
  OMTS_WEB_ORIGIN: "https://web.example.test", OMTS_WEB_COOKIE_PROFILE: "https",
};

export function resolved(overrides: Partial<StoredSession> = {}) {
  const stored: StoredSession = {
    ...newSession({ phase: "application", identity: { accountId, backendSessionId: accountId, subjectType: "CooperativeOwner" } }),
    schemaVersion: 1, revision: "revision-1", createdAtMs: 1, ...overrides,
  };
  return { status: "resolved" as const, session: new ResolvedServerSession(stored, accessCanary) };
}

export function putBody() {
  const record = mapEmployeeDetailResponse(employeeDetailFixture(), employeeId);
  if (record.status !== "mapped") throw new Error("Expected fixture");
  const result = mapEmployeeUpdate(record.value, employeeRecordToEditorValues(record.value));
  if (result.status !== "ready") throw new Error("Expected draft");
  return result.request;
}

export function request(method: "PUT" | "DELETE" = "DELETE", init: RequestInit = {}, query?: string) {
  const search = query ?? (method === "DELETE" ? "?rowVersion=AAAAAAAA%2B%2F8%3D" : "");
  const headers = new Headers({ Origin: environment.OMTS_WEB_ORIGIN, "X-OMTS-Request": "web" });
  if (method === "PUT") headers.set("Content-Type", "application/json");
  if (init.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  return new Request(`${environment.OMTS_WEB_ORIGIN}/fixture/employees/${employeeId}${search}`, {
    method, ...(method === "PUT" ? { body: JSON.stringify(putBody()) } : {}), ...init, headers,
  });
}

export function resolver() {
  return vi.fn<(cookie: unknown) => Promise<ServerSessionResolution>>().mockResolvedValue(resolved());
}

export function backend() {
  return { request: vi.fn<(input: BackendRequest, options?: BackendRequestOptions) => Promise<BackendTransportResult>>()
    .mockResolvedValue({ status: "success", httpStatus: 200, data: { employee: { ...employeeDetailFixture(), account: null }, message: "Saved" } }) };
}

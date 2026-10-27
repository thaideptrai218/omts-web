import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readBackendResponse, MAX_RESPONSE_BYTES } from "./backend-response";
import { projectBackendDiagnostic } from "./backend-diagnostic";
import { employeeId } from "@/features/employee-management/api/employee-wire.fixtures";

const problem = (body: unknown, status = 400) => Response.json(body, { status, headers: { "Content-Type": "application/problem+json" } });

describe("employee bounded HTTP error projection", () => {
  it("keeps structured fields and IDs only, not arbitrary params or error text", async () => {
    const canary = crypto.randomUUID();
    const response = await readBackendResponse(problem({
      code: "MSG01", field: "Full name", fields: ["Full name", "Phone number"],
      detail: canary, hint: canary, params: { field_name: canary }, currentRowVersion: canary,
    }), "employeeUpdate");
    expect(response).toMatchObject({ status: "http-error", httpStatus: 400, code: "MSG01",
      employeeProblem: { kind: "invalid-fields", fields: ["Full name", "Phone number"] } });
    expect(JSON.stringify(response)).not.toContain(canary);
    expect(projectBackendDiagnostic("employeeUpdate", response)).toEqual({
      event: "backend-request", endpoint: "employeeUpdate", outcome: "http-error", httpStatus: 400,
    });
  });

  it.each(["MSG03", "MSG24"])("keeps a validated employee ID for %s without deriving a name", async (code) => {
    const result = await readBackendResponse(problem({ code, existingEmployeeId: employeeId, detail: "Never parse this text" }, 409), "employeeUpdate");
    expect(result).toMatchObject({ employeeProblem: { existingEmployeeId: employeeId } });
    expect(result).not.toHaveProperty("detail"); expect(result).not.toHaveProperty("employee_name");
  });

  it.each(["login", "identity", "permissions", "profileRead", "profileUpdate", "logout", "employeeList", "employeeRead", "employeeLinkableAccounts"] as const)(
    "does not expand endpoint %s error exposure", async (endpoint) => {
      const result = await readBackendResponse(problem({ code: "MSG01", field: "Full name", existingEmployeeId: employeeId }), endpoint);
      expect(result).not.toHaveProperty("employeeProblem");
      expect(JSON.stringify(result)).not.toContain(employeeId);
    },
  );

  it.each([
    { code: "MSG01", fields: ["Full name"] },
    { code: "MSG01", field: "Full name", fields: ["Full name", "Unknown"] },
    { code: "MSG01", field: "Full name", fields: Array(13).fill("Full name") },
    { code: "MSG03", existingEmployeeId: "not-an-id" },
    { code: "MSG03", existingId: employeeId },
  ])("keeps a code but drops unusable metadata case %#", async (body) => {
    const result = await readBackendResponse(problem(body, body.code === "MSG01" ? 400 : 409), "employeeUpdate");
    expect(result).toMatchObject({ status: "http-error", code: body.code });
    expect(result).not.toHaveProperty("employeeProblem");
  });

  it("always keeps MSG06 metadata out, even when the body supplies field/ID/params", async () => {
    const result = await readBackendResponse(problem({ code: "MSG06", field: "Full name", fields: ["Full name"],
      existingEmployeeId: employeeId, currentRowVersion: "AAAAAAAA+/8=", params: { user_name: "Do not infer", time: "now" },
    }, 409), "employeeUpdate");
    expect(result).toMatchObject({ status: "http-error", code: "MSG06" });
    expect(result).not.toHaveProperty("employeeProblem"); expect(result).not.toHaveProperty("currentRowVersion");
    expect(result).not.toHaveProperty("params");
  });

  it.each([401, 403, 500])("does not trust a validation code at HTTP%s", async (status) => {
    expect(await readBackendResponse(problem({ code: "MSG01", field: "Phone number" }, status), "employeeUpdate"))
      .not.toHaveProperty("employeeProblem");
  });

  it("enforces the shared byte limit before parsing error metadata", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(MAX_RESPONSE_BYTES + 1)); },
      cancel() { cancelled = true; },
    });
    const result = await readBackendResponse(new Response(stream, { status: 400, headers: { "Content-Type": "application/problem+json" } }), "employeeUpdate");
    expect(result).toMatchObject({ status: "http-error", code: undefined });
    expect(result).not.toHaveProperty("employeeProblem"); expect(cancelled).toBe(true);
  });
});

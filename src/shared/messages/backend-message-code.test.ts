import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { knownBackendMessageCode, semanticMessageCode } from "./backend-message-code";
import { readBackendResponse } from "@/server/backend/backend-response";
import { readApiProblem } from "@/shared/http/api-problem";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import { mapEmployeeProblem } from "@/features/employee-management/api/map-employee-problem";
describe("PR19 dual message contracts", () => {
  it.each([
    ["MSG-GEN-01", "MSG11", "MSG01"], ["MSG-GEN-09", "MSG03", "MSG61"], ["MSG-GEN-06", "MSG61", "MSG11"], ["MSG-PURCHASE-03", "MSG59", "MSG45"], ["MSG-LABOR-03", "MSG03", "MSG03"],
  ])("prioritizes %s over ambiguous legacy %s", async (code, legacyCode, category) => {
    const response = await readBackendResponse(Response.json({ code, title: code, legacyCode, detail: "never-return" }, { status: 409 }), "profileRead");
    expect(response).toMatchObject({ status: "http-error", code }); expect(semanticMessageCode(code)).toBe(category); expect(JSON.stringify(response)).not.toContain("never-return");
  });
  it("reads a known new title and handles new codes without a legacy field", async () => {
    expect(knownBackendMessageCode({ title: "MSG-ACCOUNT-05" })).toBe("MSG-ACCOUNT-05");
    const problem = await readApiProblem(Response.json({ code: "MSG-WATER-05", detail: "never-return" }, { status: 400 })); expect(problem?.code).toBe("MSG-WATER-05"); expect(JSON.stringify(problem)).not.toContain("never-return");
  });
  it("supports explicit legacy fallback during the transition without parsing English prose", () => {
    expect(knownBackendMessageCode({ code: "FUTURE-CODE", legacyCode: "MSG12" })).toBe("MSG12"); expect(knownBackendMessageCode({ code: "FUTURE-CODE", extensions: { legacyCode: "MSG01" } })).toBe("MSG01");
    expect(knownBackendMessageCode({ code: "FUTURE-CODE", detail: "MSG12 wrong password", legacyCode: "anything" })).toBeUndefined();
  });
  it("keeps approved MSG06 and MSG24 as-is", () => { expect(knownBackendMessageCode({ code: "MSG06" })).toBe("MSG06"); expect(knownBackendMessageCode({ code: "MSG24" })).toBe("MSG24"); });
  it("still projects an employee duplicate ID under MSG-LABOR-03", async () => {
    const id = "122bb318-a72e-49aa-a8d7-a6169f889007";
    const result = await readBackendResponse(Response.json({ code: "MSG-LABOR-03", legacyCode: "MSG03", existingEmployeeId: id, detail: "private" }, { status: 409 }), "employeeCreate");
    expect(result).toMatchObject({ status: "http-error", code: "MSG-LABOR-03", employeeProblem: { kind: "duplicate-employee", existingEmployeeId: id } });
  });
  it("does not mistake the new invalid end-date code for an in-use blocker", () => {
    const message = workspaceError({ status: "error", httpStatus: 409, code: "MSG-GEN-01", uncertain: false }); expect(message).not.toContain("đang được sử dụng"); expect(message).toContain("chưa hợp lệ");
  });
  it("keeps field binding in the prepared employee adapter under the new code", () => {
    expect(mapEmployeeProblem("employeeUpdate", 400, "MSG-GEN-01", { kind: "invalid-fields", fields: ["Phone number"] })).toMatchObject({ status: "invalid-fields", fields: ["phone"] });
  });
  it("renders the new return-quantity error without suggesting a unit-price edit", () => {
    const message = workspaceError({ status: "error", httpStatus: 400, code: "MSG-PURCHASE-03", uncertain: false }); expect(message).toContain("số còn được trả"); expect(message).not.toContain("đơn giá");
  });
});

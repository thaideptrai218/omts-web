import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createEmployeeMutationAdapter } from "./employee-mutation-adapter";
import { backend, resolver, resolved, request, environment, employeeId } from "./__tests__/employee-fixture";

describe("employee BFF structured issues after access/session checks", () => {
  it("maps every known validation field only after checking the session again", async () => {
    const transport = backend(); const resolve = resolver();
    transport.request.mockResolvedValue({ status: "http-error", httpStatus: 400, code: "MSG01",
      employeeProblem: { kind: "invalid-fields", fields: ["Phone number", "Bank account", "Working zones"] } });
    expect(await createEmployeeMutationAdapter(environment, { resolve, backend: transport }).mutate(request("PUT"), employeeId))
      .toEqual({ status: "invalid-fields", code: "MSG01", fields: ["phone", "bankAccount", "workingZoneIds"] });
    expect(resolve).toHaveBeenCalledTimes(2); expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it.each(["MSG03", "MSG24"] as const)("returns the precise employee identity for %s without fetching or navigating", async (code) => {
    const transport = backend();
    transport.request.mockResolvedValue({ status: "http-error", httpStatus: 409, code,
      employeeProblem: { kind: code === "MSG03" ? "duplicate-employee" : "account-already-linked", existingEmployeeId: employeeId } });
    expect(await createEmployeeMutationAdapter(environment, { resolve: resolver(), backend: transport }).mutate(request("PUT"), employeeId))
      .toEqual({ status: code === "MSG03" ? "duplicate" : "account-already-linked", code, existingEmployeeId: employeeId });
    expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it.each(["MSG01", "MSG03", "MSG24"] as const)("blocks missing metadata for %s without guessing a target", async (code) => {
    const transport = backend(); transport.request.mockResolvedValue({ status: "http-error", httpStatus: code === "MSG01" ? 400 : 409, code });
    expect(await createEmployeeMutationAdapter(environment, { resolve: resolver(), backend: transport }).mutate(request("PUT"), employeeId))
      .toEqual({ status: "contract-blocked", reason: "employee-error-metadata", code });
    expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it("withholds field/identity data when logout occurs while the response is pending", async () => {
    const transport = backend(); const resolve = resolver().mockResolvedValueOnce(resolved()).mockResolvedValueOnce({ status: "anonymous" });
    transport.request.mockResolvedValue({ status: "http-error", httpStatus: 409, code: "MSG03",
      employeeProblem: { kind: "duplicate-employee", existingEmployeeId: employeeId } });
    expect(await createEmployeeMutationAdapter(environment, { resolve, backend: transport }).mutate(request("PUT"), employeeId))
      .toEqual({ status: "session-changed" });
  });

  it("keeps MSG06 on its existing blocked branch without using even a supplied employee issue", async () => {
    const transport = backend(); transport.request.mockResolvedValue({ status: "http-error", httpStatus: 409, code: "MSG06",
      employeeProblem: { kind: "duplicate-employee", existingEmployeeId: employeeId } });
    expect(await createEmployeeMutationAdapter(environment, { resolve: resolver(), backend: transport }).mutate(request("PUT"), employeeId))
      .toEqual({ status: "contract-blocked", reason: "conflict-metadata", code: "MSG06" });
  });
});

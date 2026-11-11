import { describe, expect, it } from "vitest";
import { mapEmployeeMutationSuccess } from "./map-employee-mutation-success";
import { employeeDetailFixture, employeeId, linkedAccountId } from "./employee-wire.fixtures";

function savedResponse() {
  return { employee: employeeDetailFixture(), message: "Saved upstream", messageCode: "MSG-GEN-05" };
}

describe("employee PUT/DELETE success contract", () => {
  it("accepts PUT 200 with the envelope and the exact returned version", () => {
    const body = savedResponse();
    body.employee.rowVersion = "AAAAAAAB+/8=";
    expect(mapEmployeeMutationSuccess("PUT", 200, body, employeeId)).toMatchObject({
      status: "mapped", value: { id: employeeId, recordVersion: "AAAAAAAB+/8=" },
    });
  });



  it.each([201, 202, 204, 206, 400, 401, 403, 404, 409, 429, 500, 503])(
    "does not turn HTTP %s into success even with a valid-looking envelope", (status) => {
      for (const method of ["PUT"] as const) {
        expect(mapEmployeeMutationSuccess(method, status, {
          employee: { ...employeeDetailFixture(), account: null }, message: "Saved upstream", messageCode: "MSG-GEN-05",
        }, employeeId)).toEqual({ status: "unexpected-status" });
      }
    },
  );

  it.each([undefined, null, employeeDetailFixture(), { employee: { id: employeeId }, message: "Saved", messageCode: "MSG-GEN-05" }])(
    "does not accept incomplete HTTP 200 bodies: %j", (body) => {
      expect(mapEmployeeMutationSuccess("PUT", 200, body, employeeId)).toEqual({ status: "invalid-response" });
    },
  );

  it("rejects a different employee and discards raw copy/one-time credentials", () => {
    const body = { ...savedResponse(), temporaryPassword: crypto.randomUUID() };
    expect(mapEmployeeMutationSuccess("PUT", 200, body, linkedAccountId)).toEqual({ status: "employee-mismatch" });
    const mapped = mapEmployeeMutationSuccess("PUT", 200, body, employeeId);
    expect(mapped.status).toBe("mapped");
    expect(mapped).not.toHaveProperty("message");
    expect(mapped).not.toHaveProperty("temporaryPassword");
  });

});

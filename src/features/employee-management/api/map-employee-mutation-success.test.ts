import { describe, expect, it } from "vitest";
import { mapEmployeeMutationSuccess } from "./map-employee-mutation-success";
import { prepareEmployeePutRequest, prepareEmployeeUnlinkRequest } from "./employee-mutation-request";
import { employeeDetailFixture, employeeId, linkedAccountId } from "./employee-wire.fixtures";
import { mapEmployeeDetailResponse } from "./map-employee-response";
import { employeeRecordToEditorValues, mapEmployeeUpdate } from "./map-employee-update";

function savedResponse() {
  return { employee: employeeDetailFixture(), message: "Saved upstream" };
}

describe("employee PUT/DELETE success contract", () => {
  it("accepts PUT 200 with the envelope and the exact returned version", () => {
    const body = savedResponse();
    body.employee.rowVersion = "AAAAAAAB+/8=";
    expect(mapEmployeeMutationSuccess("PUT", 200, body, employeeId)).toMatchObject({
      status: "mapped", value: { id: employeeId, recordVersion: "AAAAAAAB+/8=" },
    });
  });

  it("requires DELETE 200 to confirm that the link is absent", () => {
    const body = savedResponse();
    expect(mapEmployeeMutationSuccess("DELETE", 200, body, employeeId)).toEqual({ status: "invalid-response" });
    expect(mapEmployeeMutationSuccess("DELETE", 200, {
      ...body, employee: { ...body.employee, account: null },
    }, employeeId)).toMatchObject({ status: "mapped", value: { account: null } });
  });

  it("accepts an already-unlinked no-op without requiring a changed version", () => {
    const body = { employee: { ...employeeDetailFixture(), account: null }, message: "Saved upstream" };
    expect(mapEmployeeMutationSuccess("DELETE", 200, body, employeeId)).toMatchObject({
      status: "mapped", value: { recordVersion: body.employee.rowVersion, account: null },
    });
  });

  it.each([201, 202, 204, 206, 400, 401, 403, 404, 409, 429, 500, 503])(
    "does not turn HTTP %s into success even with a valid-looking envelope", (status) => {
      for (const method of ["PUT", "DELETE"] as const) {
        expect(mapEmployeeMutationSuccess(method, status, {
          employee: { ...employeeDetailFixture(), account: null }, message: "Saved upstream",
        }, employeeId)).toEqual({ status: "unexpected-status" });
      }
    },
  );

  it.each([undefined, null, employeeDetailFixture(), { employee: { id: employeeId }, message: "Saved" }])(
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

  it("keeps the personal draft through DELETE serialization/response and the next PUT", () => {
    const initial = mapEmployeeDetailResponse(employeeDetailFixture(), employeeId);
    if (initial.status !== "mapped") throw new Error("Expected complete fixture");
    const draft = { ...employeeRecordToEditorValues(initial.value), fullName: "Tên đang nhập", notes: "Chưa lưu" };
    const before = structuredClone(draft);
    const unlink = prepareEmployeeUnlinkRequest({ employeeId, recordVersion: initial.value.recordVersion });
    if (unlink.status !== "prepared") throw new Error("Expected DELETE");
    expect(new URL(unlink.request.path, "http://127.0.0.1:5280").searchParams.get("rowVersion"))
      .toBe(initial.value.recordVersion);

    const unlinked = mapEmployeeMutationSuccess(unlink.request.method, 200, {
      employee: { ...employeeDetailFixture(), account: null, rowVersion: "AAAAAAAB+/8=" }, message: "Saved",
    }, employeeId);
    if (unlinked.status !== "mapped") throw new Error("Expected unlinked record");
    const update = mapEmployeeUpdate(unlinked.value, { ...draft, accountId: "" });
    if (update.status !== "ready") throw new Error("Expected mapped draft");
    const put = prepareEmployeePutRequest(update.employeeId, update.request);
    if (put.status !== "prepared") throw new Error("Expected PUT");
    expect(JSON.parse(put.request.body)).toMatchObject({
      fullName: draft.fullName, notes: draft.notes, accountId: null,
      rowVersion: "AAAAAAAB+/8=", bankAccount: employeeDetailFixture().bankAccount,
      workingZoneIds: employeeDetailFixture().workingZones.map((zone) => zone.id),
    });
    expect(draft).toEqual(before);
  });
});

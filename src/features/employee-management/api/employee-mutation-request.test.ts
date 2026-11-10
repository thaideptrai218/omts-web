import { describe, expect, it } from "vitest";
import { prepareEmployeePutRequest, prepareEmployeeUnlinkRequest } from "./employee-mutation-request";
import { employeeDetailFixture, employeeId } from "./employee-wire.fixtures";
const body = () => { const e = employeeDetailFixture(); return { fullName: e.fullName, phoneNumber: e.phoneNumber, birthday: e.birthday, address: e.address, area: e.area, ward: e.ward, otherInformation: e.otherInformation, notes: e.notes, workingZoneIds: e.workingZones.map(z => z.id), bankAccount: e.bankAccount, rowVersion: e.rowVersion, jobTypeIds: [] }; };
describe("employee upstream request preparation", () => {
  it("serializes PUT with the checked version and without account operations", () => {
    const input = body(); const prepared = prepareEmployeePutRequest(employeeId, input);
    expect(prepared).toEqual({ status: "prepared", request: { method: "PUT", path: `/api/employees/${employeeId}`, headers: { Accept: "application/json", "Content-Type": "application/json" }, body: expect.any(String) } });
    if (prepared.status !== "prepared") throw new Error("Expected PUT");
    expect(JSON.parse(prepared.request.body)).toEqual(input);
    expect(prepareEmployeePutRequest(employeeId, { ...input, accountId: employeeId })).toEqual({ status: "invalid-input" });
  });
  it.each(["../accounts", "", null])("rejects invalid route identity %s", id => expect(prepareEmployeePutRequest(id, body())).toEqual({ status: "invalid-input" }));
  it.each([{ rowVersion: "" }, { fullName: "" }, { workingZoneIds: [employeeId, employeeId] }, { bankAccount: { bankName: "Incomplete" } }, { phoneNumber: "abc" }])("rejects invalid PUT data %j", change => expect(prepareEmployeePutRequest(employeeId, { ...body(), ...change })).toEqual({ status: "invalid-input" }));
  it("refuses the removed unlink endpoint", () => expect(prepareEmployeeUnlinkRequest({ employeeId, recordVersion: "AAAAAAAA+/8=" })).toEqual({ status: "invalid-input" }));
});

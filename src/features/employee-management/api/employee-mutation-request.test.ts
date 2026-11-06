import { describe, expect, it } from "vitest";
import { prepareEmployeePutRequest, prepareEmployeeUnlinkRequest } from "./employee-mutation-request";
import { employeeDetailFixture, employeeId, linkedAccountId } from "./employee-wire.fixtures";
import { mapEmployeeDetailResponse } from "./map-employee-response";
import { employeeRecordToEditorValues, mapEmployeeUpdate } from "./map-employee-update";

function putPayload() {
  const record = mapEmployeeDetailResponse(employeeDetailFixture(), employeeId);
  if (record.status !== "mapped") throw new Error("Expected complete fixture");
  const mapped = mapEmployeeUpdate(record.value, employeeRecordToEditorValues(record.value));
  if (mapped.status !== "ready") throw new Error("Expected update payload");
  return mapped.request;
}

describe("employee PUT request serialization", () => {
  it("keeps Unicode, JSON escapes, all fields and raw rowVersion in the JSON body", () => {
    const input = { ...putPayload(), notes: 'Ghi chú "mới"\nDòng tiếp theo' };
    const result = prepareEmployeePutRequest(employeeId, input);
    if (result.status !== "prepared") throw new Error("Expected prepared PUT");
    expect(result.request).toMatchObject({
      method: "PUT", path: `/api/employees/${employeeId}`,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
    });
    expect(JSON.parse(result.request.body)).toEqual(input);
    expect(result.request.body).toContain("AAAAAAAA+/8=");
    expect(result.request.body).not.toContain("%2B");
    expect(result.request.path).not.toContain("?");
  });

  it("keeps explicit null and omitted accountId distinct without constructing a DELETE", () => {
    const withoutAccount = { ...putPayload() };
    delete withoutAccount.accountId;
    for (const payload of [withoutAccount, { ...putPayload(), accountId: null }]) {
      const result = prepareEmployeePutRequest(employeeId, payload);
      if (result.status !== "prepared") throw new Error("Expected prepared PUT");
      expect(result.request.method).toBe("PUT");
      expect(result.request.path).toBe(`/api/employees/${employeeId}`);
      expect(JSON.parse(result.request.body)).toEqual(payload);
    }
  });

  it("takes a serialization snapshot before the caller changes nested input", () => {
    const input = putPayload();
    const before = structuredClone(input);
    const result = prepareEmployeePutRequest(employeeId, input);
    if (result.status !== "prepared") throw new Error("Expected prepared PUT");
    expect(input).toEqual(before);
    input.workingZoneIds.push(linkedAccountId);
    if (input.bankAccount) input.bankAccount.bankName = "Thay đổi sau khi dựng";
    input.rowVersion = "AAAAAAAB+/8=";
    expect(JSON.parse(result.request.body)).toEqual(before);
  });

  it.each([null, undefined, { status: "Left" }, { ...putPayload(), rowVersion: "" },
    { ...putPayload(), rowVersion: "AAAAAAAA%2B%2F8%3D" },
    { ...putPayload(), account: {} }, { ...putPayload(), accessToken: crypto.randomUUID() },
  ])("rejects incompatible PUT bodies without exposing them: %j", (input) => {
    expect(prepareEmployeePutRequest(employeeId, input)).toEqual({ status: "invalid-input" });
  });
});

describe("employee DELETE unlink query serialization", () => {
  it("encodes the raw version exactly once in the fixed account endpoint", () => {
    const result = prepareEmployeeUnlinkRequest({ employeeId, recordVersion: "AAAAAAAA+/8=" });
    expect(result).toEqual({ status: "prepared", request: {
      method: "DELETE", path: `/api/employees/${employeeId}/account?rowVersion=AAAAAAAA%2B%2F8%3D`,
      headers: { Accept: "application/json" },
    } });
    if (result.status !== "prepared") throw new Error("Expected prepared DELETE");
    expect(result.request).not.toHaveProperty("body");
    expect(result.request.headers).not.toHaveProperty("Content-Type");
    expect(result.request.path).not.toContain("%25");
  });

  it.each(["AAAAAAAA+/8=", "AAAAAAAB+/8=", "////", "++++", "AA==", "AAA="])(
    "survives URL/Request serialization and a single query decode: %s", (recordVersion) => {
      const result = prepareEmployeeUnlinkRequest({ employeeId, recordVersion });
      if (result.status !== "prepared") throw new Error("Expected prepared DELETE");
      const request = new Request(new URL(result.request.path, "http://127.0.0.1:5280"), result.request);
      const received = new URL(request.url);
      expect(received.pathname).toBe(`/api/employees/${employeeId}/account`);
      expect(received.searchParams.getAll("rowVersion")).toEqual([recordVersion]);
      expect([...received.searchParams.keys()]).toEqual(["rowVersion"]);
      expect(request.method).toBe("DELETE");
    },
  );

  it.each([null, {}, { employeeId }, { employeeId, recordVersion: null },
    { employeeId, recordVersion: "" }, { employeeId, recordVersion: " AAAAAAAA+/8= " },
    { employeeId, recordVersion: "AAAAAAAA%2B%2F8%3D" },
    { employeeId, recordVersion: "AAAAAAAA%252B%252F8%253D" },
    { employeeId, recordVersion: "AAAAAAAA+/8=&role=owner" },
    { employeeId, recordVersion: "AAAAAAAA+/8=", accountId: null },
  ])("refuses absent, pre-encoded or injected versions: %j", (input) => {
    expect(prepareEmployeeUnlinkRequest(input)).toEqual({ status: "invalid-input" });
  });
});

describe("fixed employee mutation targets", () => {
  it.each(["", null, "../accounts", `${employeeId}/account`, `${employeeId}?x=1`,
    `${employeeId}%2Faccount`, "https://example.test/api/accounts", "//example.test/accounts",
  ])("rejects an invalid employee ID for both methods: %s", (id) => {
    expect(prepareEmployeePutRequest(id, putPayload())).toEqual({ status: "invalid-input" });
    expect(prepareEmployeeUnlinkRequest({ employeeId: id, recordVersion: "AAAAAAAA+/8=" }))
      .toEqual({ status: "invalid-input" });
  });
});

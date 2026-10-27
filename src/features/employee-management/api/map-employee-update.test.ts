import { describe, expect, it } from "vitest";
import { employeeUpdateRequestSchema } from "./employee-update.schema";
import { employeeRecordToEditorValues, mapEmployeeUpdate } from "./map-employee-update";
import { mapEmployeeDetailResponse, mapEmployeeSavedResponse } from "./map-employee-response";
import { employeeDetailFixture, employeeId, linkedAccountId } from "./employee-wire.fixtures";

function recordFrom(input: unknown = employeeDetailFixture()) {
  const result = mapEmployeeDetailResponse(input, employeeId);
  if (result.status !== "mapped") throw new Error("Expected complete fixture record");
  return result.value;
}

describe("employee personal-data PUT mapping", () => {
  it("changing one field retains every other personal field, bank, zones and version", () => {
    const dto = employeeDetailFixture();
    const record = recordFrom(dto);
    const draft = { ...employeeRecordToEditorValues(record), fullName: "Tên đã chỉnh" };
    const before = structuredClone({ record, draft });
    expect(mapEmployeeUpdate(record, draft)).toEqual({
      status: "ready", employeeId,
      request: {
        fullName: draft.fullName, phoneNumber: dto.phoneNumber, birthday: dto.birthday,
        address: dto.address, area: dto.area, ward: dto.ward, otherInformation: dto.otherInformation,
        notes: dto.notes, workingZoneIds: dto.workingZones.map((zone) => zone.id),
        bankAccount: dto.bankAccount, accountId: linkedAccountId, rowVersion: dto.rowVersion,
      },
    });
    expect({ record, draft }).toEqual(before);
  });

  it("preserves untouched null/empty values and allows clearing an optional personal field", () => {
    const record = recordFrom({
      ...employeeDetailFixture(), birthday: null, address: "", area: null, ward: null,
      otherInformation: null, notes: null, bankAccount: null, workingZones: [], account: null,
    });
    const draft = employeeRecordToEditorValues(record);
    expect(draft).toMatchObject({ birthday: "", area: "", accountId: "" });
    expect(mapEmployeeUpdate(record, draft)).toMatchObject({ status: "ready", request: {
      birthday: null, address: "", area: null, ward: null, otherInformation: null, notes: null,
      workingZoneIds: [], bankAccount: null, accountId: null,
    } });
    const populated = recordFrom();
    expect(mapEmployeeUpdate(populated, { ...employeeRecordToEditorValues(populated), address: "" }))
      .toMatchObject({ status: "ready", request: { address: null } });
  });

  it("does not substitute a phone for a record with no phone", () => {
    const record = recordFrom({ ...employeeDetailFixture(), phoneNumber: null });
    const draft = employeeRecordToEditorValues(record);
    expect(draft.phone).toBe("");
    expect(mapEmployeeUpdate(record, draft)).toEqual({ status: "invalid-input" });
  });

  it("requires an explicit unlink instead of interpreting PUT null as removal", () => {
    const record = recordFrom();
    expect(mapEmployeeUpdate(record, { ...employeeRecordToEditorValues(record), accountId: "" }))
      .toEqual({ status: "unlink-required" });
  });

  it("uses the new server version after unlink while retaining the personal draft", () => {
    const record = recordFrom();
    const draft = { ...employeeRecordToEditorValues(record), fullName: "Tên còn đang nhập", notes: "Ghi chú mới" };
    const input = {
      employee: { ...employeeDetailFixture(), account: null, rowVersion: "AAAAAAAB+/8=" },
      message: "Saved",
    };
    const unlinked = mapEmployeeSavedResponse(input, employeeId);
    if (unlinked.status !== "mapped") throw new Error("Expected unlink response");
    // Matches the existing editor: only clear the removed link in the draft.
    const next = mapEmployeeUpdate(unlinked.value, { ...draft, accountId: "" });
    expect(next).toMatchObject({ status: "ready", request: {
      fullName: draft.fullName, notes: draft.notes, accountId: null,
      rowVersion: "AAAAAAAB+/8=", bankAccount: input.employee.bankAccount,
      workingZoneIds: input.employee.workingZones.map((zone) => zone.id),
    } });
    expect(draft.accountId).toBe(linkedAccountId);
    expect(record.recordVersion).toBe("AAAAAAAA+/8=");
  });

  it("requires a separate employment action and never puts status/end date into PUT", () => {
    const record = recordFrom();
    expect(mapEmployeeUpdate(record, { ...employeeRecordToEditorValues(record), status: "left" }))
      .toEqual({ status: "employment-action-required" });
    const left = recordFrom({ ...employeeDetailFixture(), status: "Left", employmentEndDate: "2026-10-20" });
    expect(mapEmployeeUpdate(left, { ...employeeRecordToEditorValues(left), status: "employed" }))
      .toEqual({ status: "employment-action-required" });
    const unchanged = mapEmployeeUpdate(left, employeeRecordToEditorValues(left));
    if (unchanged.status !== "ready") throw new Error("Expected personal-data update");
    expect(unchanged.request).not.toHaveProperty("status");
    expect(unchanged.request).not.toHaveProperty("employmentEndDate");
  });

  it.each(["0900000000", "+84900000000", "84900000000", "0900 000 000", "(0900)-000.000"])(
    "accepts the backend's supported phone representation: %s", (phone) => {
      const record = recordFrom();
      expect(mapEmployeeUpdate(record, { ...employeeRecordToEditorValues(record), phone }))
        .toMatchObject({ status: "ready", request: { phoneNumber: phone } });
    },
  );

  it.each([
    { fullName: " " }, { fullName: "a".repeat(101) }, { phone: "abc" }, { phone: "123" },
    { birthday: "2025-02-29" }, { birthday: "1996-02-29T00:00:00Z" },
    { accountId: "mock-account" }, { address: "a".repeat(501) },
  ])("refuses an incompatible request without changing the draft: %j", (change) => {
    const record = recordFrom();
    const draft = { ...employeeRecordToEditorValues(record), ...change };
    const before = structuredClone(draft);
    expect(mapEmployeeUpdate(record, draft)).toEqual({ status: "invalid-input" });
    expect(draft).toEqual(before);
  });

  it("rejects other operations and response metadata in the strict update request", () => {
    const record = recordFrom();
    const result = mapEmployeeUpdate(record, employeeRecordToEditorValues(record));
    if (result.status !== "ready") throw new Error("Expected ready request");
    for (const field of ["status", "employmentEndDate", "account", "id", "message"]) {
      expect(employeeUpdateRequestSchema.safeParse({ ...result.request, [field]: "unsupported" }).success).toBe(false);
    }
    expect(employeeUpdateRequestSchema.safeParse({ ...result.request, accountId: null }).success).toBe(true);
    const withoutAccount = { ...result.request };
    delete withoutAccount.accountId;
    expect(employeeUpdateRequestSchema.safeParse(withoutAccount).success).toBe(true);
  });
});

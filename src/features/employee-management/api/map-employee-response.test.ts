import { describe, expect, it } from "vitest";
import {
  mapEmployeeDetailResponse, mapEmployeePageResponse, mapEmployeeSavedResponse,
  mapLinkableEmployeeAccountsResponse,
} from "./map-employee-response";
import { employeeDetailFixture, employeeId, employeeListItemFixture, linkedAccountId } from "./employee-wire.fixtures";

describe("employee wire-to-record mapping", () => {
  it("maps all personal data while retaining zones, bank details and version", () => {
    const dto = employeeDetailFixture();
    expect(mapEmployeeDetailResponse(dto, employeeId)).toEqual({
      status: "mapped",
      value: {
        id: employeeId, fullName: dto.fullName, phone: dto.phoneNumber,
        birthday: dto.birthday, address: dto.address, area: dto.area,
        wardCommune: dto.ward, otherInformation: dto.otherInformation, notes: dto.notes,
        workingZones: dto.workingZones, bankAccount: dto.bankAccount,
        account: { ...dto.account, status: "active" }, status: "employed",
        employmentEndDate: null, recordVersion: "AAAAAAAA+/8=",
      },
    });
  });

  it("maps Left/Locked exactly without conflating employment and account access", () => {
    const dto = employeeDetailFixture();
    const result = mapEmployeeDetailResponse({
      ...dto, status: "Left", employmentEndDate: "2026-10-20",
      account: { ...dto.account, status: "Locked" },
    }, employeeId);
    expect(result).toMatchObject({ status: "mapped", value: {
      status: "left", account: { status: "locked" }, employmentEndDate: "2026-10-20",
    } });
  });

  it("keeps nulls and never fabricates linked-account phone, grants or roles", () => {
    const dto = employeeDetailFixture();
    const result = mapEmployeeDetailResponse({
      ...dto, phoneNumber: null, birthday: null, address: null, bankAccount: null, workingZones: [],
    }, employeeId);
    expect(result).toMatchObject({ status: "mapped", value: {
      phone: null, birthday: null, address: null, bankAccount: null, workingZones: [],
    } });
    if (result.status !== "mapped") throw new Error("Expected mapped record");
    expect(result.value.account).not.toHaveProperty("phone");
    expect(result.value.account).not.toHaveProperty("roles");
    expect(result.value).not.toHaveProperty("grants");
  });

  it("checks identity for detail and saved responses, allowing only GUID casing differences", () => {
    const dto = employeeDetailFixture();
    expect(mapEmployeeDetailResponse(dto, employeeId.toUpperCase()).status).toBe("mapped");
    expect(mapEmployeeDetailResponse(dto, linkedAccountId)).toEqual({ status: "employee-mismatch" });
    expect(mapEmployeeSavedResponse({ employee: dto, message: "Saved" }, linkedAccountId))
      .toEqual({ status: "employee-mismatch" });
  });

  it("reads a save envelope and projects away English copy and one-time credentials", () => {
    const result = mapEmployeeSavedResponse({
      employee: { ...employeeDetailFixture(), account: null },
      message: "Saved upstream", temporaryPassword: crypto.randomUUID(),
    }, employeeId);
    expect(result).toMatchObject({ status: "mapped", value: { account: null } });
    expect(result).not.toHaveProperty("message");
    expect(result).not.toHaveProperty("temporaryPassword");
  });

  it("rejects incomplete and incompatible data without returning a partial record", () => {
    expect(mapEmployeeDetailResponse(employeeListItemFixture(), employeeId)).toEqual({ status: "invalid-response" });
    expect(mapEmployeeDetailResponse({ ...employeeDetailFixture(), status: "NewStatus" }, employeeId))
      .toEqual({ status: "invalid-response" });
    expect(mapEmployeeSavedResponse(employeeDetailFixture(), employeeId)).toEqual({ status: "invalid-response" });
  });

  it("maps pagination independently and does not make list rows editable", () => {
    const result = mapEmployeePageResponse({ items: [employeeListItemFixture()], page: 2, pageSize: 20, total: 25 });
    expect(result).toMatchObject({ status: "mapped", value: {
      page: 2, pageSize: 20, total: 25, items: [{ id: employeeId, status: "employed", phone: "0900000000" }],
    } });
    if (result.status !== "mapped") throw new Error("Expected mapped page");
    expect(result.value.items[0]).not.toHaveProperty("recordVersion");
    expect(result.value.items[0]).not.toHaveProperty("bankAccount");
    expect(mapEmployeePageResponse({ items: [], page: 1, pageSize: 20, total: 0 }))
      .toEqual({ status: "mapped", value: { items: [], page: 1, pageSize: 20, total: 0 } });
    expect(mapEmployeePageResponse({ items: [{ id: employeeId }], page: 1, pageSize: 20, total: 1 }))
      .toEqual({ status: "invalid-response" });
  });

  it("keeps only the actual picker phone, including null, without copying employee data", () => {
    const account = employeeListItemFixture().account;
    expect(mapLinkableEmployeeAccountsResponse([{ ...account, phoneNumber: null }]))
      .toEqual({ status: "mapped", value: [{ ...account, status: "active", phone: null }] });
    expect(mapLinkableEmployeeAccountsResponse([{ ...account, phoneNumber: "+84900000000" }]))
      .toMatchObject({ status: "mapped", value: [{ phone: "+84900000000" }] });
    expect(mapLinkableEmployeeAccountsResponse([account])).toEqual({ status: "invalid-response" });
  });

  it("does not mutate the input or retain references to nested response objects", () => {
    const input = { ...employeeDetailFixture(), privateField: "ignore" };
    const before = structuredClone(input);
    const result = mapEmployeeDetailResponse(input, employeeId);
    expect(input).toEqual(before);
    input.workingZones[0].name = "Changed outside mapper";
    input.bankAccount.bankName = "Changed outside mapper";
    if (result.status !== "mapped") throw new Error("Expected mapped record");
    expect(result.value.workingZones[0].name).toBe(before.workingZones[0].name);
    expect(result.value.bankAccount?.bankName).toBe(before.bankAccount.bankName);
    expect(result.value).not.toHaveProperty("privateField");
  });
});

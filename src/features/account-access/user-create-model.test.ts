import { describe, expect, it } from "vitest";
import { allZonesTakenByOthers, checkCreateAccount, createAccountError, grantRowsError, newGrantRow, rowsToGrants, zonesTakenByOthers, type GrantRow } from "./user-create-model";

const zoneA = "11111111-1111-4111-8111-111111111111", zoneB = "22222222-2222-4222-8222-222222222222";
const zones = [{ id: zoneA, name: "Ngọc Vừng" }, { id: zoneB, name: "Minh Châu" }];
const manager = (key: number, zoneIds: string[], allZones = false): GrantRow => ({ key, role: "ZONE_MANAGER", allZones, zoneIds });
const accountant = (key: number): GrantRow => ({ key, role: "ACCOUNTANT", allZones: false, zoneIds: [] });
const values = { displayName: "Lê An", username: "le.an", phoneNumber: "0912345678", email: "", note: "", employeeId: null };

describe("grant rows", () => {
  it("turns rows into grants: one per zone, all zones as one, Kế toán always whole-cooperative", () => {
    expect(rowsToGrants([manager(1, [zoneA, zoneB]), accountant(2)])).toEqual([{ zoneId: zoneA, role: "ZONE_MANAGER" }, { zoneId: zoneB, role: "ZONE_MANAGER" }, { zoneId: null, role: "ACCOUNTANT" }]);
    expect(rowsToGrants([manager(1, [zoneA], true)])).toEqual([{ zoneId: null, role: "ZONE_MANAGER" }]);
    expect(rowsToGrants([newGrantRow(1)])).toEqual([]);
  });
  it("lets a zone appear once: another row's zones and all-zones are taken", () => {
    const rows = [manager(1, [zoneA]), manager(2, [])];
    expect([...zonesTakenByOthers(rows, 2)]).toEqual([zoneA]);
    expect([...zonesTakenByOthers(rows, 1)]).toEqual([]);
    expect(allZonesTakenByOthers([manager(1, [], true), manager(2, [])], 2)).toBe(true);
    expect(allZonesTakenByOthers([manager(1, [], true)], 1)).toBe(false);
  });
  it("names the first problem in plain words and ignores blank rows", () => {
    expect(grantRowsError([newGrantRow(1)], zones)).toBeUndefined();
    expect(grantRowsError([manager(1, [])], zones)).toMatch(/ít nhất một vùng/);
    expect(grantRowsError([{ key: 1, role: "", allZones: false, zoneIds: [zoneA] }], zones)).toMatch(/Chọn vai trò/);
    expect(grantRowsError([manager(1, [zoneA]), manager(2, [zoneA])], zones)).toBe("Vùng Ngọc Vừng chỉ được có một vai trò.");
    expect(grantRowsError([manager(1, [], true), manager(2, [zoneB])], zones)).toMatch(/tất cả vùng/);
    expect(grantRowsError([accountant(1), accountant(2)], zones)).toMatch(/một lần/);
    expect(grantRowsError([manager(1, [zoneA]), manager(2, [zoneB]), accountant(3)], zones)).toBeUndefined();
  });
});

describe("create account check", () => {
  it("builds the request body with the employee and grants", () => {
    const checked = checkCreateAccount({ ...values, employeeId: "33333333-3333-4333-8333-333333333333", note: " Ghi " }, [manager(1, [zoneA])], zones);
    expect(checked).toEqual({ ok: true, body: { displayName: "Lê An", username: "le.an", phoneNumber: "0912345678", email: null, employeeId: "33333333-3333-4333-8333-333333333333", grants: [{ zoneId: zoneA, role: "ZONE_MANAGER" }], note: "Ghi" } });
  });
  it("creates an account with no employee and no role (it cannot sign in yet)", () => {
    expect(checkCreateAccount(values, [newGrantRow(1)], zones)).toMatchObject({ ok: true, body: { employeeId: null, grants: [] } });
  });
  it("points at the field that is wrong", () => {
    expect(checkCreateAccount({ ...values, displayName: " " }, [], zones)).toMatchObject({ ok: false, field: "displayName" });
    expect(checkCreateAccount({ ...values, phoneNumber: "12345" }, [], zones)).toMatchObject({ ok: false, field: "phoneNumber" });
    expect(checkCreateAccount({ ...values, email: "abc" }, [], zones)).toMatchObject({ ok: false, field: "email" });
    expect(checkCreateAccount({ ...values, username: "ab" }, [], zones)).toMatchObject({ ok: false, field: "username" });
    expect(checkCreateAccount({ ...values, note: "x".repeat(501) }, [], zones)).toMatchObject({ ok: false, field: "note" });
    expect(checkCreateAccount(values, [manager(1, [])], zones)).toMatchObject({ ok: false, field: "grants" });
  });
});

describe("create account error copy", () => {
  const error = (code: string | undefined, httpStatus: number, uncertain = false) => createAccountError({ status: "error", code, httpStatus, uncertain });
  it("never shows backend text and never invites a replay of an uncertain write", () => {
    expect(error(undefined, 503, true)).toMatch(/Chưa biết tài khoản đã được tạo chưa/);
    expect(error("MSG-ACCOUNT-09", 409)).toMatch(/đã có người dùng/);
    expect(error("MSG06", 409)).toMatch(/đã có tài khoản/);
    expect(error(undefined, 403)).toMatch(/Chỉ chủ hợp tác xã/);
    expect(error("MSG-GEN-01", 400)).toMatch(/chưa hợp lệ/);
    expect(error(undefined, 418)).toMatch(/Chưa tạo được/);
  });
});

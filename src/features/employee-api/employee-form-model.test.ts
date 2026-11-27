import { describe, expect, it } from "vitest";
import { employeeDetailFixture, workingZoneId } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
import { formStateOf, NEW_ACCOUNT, parseEmployeeForm, type EmployeeFormState } from "./employee-form-model";

const record = () => employeeViewSchema.parse(employeeDetailFixture());
const zoneA = "1c7c1a0b-0000-4000-8000-000000000001";
const filled = (patch: Partial<EmployeeFormState> = {}): EmployeeFormState => ({ ...formStateOf(null), fullName: "Người mới", phone: "0912345678", employeeType: "Staff", workingZoneIds: [zoneA], ...patch });
const context = (extra = {}) => ({ baseline: null, activeZoneIds: new Set([zoneA]), accountOffered: true, ...extra });
const paths = (result: ReturnType<typeof parseEmployeeForm>) => result.ok ? [] : result.issues.map(issue => issue.path);
const zonesOf = (saved: ReturnType<typeof record>) => new Set(saved.workingZones.map(zone => zone.id));

describe("employee form model", () => {
  it("asks for a name, a phone number, a type and, for an internal employee, a zone", () => {
    expect(paths(parseEmployeeForm(formStateOf(null), context()))).toEqual(["fullName", "phone", "employeeType"]);
    expect(paths(parseEmployeeForm(filled({ workingZoneIds: [] }), context()))).toEqual(["workingZoneIds"]);
    expect(parseEmployeeForm(filled({ employeeType: "SeasonalWorker", workingZoneIds: [] }), context()).ok).toBe(true);
  });
  it("sends the picked province and ward codes with their names, and the chosen zones of a seasonal worker", () => {
    const address = { provinceCode: 92, provinceName: "Thành phố Cần Thơ", wardCode: 31117, wardName: "Phường Ninh Kiều", street: "1 Hòa Bình" };
    const parsed = parseEmployeeForm(filled({ employeeType: "SeasonalWorker", address }), context());
    expect(parsed).toMatchObject({ ok: true, body: { area: "Thành phố Cần Thơ", ward: "Phường Ninh Kiều", address: "1 Hòa Bình", provinceCode: 92, wardCode: 31117, workingZoneIds: [zoneA], jobTypeIds: [] } });
  });
  it("keeps the job types of the saved profile unchanged on update", () => {
    const saved = record();
    const parsed = parseEmployeeForm(formStateOf(saved), { baseline: saved, activeZoneIds: zonesOf(saved), accountOffered: false });
    expect(parsed).toMatchObject({ ok: true, body: { jobTypeIds: saved.jobTypes.map(job => job.id), rowVersion: saved.rowVersion } });
  });
  it("refuses a zone that is not running unless the profile already holds it", () => {
    const saved = record();
    const state = { ...formStateOf(saved), workingZoneIds: [workingZoneId] };
    expect(paths(parseEmployeeForm(state, { baseline: { ...saved, workingZones: [] }, activeZoneIds: new Set(), accountOffered: false }))).toEqual(["workingZoneIds"]);
    expect(parseEmployeeForm({ ...state, workingZoneIds: saved.workingZones.map(zone => zone.id) }, { baseline: saved, activeZoneIds: zonesOf(saved), accountOffered: false }).ok).toBe(true);
  });
  it("needs a date when the type changes on a saved profile", () => {
    const saved = record(), other = saved.employeeType === "Staff" ? "SeasonalWorker" : "Staff";
    const state = { ...formStateOf(saved), employeeType: other } as EmployeeFormState;
    expect(paths(parseEmployeeForm(state, { baseline: saved, activeZoneIds: zonesOf(saved), accountOffered: false }))).toEqual(["employeeTypeFrom"]);
  });
  it("checks the new login account: a username, and a zone for a Zone Manager", () => {
    expect(paths(parseEmployeeForm(filled({ accountChoice: NEW_ACCOUNT }), context()))).toEqual(["username"]);
    const grants = { zoneManager: true, allZones: false, zoneIds: [], accountant: false };
    expect(paths(parseEmployeeForm(filled({ accountChoice: NEW_ACCOUNT, username: "nguoi.moi", grants }), context()))).toEqual(["grants"]);
    expect(parseEmployeeForm(filled({ accountChoice: NEW_ACCOUNT, username: "nguoi.moi" }), context())).toMatchObject({ ok: true, newAccount: { username: "nguoi.moi" } });
  });
  it("links a chosen existing account and ignores the account choice when it is not offered", () => {
    const account = "3cb5c590-e3db-4056-8f7f-a03a6efbbd4b";
    expect(parseEmployeeForm(filled({ accountChoice: account }), context())).toMatchObject({ ok: true, linkAccountId: account });
    const hidden = parseEmployeeForm(filled({ accountChoice: account }), context({ accountOffered: false }));
    expect(hidden.ok && hidden.linkAccountId).toBeFalsy();
  });
  it("does not ask a profile that has left for a phone number", () => {
    const left = { ...record(), status: "Left" as const };
    expect(parseEmployeeForm({ ...formStateOf(left), phone: "" }, { baseline: left, activeZoneIds: new Set(), accountOffered: false }).ok).toBe(true);
  });
});

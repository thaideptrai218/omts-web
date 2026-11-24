import { describe, expect, it } from "vitest";
import { buildStaffingPayload, filterStaffingEmployees } from "./purchase-request-staffing-model";

const id = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const today = "2026-11-24";
const request = { requestedCages: 12, rowVersion: "AAAA", staffing: null };
const form = { cages: "10", pickupDate: "2026-11-26", selectedIds: [id(1), id(2)], chosenIds: [] as string[] };

describe("buildStaffingPayload", () => {
  it("builds the first plan: the pickup day is the work day and the capacity is the cages shared by the people", () => {
    expect(buildStaffingPayload(form, request, today)).toEqual({ ok: true, value: { cages: 10, workDate: "2026-11-26", pickupDate: "2026-11-26", cagesPerEmployeePerDay: 5, employeeIds: [id(1), id(2)], note: null, rowVersion: "AAAA" } });
  });
  it("refuses more cages than requested, a past pickup day, a bad number and nobody chosen", () => {
    for (const [patch, text] of [[{ cages: "13" }, /không được vượt quá 12/], [{ pickupDate: "2026-11-23" }, /không được trước hôm nay/], [{ cages: "0" }, /số nguyên lớn hơn 0/], [{ cages: "2,5" }, /số nguyên lớn hơn 0/], [{ selectedIds: [] }, /ít nhất một nhân viên/]] as const) {
      const built = buildStaffingPayload({ ...form, ...patch }, request, today);
      expect(built.ok).toBe(false);
      if (!built.ok) expect(built.error).toMatch(text);
    }
  });
  it("re-sends a sent plan unchanged with the chosen employees first and the new ones after", () => {
    const staffing = { cages: 8, workDate: "2026-11-25", pickupDate: "2026-11-26", requiredEmployees: 2, approvedEmployees: 1, hasEnoughStaff: false, cagesPerEmployeePerDay: 4, note: "ghi chú" };
    const built = buildStaffingPayload({ cages: "1", pickupDate: "2026-11-30", selectedIds: [id(3)], chosenIds: [id(1)] }, { ...request, staffing }, today);
    expect(built).toEqual({ ok: true, value: { cages: 8, workDate: "2026-11-25", pickupDate: "2026-11-26", cagesPerEmployeePerDay: 4, employeeIds: [id(1), id(3)], note: "ghi chú", rowVersion: "AAAA" } });
    const none = buildStaffingPayload({ cages: "1", pickupDate: "2026-11-30", selectedIds: [], chosenIds: [id(1)] }, { ...request, staffing }, today);
    expect(none.ok).toBe(false);
  });
});

describe("filterStaffingEmployees", () => {
  const rows = [{ id: id(1), name: "Nguyễn Văn Hải", available: true }, { id: id(2), name: "Trần Thị Lan", available: false, unavailableReason: "Đang nghỉ phép" }];
  it("matches by name ignoring case and diacritics, and keeps everything for an empty search", () => {
    expect(filterStaffingEmployees(rows, "hai").map((row) => row.id)).toEqual([id(1)]);
    expect(filterStaffingEmployees(rows, "  LAN ").map((row) => row.id)).toEqual([id(2)]);
    expect(filterStaffingEmployees(rows, "")).toHaveLength(2);
    expect(filterStaffingEmployees(rows, "zzz")).toEqual([]);
  });
});

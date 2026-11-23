import { describe, expect, it } from "vitest";
import { filterStaffRows, staffReadOnlyReason, staffState, staffStateLabel, staffStep } from "./workforce-staff-view";

const none = { checkedInAt: null, checkedOutAt: null, onLeave: false };
const working = { ...none, checkedInAt: "2026-11-20T01:00:00Z" };
const done = { ...working, checkedOutAt: "2026-11-20T10:00:00Z" };
const missing = { ...none, checkedOutAt: "2026-11-20T10:00:00Z" };

describe("staff attendance view rules", () => {
  it("uses the same four states and labels as the assignment tabs", () => {
    expect([none, working, done, missing].map(staffState)).toEqual(["planned", "working", "finished", "missing"]);
    expect([none, working, done, missing].map(staffStateLabel)).toEqual(["Chưa vào làm", "Đang làm", "Đã ra về", "Thiếu lượt vào"]);
    expect(staffStateLabel({ ...none, onLeave: true })).toBe("Nghỉ phép đã duyệt");
  });
  it("offers check-in, then check-out, then nothing; nothing while on leave", () => {
    expect([none, working, done, missing].map(staffStep)).toEqual(["check-in", "check-out", undefined, undefined]);
    expect(staffStep({ ...none, onLeave: true })).toBeUndefined();
  });
  it("filters by name, code and status", () => {
    const rows = [{ ...none, employeeName: "Nguyễn An", employeeCode: "NV01" }, { ...working, employeeName: "Trần Bình", employeeCode: null }];
    expect(filterStaffRows(rows, "nv01", "")).toHaveLength(1);
    expect(filterStaffRows(rows, "", "working").map(row => row.employeeName)).toEqual(["Trần Bình"]);
    expect(filterStaffRows(rows, "bình", "planned")).toHaveLength(0);
    expect(filterStaffRows(rows, "", "")).toHaveLength(2);
  });
  it("explains why recording is unavailable", () => {
    expect(staffReadOnlyReason("2026-11-20", "2026-11-20", true)).toBeUndefined();
    expect(staffReadOnlyReason("2026-11-19", "2026-11-20", true)).toMatch(/hôm nay/);
    expect(staffReadOnlyReason("2026-11-20", "2026-11-20", false)).toMatch(/chỉ được xem/);
  });
});

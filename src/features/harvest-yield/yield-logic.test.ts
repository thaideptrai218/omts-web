import { describe, expect, it } from "vitest";
import { harvestYieldReport, type YieldGroup } from "./contracts";
import { defaultFilters, percentOfTarget, filterProblem, linkedYieldFilters, monthRange, nextSort, pageSize, pageSlice, sortGroups, toQuery } from "./yield-logic";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const group = (n: number, label: string, over: Partial<YieldGroup> = {}): YieldGroup => ({
  key: id(n), label, zoneId: id(90), zoneCode: "VP01", zoneName: "Vùng 1", raftId: id(n), raftCode: label, cycleId: null, cycleStartDate: null, cycleCloseDate: null, cycleStatus: null,
  lotCount: 1, estimatedKg: 100, soldKg: 80, lostKg: 10, differenceKg: 10, notFinal: false, lots: [], ...over,
});

describe("kỳ và bộ lọc", () => {
  it("includes historical linked records while leaving an ordinary report in the current month", () => {
    expect(toQuery(linkedYieldFilters("2026-11-11", { recordId: id(1) }), 2)).toMatchObject({ from: "0001-01-01", to: "2026-11-11" });
    expect(linkedYieldFilters("2026-11-11", { cycleId: id(2), from: "2026-02-01", to: "2026-03-01" })).toMatchObject({ from: "2026-02-01", to: "2026-03-01" });
    expect(linkedYieldFilters("2026-11-11", {})).toEqual(defaultFilters("2026-11-11"));
  });
  it("monthRange: mùng 1 đến ngày cuối tháng, kể cả tháng 2 nhuận", () => {
    expect(monthRange("2026-10-28")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(monthRange("2028-02-10").to).toBe("2028-02-29");
  });
  it("filterProblem chặn thiếu ngày và khoảng ngược", () => {
    const f = defaultFilters("2026-10-28");
    expect(filterProblem(f)).toBeNull();
    expect(filterProblem({ ...f, from: "" })).toMatch(/đủ ngày/);
    expect(filterProblem({ ...f, from: "2026-11-01" })).toMatch(/trước hoặc bằng/);
  });
  it("toQuery: groupBy chữ thường; chọn hết hoặc không chọn vùng thì bỏ zoneIds", () => {
    const f = { ...defaultFilters("2026-10-28"), groupBy: "Cycle" as const };
    expect(toQuery(f, 3)).toMatchObject({ groupBy: "cycle", zoneIds: undefined });
    expect(toQuery({ ...f, zoneIds: [id(1), id(2)] }, 3).zoneIds).toBe(`${id(1)},${id(2)}`);
    expect(toQuery({ ...f, zoneIds: [id(1), id(2)] }, 2).zoneIds).toBeUndefined();
  });
});

describe("sắp xếp và phân trang", () => {
  const rows = [group(1, "B10", { soldKg: 5 }), group(2, "B2", { soldKg: 50 }), group(3, "B1", { soldKg: 20 })];
  it("nhãn sắp theo số tự nhiên tiếng Việt, không đổi mảng gốc", () => {
    expect(sortGroups(rows, { key: "label", dir: "asc" }).map((g) => g.label)).toEqual(["B1", "B2", "B10"]);
    expect(rows[0].label).toBe("B10");
  });
  it("cột số sắp tăng/giảm", () => {
    expect(sortGroups(rows, { key: "soldKg", dir: "desc" }).map((g) => g.soldKg)).toEqual([50, 20, 5]);
  });
  it("nextSort đảo chiều cột đang chọn, cột mới số mặc định giảm", () => {
    expect(nextSort({ key: "label", dir: "asc" }, "label").dir).toBe("desc");
    expect(nextSort({ key: "label", dir: "asc" }, "soldKg")).toEqual({ key: "soldKg", dir: "desc" });
  });
  it("pageSlice cắt đúng trang", () => {
    const many = Array.from({ length: pageSize + 3 }, (_, n) => n);
    expect(pageSlice(many, 1)).toHaveLength(pageSize);
    expect(pageSlice(many, 2)).toEqual([pageSize, pageSize + 1, pageSize + 2]);
  });
  it("percentOfTarget chỉ tính khi có kg mục tiêu", () => {
    expect(percentOfTarget(250, 1000)).toBe(25);
    expect(percentOfTarget(1200, 1000)).toBe(120);
    expect(percentOfTarget(100, null)).toBeUndefined();
    expect(percentOfTarget(100, 0)).toBeUndefined();
  });
});

describe("hợp đồng phản hồi", () => {
  const report = { from: "2026-10-01", to: "2026-10-31", groupBy: "Raft", groups: [], totals: { lotCount: 0, estimatedKg: 0, soldKg: 0, lostKg: 0, differenceKg: 0, notFinal: false },
    notFinalNotice: null, notFinalNoticeCode: null, message: "Không có lô", messageCode: "MSG-GEN-10" };
  it("nhận báo cáo rỗng và từ chối nhóm lạ", () => {
    expect(harvestYieldReport.safeParse(report).success).toBe(true);
    expect(harvestYieldReport.safeParse({ ...report, groupBy: "Lane" }).success).toBe(false);
    expect(harvestYieldReport.safeParse({ ...report, from: "01/10/2026" }).success).toBe(false);
  });
});

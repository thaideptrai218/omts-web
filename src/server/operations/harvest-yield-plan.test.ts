import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { harvestYieldPlan } from "./harvest-yield-plan";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const q = (s = "") => new URLSearchParams(s);

describe("kế hoạch BFF cho sản lượng nuôi", () => {
  it("đọc báo cáo: View, chuyển tham số sang đường dẫn backend", () => {
    const plan = harvestYieldPlan("GET", q(`action=list&from=2026-10-01&to=2026-10-28&groupBy=zone&zoneIds=${id(1)},${id(2)}`));
    expect(plan).toMatchObject({ area: "harvest-yield", method: "GET", permission: "View" });
    const url = new URL(plan!.path, "http://x");
    expect(url.pathname).toBe("/api/harvest-yield");
    expect(url.searchParams.getAll("zoneIds")).toEqual([id(1), id(2)]);
    expect(url.searchParams.get("groupBy")).toBe("zone");
    expect(plan!.file).toBeUndefined();
  });
  it("không có bộ lọc: gọi backend không tham số (mặc định tháng hiện tại)", () => {
    expect(harvestYieldPlan("GET", q("action=list"))?.path).toBe("/api/harvest-yield");
  });
  it("xuất Excel: quyền Export, file export, đường dẫn /export", () => {
    const plan = harvestYieldPlan("GET", q("action=export&groupBy=cycle"));
    expect(plan).toMatchObject({ permission: "Export", file: "export", path: "/api/harvest-yield/export?groupBy=cycle" });
  });
  it("chặn tham số lạ, ngày sai, khoảng ngược, GUID sai, nhóm lạ, lặp khóa", () => {
    for (const bad of ["action=list&page=1", "action=list&from=2026-13-01", "action=list&from=2026-10-29&to=2026-10-28", "action=list&zoneIds=abc",
      `action=list&zoneIds=${id(1)},`, "action=list&groupBy=lane", "action=delete", "", `action=list&from=2026-10-01&from=2026-10-02`]) {
      expect(harvestYieldPlan("GET", q(bad)), bad).toBeUndefined();
    }
  });
  it("khử trùng zoneIds và giới hạn 50 vùng", () => {
    expect(new URL(harvestYieldPlan("GET", q(`action=list&zoneIds=${id(1)},${id(1)}`))!.path, "http://x").searchParams.getAll("zoneIds")).toEqual([id(1)]);
    const many = Array.from({ length: 51 }, (_, n) => id(n + 1)).join(",");
    expect(harvestYieldPlan("GET", q(`action=list&zoneIds=${many}`))).toBeUndefined();
  });
  it("không có thao tác ghi", () => {
    expect(harvestYieldPlan("POST", q(), { action: "list" })).toBeUndefined();
    expect(harvestYieldPlan("GET", q("action=list"), {})).toBeUndefined();
  });
});

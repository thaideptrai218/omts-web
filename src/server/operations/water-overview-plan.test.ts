import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { waterOverviewPlan } from "./water-overview-plan";

const q = (s: string) => new URLSearchParams(s);

describe("kế hoạch BFF tổng quan chất lượng nước theo vùng", () => {
  it("đọc danh sách vùng với quyền View", () => {
    expect(waterOverviewPlan("GET", q("action=zones-overview"))).toMatchObject({ area: "water", action: "zones-overview", method: "GET", permission: "View", path: "/api/water-measurements/zones" });
  });
  it("chuyển tiếp inUseOnly hợp lệ", () => {
    expect(waterOverviewPlan("GET", q("action=zones-overview&inUseOnly=true"))?.path).toBe("/api/water-measurements/zones?inUseOnly=true");
    expect(waterOverviewPlan("GET", q("action=zones-overview&inUseOnly=false"))?.path).toBe("/api/water-measurements/zones?inUseOnly=false");
  });
  it("từ chối phương thức, hành động, tham số lạ hoặc lặp", () => {
    expect(waterOverviewPlan("POST", q("action=zones-overview"))).toBeUndefined();
    expect(waterOverviewPlan("GET", q("action=list"))).toBeUndefined();
    expect(waterOverviewPlan("GET", q("action=zones-overview&inUseOnly=1"))).toBeUndefined();
    expect(waterOverviewPlan("GET", q("action=zones-overview&zoneId=x"))).toBeUndefined();
    expect(waterOverviewPlan("GET", q("action=zones-overview&inUseOnly=true&inUseOnly=false"))).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { customRange } from "@/components/ui/management-screen/time-range-limits";
import { defaultFilters, filterProblem, readFilters, timeWindow, toQuery, toggleId, writeFilters } from "./end-of-day-filters-model";

const TODAY = "2026-11-19";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("điều kiện báo cáo Cuối ngày", () => {
  it("mặc định: bán hàng hôm nay, cả ngày, dạng bảng, in dọc", () => {
    const filters = defaultFilters(TODAY);
    expect(filters).toMatchObject({ concern: "sales", layout: "table", orientation: "portrait", timeMode: "day", day: TODAY });
    expect(timeWindow(filters)).toEqual({ from: "2026-11-19T00:00", to: "2026-11-19T23:59" });
    expect(toQuery(filters)).toEqual({ concern: "sales", from: "2026-11-19T00:00", to: "2026-11-19T23:59" });
  });
  it("một ngày có giờ Từ/Đến; khoảng ngày lấy trọn ngày hai đầu", () => {
    expect(timeWindow({ ...defaultFilters(TODAY), startTime: "08:30", endTime: "17:00" })).toEqual({ from: "2026-11-19T08:30", to: "2026-11-19T17:00" });
    expect(timeWindow({ ...defaultFilters(TODAY), timeMode: "range", range: customRange("2026-11-01", "2026-11-15") })).toEqual({ from: "2026-11-01T00:00", to: "2026-11-15T23:59" });
  });
  it("query chỉ mang tiêu chí thuộc mối quan tâm đang xem, danh sách nối bằng dấu phẩy", () => {
    const base = { ...defaultFilters(TODAY), zoneIds: [id(1), id(2)], customerIds: [id(3)], paymentMethods: ["Cash", "EWallet"], funds: ["Bank"], productIds: [id(4)], createdBy: [id(5)] };
    expect(toQuery({ ...base, concern: "sales" })).toMatchObject({ zoneIds: `${id(1)},${id(2)}`, customerIds: id(3), paymentMethods: "Cash,EWallet", createdBy: id(5) });
    expect(toQuery({ ...base, concern: "sales" })).not.toHaveProperty("funds");
    const money = toQuery({ ...base, concern: "money" });
    expect(money).toMatchObject({ funds: "Bank", createdBy: id(5) });
    expect(money).not.toHaveProperty("zoneIds");
    expect(money).not.toHaveProperty("customerIds");
    expect(toQuery({ ...base, concern: "goods" })).toMatchObject({ productIds: id(4), customerIds: id(3) });
    expect(Object.keys(toQuery({ ...base, concern: "summary" })).sort()).toEqual(["concern", "createdBy", "from", "to", "zoneIds"]);
  });
  it("URL: ghi rồi đọc lại cho cùng điều kiện, chỉ ghi giá trị khác mặc định", () => {
    const filters = { ...defaultFilters(TODAY), concern: "goods" as const, layout: "paper" as const, orientation: "landscape" as const, startTime: "08:00", endTime: "12:30", productIds: [id(1), id(2)], customerIds: [id(3)] };
    const params = writeFilters(filters, TODAY);
    expect(Object.fromEntries(params)).toEqual({ concern: "goods", view: "paper", orient: "landscape", ft: "08:00", tt: "12:30", products: `${id(1)},${id(2)}`, customers: id(3) });
    expect(readFilters(params, TODAY)).toMatchObject({ concern: "goods", layout: "paper", orientation: "landscape", startTime: "08:00", endTime: "12:30", productIds: [id(1), id(2)], customerIds: [id(3)] });
    expect(writeFilters(defaultFilters(TODAY), TODAY).toString()).toBe("");
  });
  it("URL: khoảng ngày được giữ và giá trị lạ bị bỏ", () => {
    const range = readFilters(new URLSearchParams("mode=range&from=2026-11-01&to=2026-11-10"), TODAY);
    expect(range).toMatchObject({ timeMode: "range", range: { from: "2026-11-01", to: "2026-11-10" } });
    const bad = readFilters(new URLSearchParams(`concern=x&view=y&orient=z&mode=w&day=2026-13-40&ft=25:00&zones=abc,${id(1)}&pay=Credit,Cash&funds=Gold&from=2026-11-10&to=2026-11-01`), TODAY);
    expect(bad).toMatchObject({ concern: "sales", layout: "table", orientation: "portrait", timeMode: "day", day: TODAY, startTime: "", zoneIds: [id(1)], paymentMethods: ["Cash"], funds: [] });
    expect(bad.range).toEqual(defaultFilters(TODAY).range);
  });
  it("kiểm tra điều kiện: ngày tương lai, giờ ngược, thiếu hoặc ngược khoảng ngày, quá 366 ngày", () => {
    const day = defaultFilters(TODAY), range = (from: string, to: string) => ({ ...day, timeMode: "range" as const, range: customRange(from, to) });
    expect(filterProblem(day, TODAY)).toBeNull();
    expect(filterProblem({ ...day, day: "2026-11-20" }, TODAY)).toMatch(/tương lai/);
    expect(filterProblem({ ...day, day: "" }, TODAY)).toMatch(/chọn ngày/);
    expect(filterProblem({ ...day, startTime: "18:00", endTime: "08:00" }, TODAY)).toMatch(/Giờ bắt đầu/);
    expect(filterProblem(range("2026-11-01", "2026-11-19"), TODAY)).toBeNull();
    expect(filterProblem(range("2026-11-19", "2026-11-01"), TODAY)).toMatch(/Ngày bắt đầu/);
    expect(filterProblem(range("", ""), TODAY)).toMatch(/khoảng ngày/);
    expect(filterProblem(range("2026-11-01", "2026-11-25"), TODAY)).toMatch(/tương lai/);
    expect(filterProblem(range("2025-11-18", "2026-11-19"), TODAY)).toMatch(/366/);
    expect(filterProblem(range("2025-11-19", "2026-11-19"), TODAY)).toBeNull();
  });
  it("toggleId thêm/bớt và giới hạn 50 phần tử", () => {
    expect(toggleId(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleId(["a", "b"], "a")).toEqual(["b"]);
    expect(toggleId(Array.from({ length: 50 }, (_, n) => String(n)), "x")).toHaveLength(50);
  });
});

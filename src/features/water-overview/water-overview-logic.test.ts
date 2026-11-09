import { describe, expect, it } from "vitest";
import { zoneOverviewSchema, type ZoneOverviewItem } from "./contracts";
import { absoluteTimeText, describeValueOutside, isMeasurementStale, relativeTimeText, summarize } from "./water-overview-logic";

const now = Date.parse("2026-11-09T10:00:00+07:00");
const ago = (ms: number) => new Date(now - ms).toISOString();
const MIN = 60_000, HOUR = 60 * MIN;
const zone = (over: Partial<ZoneOverviewItem> = {}): ZoneOverviewItem => ({ zoneId: "00000000-0000-4000-8000-000000000001", zoneCode: "Z01", zoneName: "Vùng 1",
  zoneStatus: "Đang sử dụng", zoneStatusCode: "IN_USE", latestMeasuredAt: ago(HOUR), hasWaterAlert: false, valuesOutside: [], ...over });

describe("thời gian tương đối", () => {
  it("chuyển phút, giờ, ngày sang tiếng Việt", () => {
    expect(relativeTimeText(ago(10_000), now)).toBe("Vừa xong");
    expect(relativeTimeText(ago(5 * MIN), now)).toBe("5 phút trước");
    expect(relativeTimeText(ago(3 * HOUR), now)).toBe("3 giờ trước");
    expect(relativeTimeText(ago(50 * HOUR), now)).toBe("2 ngày trước");
    expect(relativeTimeText(null, now)).toBe("Chưa có lần đo");
    expect(relativeTimeText(new Date(now + HOUR).toISOString(), now)).toBe("Vừa xong");
  });
  it("hiển thị giờ tuyệt đối theo múi giờ Việt Nam", () => {
    expect(absoluteTimeText("2026-11-09T03:30:00Z")).toContain("10:30");
    expect(absoluteTimeText(null)).toBe("—");
  });
});

describe("chưa đo gần đây", () => {
  it("không có lần đo hoặc quá 24 giờ là chưa đo gần đây", () => {
    expect(isMeasurementStale(null, now)).toBe(true);
    expect(isMeasurementStale(ago(25 * HOUR), now)).toBe(true);
    expect(isMeasurementStale(ago(23 * HOUR), now)).toBe(false);
  });
  it("tóm tắt số vùng, vùng cảnh báo, vùng chưa đo", () => {
    const items = [zone(), zone({ hasWaterAlert: true }), zone({ latestMeasuredAt: null }), zone({ latestMeasuredAt: ago(30 * HOUR) })];
    expect(summarize(items, now)).toEqual({ total: 4, alerting: 1, stale: 2 });
    expect(summarize([], now)).toEqual({ total: 0, alerting: 0, stale: 0 });
  });
});

describe("mô tả giá trị vượt ngưỡng", () => {
  it("nêu chỉ số, hướng lệch và khoảng cho phép", () => {
    expect(describeValueOutside({ indicator: "SALINITY", value: 12, unit: "‰", direction: "Low", min: 15, max: 30 })).toBe("Độ mặn 12 ‰ quá thấp (cho phép 15–30 ‰)");
    expect(describeValueOutside({ indicator: "PH", value: 9, unit: null, direction: "High", min: null, max: 8.5 })).toBe("pH 9 quá cao (cho phép tối đa 8,5)");
    expect(describeValueOutside({ indicator: "TEMPERATURE", value: 20, unit: "°C", direction: "Low", min: 25, max: null })).toBe("Nhiệt độ 20 °C quá thấp (cho phép tối thiểu 25 °C)");
  });
});

describe("hợp đồng dữ liệu", () => {
  it("nhận phản hồi backend và từ chối dữ liệu sai kiểu", () => {
    expect(zoneOverviewSchema.safeParse([zone()]).success).toBe(true);
    expect(zoneOverviewSchema.safeParse([zone({ latestMeasuredAt: null })]).success).toBe(true);
    expect(zoneOverviewSchema.safeParse([{ ...zone(), hasWaterAlert: "yes" }]).success).toBe(false);
    expect(zoneOverviewSchema.safeParse({}).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { zoneOverviewSchema, type ZoneOverviewItem } from "./contracts";
import { absoluteTimeText, dashboardZones, isMeasurementStale, relativeTimeText, summarize, summaryLine } from "./water-overview-logic";

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
    expect(absoluteTimeText("2026-11-09T03:30:00Z")).toBe("09/11/2026 10:30");
    expect(absoluteTimeText(null)).toBe("—");
  });
});

describe("chưa đo gần đây", () => {
  it("không có lần đo hoặc quá 24 giờ là chưa đo gần đây", () => {
    expect(isMeasurementStale(null, now)).toBe(true);
    expect(isMeasurementStale(ago(32 * DAY_MS), now)).toBe(true);
    expect(isMeasurementStale(ago(25 * HOUR), now)).toBe(false);
    expect(isMeasurementStale(ago(20 * DAY_MS), now)).toBe(false);
  });
  it("tóm tắt số vùng, vùng cảnh báo, vùng chưa đo", () => {
    const items = [zone(), zone({ hasWaterAlert: true }), zone({ latestMeasuredAt: null }), zone({ latestMeasuredAt: ago(40 * DAY_MS) })];
    expect(summarize(items, now)).toEqual({ total: 4, alerting: 1, stale: 2 });
    expect(summarize([], now)).toEqual({ total: 0, alerting: 0, stale: 0 });
  });
});

describe("tổng quan trên trang Tổng quan", () => {
  it("chỉ giữ vùng đang sử dụng, vùng cảnh báo đứng trước rồi theo mã vùng", () => {
    const items = [zone({ zoneId: "a", zoneCode: "Z10" }), zone({ zoneId: "b", zoneCode: "Z02", zoneStatus: "Discontinued", zoneStatusCode: "ZONE_DISCONTINUED", hasWaterAlert: true }),
      zone({ zoneId: "c", zoneCode: "Z02" }), zone({ zoneId: "d", zoneCode: "Z30", hasWaterAlert: true })];
    expect(dashboardZones(items).map(item => item.zoneId)).toEqual(["d", "c", "a"]);
  });
  it("viết một dòng tóm tắt", () => {
    expect(summaryLine({ alerting: 1, stale: 6 })).toBe("1 vùng đang cảnh báo · 6 vùng chưa đo gần đây");
    expect(summaryLine({ alerting: 0, stale: 2 })).toBe("2 vùng chưa đo gần đây");
    expect(summaryLine({ alerting: 0, stale: 0 })).toBe("Không có vùng nào cảnh báo hoặc chưa đo gần đây");
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

import { zoneStatusLabel } from "./water-overview-logic";
const DAY_MS = 86_400_000;
describe("nhãn trạng thái vùng bằng tiếng Việt", () => {
  it("không để chữ tiếng Anh của backend lọt ra giao diện", () => {
    expect(zoneStatusLabel({ zoneStatus: "In Use", zoneStatusCode: "ZONE_IN_USE" })).toBe("Đang sử dụng");
    expect(zoneStatusLabel({ zoneStatus: "Discontinued", zoneStatusCode: "ZONE_DISCONTINUED" })).toBe("Ngừng sử dụng");
    expect(zoneStatusLabel({ zoneStatus: "???", zoneStatusCode: "X" })).toBe("Chưa rõ trạng thái");
  });
});

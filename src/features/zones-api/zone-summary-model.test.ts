import { describe, expect, it } from "vitest";
import { daysUntil, expiryText, indicatorLabel, rangeText } from "./zone-summary-model";

describe("zone summary figures", () => {
  it("counts days to licence expiry across month ends", () => {
    expect(daysUntil("2026-11-30", "2026-11-11")).toBe(19);
    expect(expiryText("2026-11-30", "2026-11-11")).toBe("Còn 19 ngày");
    expect(expiryText("2026-11-11", "2026-11-11")).toBe("Hết hạn hôm nay");
    expect(expiryText("2026-11-01", "2026-11-11")).toBe("Quá hạn 10 ngày");
    expect(expiryText(null, "2026-11-11")).toBe("Không thời hạn");
  });
  it("labels indicators and threshold ranges", () => {
    expect(indicatorLabel("Salinity")).toBe("độ mặn");
    expect(indicatorLabel("oxygen")).toBe("oxygen");
    expect(rangeText(7.5, 8.5)).toBe("7.5 – 8.5");
    expect(rangeText(null, null)).toBe("Chưa đặt");
  });
});

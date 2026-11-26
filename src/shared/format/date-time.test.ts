import { expect, it } from "vitest";
import { formatVietnameseDateTime } from "./date-time";

it("shows date first, 4-digit year and 24h time in Vietnam time", () => {
  expect(formatVietnameseDateTime("2026-11-10T06:40:00+07:00")).toBe("10/11/2026 06:40");
  expect(formatVietnameseDateTime("2026-11-10T23:05:00Z")).toBe("11/11/2026 06:05");
});
it("shows a dash for an unreadable value", () => {
  expect(formatVietnameseDateTime("not a date")).toBe("—");
});

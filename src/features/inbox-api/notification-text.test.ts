import { expect, it } from "vitest";
import { notificationText } from "./notification-text";
const fallback = { title: "Historical", body: "Original text" };
it("formats an atomic water alert in Vietnamese and Vietnam time", () => {
  const result = notificationText("MSG-WATER-03", { corrected: true, zone_name: "Vùng A", raft_code: null, measurement_time: "2026-10-20T23:30:00Z",
    values_outside: [{ indicator: "SALINITY", value: 12, unit: "‰", direction: "Low", min: 15, max: 30 }] }, fallback);
  expect(result?.title).toContain("đã hiệu chỉnh"); expect(result?.body).toContain("21/10");
  expect(result?.body).toContain("Độ mặn 12 ‰ thấp"); expect(result?.body).toContain("15–30 ‰"); expect(result?.body).not.toContain("Original");
});
it("formats overdue and expiring/expired licence messages from atomic parameters", () => {
  expect(notificationText("MSG-WATER-06", { zone_name: "A", last_date: "2026-10-01" }, fallback)?.body).toContain("01/10/2026");
  const p = { document_type: "AQUACULTURE_LICENSE", document_number: "GP01", zone_codes: ["KV1", "KV2"], expiry_date: "2026-11-01", days: 0 };
  expect(notificationText("MSG-FARM-01", p, fallback)?.body).toContain("còn 0 ngày");
  expect(notificationText("MSG-FARM-02", p, fallback)?.body).toContain("đã hết hạn");
});
it("rejects malformed structured values instead of rendering a server phrase", () => {
  expect(notificationText("MSG-WATER-03", { values_outside: "arbitrary English phrase" }, fallback)).toBeUndefined();
  expect(notificationText("MSG-FARM-01", { expiry_date: "yesterday", days: -1 }, fallback)).toBeUndefined();
});
it("preserves historical content and gives later unknown codes a neutral translation", () => {
  expect(notificationText(null, null, fallback)).toEqual(fallback);
  expect(notificationText("FUTURE", {}, fallback)).toEqual({ title: "Thông báo mới", body: "Bạn có thông báo mới từ hợp tác xã." });
});

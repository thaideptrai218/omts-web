import { describe, expect, it } from "vitest";
import { allowedSet, changeErrorText, dateText, deliveryStatus, invoiceStatus, paidState, paymentMethod, paymentStatus } from "./invoice-labels";
import { defaultFilters, filterProblem, isDefault, presetRange, toQuery } from "./invoice-list-logic";

describe("khoảng ngày của lựa chọn nhanh", () => {
  it("hôm nay, tháng này, tuần này bắt đầu từ thứ Hai", () => {
    expect(presetRange("today", "2026-11-09", { from: "", to: "" })).toEqual({ from: "2026-11-09", to: "2026-11-09" });
    expect(presetRange("month", "2026-11-18", { from: "", to: "" })).toEqual({ from: "2026-11-01", to: "2026-11-18" });
    // 2026-11-09 là thứ Hai; 2026-11-15 là Chủ nhật: tuần vẫn bắt đầu 09/11.
    expect(presetRange("week", "2026-11-09", { from: "", to: "" }).from).toBe("2026-11-09");
    expect(presetRange("week", "2026-11-15", { from: "", to: "" }).from).toBe("2026-11-09");
    expect(presetRange("week", "2026-11-01", { from: "", to: "" }).from).toBe("2026-10-26");
  });
  it("tùy chỉnh dùng ngày đã nhập", () => {
    expect(presetRange("custom", "2026-11-09", { from: "2026-10-01", to: "2026-10-28" })).toEqual({ from: "2026-10-01", to: "2026-10-28" });
  });
});

describe("kiểm tra bộ lọc", () => {
  const custom = (from: string, to: string) => ({ ...defaultFilters(), preset: "custom" as const, from, to });
  it("tùy chỉnh phải đủ ngày, đúng thứ tự, tối đa 5 năm", () => {
    expect(filterProblem(custom("", "2026-11-09"))).toMatch(/đủ ngày/);
    expect(filterProblem(custom("2026-11-09", "2026-11-01"))).toMatch(/không được sau/);
    expect(filterProblem(custom("2020-01-01", "2025-01-02"))).toMatch(/5 năm/);
    expect(filterProblem(custom("2020-01-01", "2025-01-01"))).toBeNull();
    expect(filterProblem(custom("2024-02-29", "2026-11-09"))).toBeNull();
    expect(filterProblem(defaultFilters())).toBeNull();
  });
});

describe("tham số truy vấn", () => {
  it("mặc định chỉ có kỳ hôm nay", () => {
    expect(toQuery(defaultFilters(), "2026-11-09")).toEqual({ from: "2026-11-09", to: "2026-11-09", zoneId: undefined, customerId: undefined, harvestLotId: undefined, statusId: undefined, paid: undefined, code: undefined, cashCollectedByMe: undefined });
    expect(isDefault(defaultFilters())).toBe(true);
  });
  it("một trạng thái được chọn thì lọc theo mã trạng thái; tiền mặt và mã được cắt khoảng trắng", () => {
    const q = toQuery({ ...defaultFilters(), cancelled: false, code: " HD01 ", cashMine: true, paid: "false", zoneId: "z" }, "2026-11-09");
    expect(q).toMatchObject({ statusId: "3501", code: "HD01", cashCollectedByMe: "true", paid: "false", zoneId: "z" });
    expect(toQuery({ ...defaultFilters(), completed: false }, "2026-11-09").statusId).toBe("3502");
    expect(toQuery({ ...defaultFilters(), completed: false, cancelled: false }, "2026-11-09").statusId).toBeUndefined();
  });
});

describe("nhãn tiếng Việt", () => {
  it("không để lộ chuỗi tiếng Anh của backend", () => {
    expect([invoiceStatus(3501), invoiceStatus(3502), deliveryStatus(1603), paymentStatus(3601), paymentMethod("VietQrInvoice"), paidState(false), paidState(null)])
      .toEqual(["Hoàn thành", "Đã hủy", "Chưa gửi", "Chờ xác nhận", "VietQR", "Còn nợ", "—"]);
    expect(invoiceStatus(9999)).toBe("Chưa rõ");
    expect(paymentMethod("Crypto")).toBe("Chưa rõ");
  });
  it("lệnh cho phép: giữ lệnh biết, bỏ lệnh lạ", () => {
    expect([...allowedSet(["Resend", "Print", "Teleport", "Cancel"])].sort()).toEqual(["Cancel", "Print", "Resend"]);
  });
  it("ngày và thông báo lỗi sửa/hủy", () => {
    expect(dateText("2026-11-09")).toBe("09/11/2026");
    expect(changeErrorText(409, "MSG06")).toMatch(/tải lại/);
    expect(changeErrorText(409, undefined)).toMatch(/phiếu trả hàng/);
    expect(changeErrorText(403, undefined)).toMatch(/Chủ hợp tác xã/);
    expect(changeErrorText(500, undefined)).toBeUndefined();
  });
});

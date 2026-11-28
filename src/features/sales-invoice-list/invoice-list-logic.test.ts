import { describe, expect, it } from "vitest";
import { allTime, presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { allowedSet, changeErrorText, dateText, deliveryStatus, invoiceStatus, paidState, paymentMethod, paymentStatus } from "./invoice-labels";
import { emptyFilters, periodRange, timeProblem, toQuery } from "./invoice-list-logic";

describe("khoảng ngày của bộ lọc thời gian", () => {
  it("mốc nhanh tính lại từ ngày hôm nay theo giờ Việt Nam, tuần bắt đầu từ thứ Hai", () => {
    expect(periodRange(presetValue("today"), "2026-11-09")).toEqual({ from: "2026-11-09", to: "2026-11-09" });
    expect(periodRange(presetValue("thisMonth"), "2026-11-18")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    // 2026-11-09 là thứ Hai; 2026-11-15 là Chủ nhật: tuần vẫn bắt đầu 09/11.
    expect(periodRange(presetValue("thisWeek"), "2026-11-09").from).toBe("2026-11-09");
    expect(periodRange(presetValue("thisWeek"), "2026-11-15").from).toBe("2026-11-09");
    expect(periodRange(presetValue("thisWeek"), "2026-11-01").from).toBe("2026-10-26");
  });
  it("tùy chỉnh dùng ngày đã chọn", () => {
    expect(periodRange({ kind: "custom", from: "2026-10-01", to: "2026-10-28" }, "2026-11-09")).toEqual({ from: "2026-10-01", to: "2026-10-28" });
  });
});

describe("kiểm tra kỳ xem", () => {
  const custom = (from: string, to: string): TimeRangeValue => ({ kind: "custom", from, to });
  it("tùy chỉnh phải đủ ngày, đúng thứ tự, tối đa 5 năm", () => {
    expect(timeProblem(custom("", "2026-11-09"))).toMatch(/đủ ngày/);
    expect(timeProblem(custom("2026-11-09", "2026-11-01"))).toMatch(/không được sau/);
    expect(timeProblem(custom("2020-01-01", "2025-01-02"))).toMatch(/5 năm/);
    expect(timeProblem(custom("2020-01-01", "2025-01-01"))).toBeNull();
    expect(timeProblem(custom("2024-02-29", "2026-11-09"))).toBeNull();
  });
  it("mốc nhanh và Toàn thời gian luôn xem được", () => {
    expect(timeProblem(presetValue("thisMonth", new Date(2026, 10, 18)))).toBeNull();
    expect(timeProblem(allTime)).toBeNull();
  });
});

describe("tham số truy vấn", () => {
  const month = presetValue("thisMonth", new Date(2026, 10, 18));
  it("mặc định chỉ có kỳ xem", () => {
    expect(toQuery({ search: "", time: month, filters: emptyFilters }, "2026-11-18")).toEqual({ from: "2026-11-01", to: "2026-11-30", zoneIds: undefined, customerId: undefined, harvestLotId: undefined, statusId: undefined, paid: undefined, code: undefined, cashCollectedByMe: undefined });
  });
  it("Toàn thời gian lấy 5 năm gần nhất, 29/02 lùi về 28/02", () => {
    expect(toQuery({ search: "", time: allTime, filters: emptyFilters }, "2026-11-18")).toMatchObject({ from: "2021-11-18", to: "2026-11-18" });
    expect(toQuery({ search: "", time: allTime, filters: emptyFilters }, "2028-02-29").from).toBe("2023-02-28");
  });
  it("bộ lọc đi vào tham số; mã tìm được cắt khoảng trắng", () => {
    const q = toQuery({ search: " HD01 ", time: month, zoneIds: "z1,z2", filters: { customer: { id: "c", title: "An" }, lot: { id: "l", title: "B03" }, status: "3501", paid: "false", cashMine: true } }, "2026-11-18");
    expect(q).toMatchObject({ statusId: "3501", code: "HD01", cashCollectedByMe: "true", paid: "false", zoneIds: "z1,z2", customerId: "c", harvestLotId: "l" });
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

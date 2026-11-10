import { describe, expect, it } from "vitest";
import { crc16Ccitt, isVietQrPayloadConsistent, readEmvFields } from "./vietqr-payload-check";
import { changePendingPayment, createResult, isPendingSale, pendingCode, pendingSale, stopPending, usableVietQr } from "./vietqr-contracts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
// Chuỗi thật từ test của backend: số tiền 1 đồng, nội dung HD000001; và số tiền 12.000.000 với nội dung "Hau Van Don".
const SMALL = "00020101021238560010A000000727012600069704360112TESTQA0000010208QRIBFTTA5303704540115802VN62120808HD0000016304AFAB";
const BIG = "00020101021238560010A000000727012600069704360112TESTQA0000010208QRIBFTTA53037045408120000005802VN62150811Hau Van Don63044C31";
const wire = (over: Record<string, unknown> = {}) => ({
  code: "HD000001", status: "Awaiting", zone: { id: id(1), code: "VP01", name: "Vùng 1" }, customer: null, walkInCustomer: true, total: 1, cashAmount: 0, toPayAmount: 1, receivedAmount: 0,
  vietQr: { payload: SMALL, bankBin: "970436", bankName: "Vietcombank", accountNumber: "TESTQA000001", accountHolderName: "HTX", amount: 1, content: "HD000001" },
  createdAt: "2026-11-09T03:00:00+07:00", createdBy: { id: id(3), name: "A" }, invoiceId: null, invoice: null, endedAt: null, ...over,
});

describe("kiểm tra chuỗi VietQR", () => {
  it("CRC-16/CCITT-FALSE khớp backend", () => {
    expect(crc16Ccitt("123456789")).toBe(0x29b1); // vector chuẩn của thuật toán
    expect(crc16Ccitt(SMALL.slice(0, -4)).toString(16).toUpperCase()).toBe("AFAB");
  });
  it("chấp nhận chuỗi đúng số tiền và nội dung", () => {
    expect(isVietQrPayloadConsistent(SMALL, 1, "HD000001")).toBe(true);
    expect(isVietQrPayloadConsistent(BIG, 12_000_000, "Hau Van Don")).toBe(true);
  });
  it("từ chối sai số tiền, sai nội dung, CRC hỏng, ký tự lạ hoặc cấu trúc cụt", () => {
    expect(isVietQrPayloadConsistent(SMALL, 2, "HD000001")).toBe(false);
    expect(isVietQrPayloadConsistent(SMALL, 1, "HD000002")).toBe(false);
    expect(isVietQrPayloadConsistent(SMALL.replace("AFAB", "AFAC"), 1, "HD000001")).toBe(false);
    expect(isVietQrPayloadConsistent(SMALL.replace("TESTQA", "TÉSTQA"), 1, "HD000001")).toBe(false);
    expect(isVietQrPayloadConsistent(SMALL.slice(0, 30), 1, "HD000001")).toBe(false);
    expect(isVietQrPayloadConsistent("", 1, "")).toBe(false);
    expect(readEmvFields("5403")).toBeUndefined();
    expect(readEmvFields("5401154012")).toBeUndefined(); // trùng mã 54
  });
});

describe("hợp đồng giao dịch chờ VietQR", () => {
  it("đọc đúng dạng backend gửi và bỏ trường thừa", () => {
    const sale = pendingSale.parse(wire());
    expect(sale).toMatchObject({ code: "HD000001", status: "Awaiting", toPayAmount: 1 });
    expect(sale).not.toHaveProperty("createdBy");
  });
  it("từ chối mã lạ, trạng thái lạ, số tiền lẻ và số tiền VietQR lệch số cần trả", () => {
    expect(pendingSale.safeParse(wire({ code: "../x" })).success).toBe(false);
    expect(pendingSale.safeParse(wire({ status: "Paid" })).success).toBe(false);
    expect(pendingSale.safeParse(wire({ toPayAmount: 1.5 })).success).toBe(false);
    expect(pendingSale.safeParse(wire({ toPayAmount: 2 })).success).toBe(false);
    expect(pendingCode.safeParse("HD000124").success).toBe(true);
    expect(pendingCode.safeParse("HD12").success).toBe(false);
  });
  it("kết quả tạo: giao dịch chờ (202) khác hóa đơn đã lưu (201)", () => {
    const parsed = createResult.parse(wire());
    expect(isPendingSale(parsed)).toBe(true);
    expect(createResult.safeParse({ nothing: true }).success).toBe(false);
  });
  it("chỉ dùng mã QR khi chuỗi khớp số tiền và nội dung", () => {
    expect(usableVietQr(pendingSale.parse(wire()))?.content).toBe("HD000001");
    const vietQr = { ...wire().vietQr, amount: 12_000_000, content: "HD000001", payload: BIG };
    expect(usableVietQr(pendingSale.parse(wire({ total: 12_000_000, toPayAmount: 12_000_000, vietQr })))).toBeUndefined();
    expect(usableVietQr(pendingSale.parse(wire({ vietQr: null, status: "Stopped" })))).toBeUndefined();
  });
  it("thân đổi phương thức và dừng bán chặt chẽ", () => {
    expect(changePendingPayment.safeParse({ payment: { cashAmount: 900_000, rest: "None" } }).success).toBe(true);
    expect(changePendingPayment.safeParse({ payment: { cashAmount: 0, rest: "PayLater", payLaterOwnerAgreed: true } }).success).toBe(true);
    expect(changePendingPayment.safeParse({ payment: { cashAmount: 0, rest: "VietQr" } }).success).toBe(false);
    expect(changePendingPayment.safeParse({ payment: { cashAmount: 1.5, rest: "None" } }).success).toBe(false);
    expect(stopPending.safeParse({ confirmed: true }).success).toBe(true);
    expect(stopPending.safeParse({ confirmed: false }).success).toBe(false);
    expect(stopPending.safeParse({ confirmed: true, x: 1 }).success).toBe(false);
  });
});

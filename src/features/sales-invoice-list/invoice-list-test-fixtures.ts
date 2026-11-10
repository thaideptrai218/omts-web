// Dữ liệu mẫu cho các bài kiểm thử của màn Hóa đơn bán; chỉ được import từ *.test.tsx (hình dạng đúng hợp đồng backend, trạng thái bằng tiếng Anh như backend trả về).
const guid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const ids = { invoice: guid(1), zone: guid(2), customer: guid(3), product: guid(4), lot: guid(5), line: guid(6), payment: guid(7) };

export const listRow = {
  id: ids.invoice, code: "HD000123", invoicedAt: "2026-11-09T10:12:00+07:00", invoiceDate: "2026-11-09", zone: { id: ids.zone, code: "VP01", name: "Vùng nuôi 1" },
  customer: { id: ids.customer, name: "Nguyễn Văn Hùng", phoneNumber: "0912345678" }, walkInCustomer: false, total: 15_800_000, statusId: 3501, status: "Completed",
  paymentTerm: "PayLater", isPaid: false, unpaidAmount: 5_000_000, deliveryStatusId: 1602, deliveryStatus: "Sent", cashAwaitingConfirmation: null,
};
export const listResult = (rows: unknown[] = [listRow]) => ({
  page: { items: rows, page: 1, pageSize: 20, total: rows.length }, completedTotal: 15_800_000, from: "2026-11-09", to: "2026-11-09", message: null, messageCode: null,
});

/** Chi tiết hóa đơn; `branch: true` thêm các trường của nhánh OMTS-224 (corrections ...). */
export const detail = (over: Record<string, unknown> = {}, branch = false) => ({
  id: ids.invoice, code: "HD000123", invoicedAt: "2026-11-09T10:12:00+07:00", invoiceDate: "2026-11-09", zone: { id: ids.zone, code: "VP01", name: "Vùng nuôi 1" },
  customer: { id: ids.customer, name: "Nguyễn Văn Hùng", phoneNumber: "0912345678" }, walkInCustomer: false, purchaseRequestId: null, takesRequestInFull: true,
  lines: [{ id: ids.line, lineNumber: 1, productId: ids.product, productName: "Hàu sữa", harvestLotId: ids.lot, lotCode: "B03-20261026", kg: 120, unitPrice: 85_000, listPrice: 85_000, priceSource: "PriceList", amount: 10_200_000, soldWholeLot: true }],
  totalKg: 120, subtotal: 15_800_000, discount: 0, discountDecidedByOwner: false, otherCharges: 0, priceCutTotal: 0, total: 15_800_000, paymentTerm: "PayLater", statusId: 3501, status: "Completed",
  payments: [{ id: ids.payment, code: "TT-001", kind: "Payment", method: "Cash", amount: 10_800_000, paymentDate: "2026-11-09", statusId: 3601, status: "AwaitingConfirmation", collectedBy: { id: guid(8), name: "Lê Hoa" } }],
  createdBy: { id: guid(9), name: "Trần Quản Lý" }, qrToken: null, qrUrl: "https://example.test/qr/abc", qrDecidedAt: "2026-11-09T10:15:00+07:00", deliveryStatusId: 1602, deliveryStatus: "Sent",
  sendings: [{ channel: "Sms", phoneNumber: "0912345678", deliveryStatusId: 1602, deliveryStatus: "Sent", deliveryStatusAt: "2026-11-09T10:16:00+07:00" }], rowVersion: "AAAA",
  priceCuts: [], debtEffect: { isPaid: false, covered: 10_800_000, unpaid: 5_000_000, countsInCustomerDebt: true, customerDebt: 5_000_000 },
  allowedActions: ["Resend", "CreateReturn", "Correct", "Cancel", "Print"],
  ...(branch ? { corrections: [{ kind: "DataEntryError", date: "2026-11-09", reason: "Nhập sai kg", totalBefore: 15_450_000, totalAfter: 15_800_000 }], cancelledAt: null, cancelReason: null } : {}),
  ...over,
});
export const sent = (invoice: unknown, deliveryStatusId = 1602) => ({ invoice, deliveryStatusId, deliveryStatus: "Sent", qrUrl: null, lots: [], message: null, messageCode: null });

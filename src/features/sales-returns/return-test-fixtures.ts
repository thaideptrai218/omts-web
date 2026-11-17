import { returnPage, returnPreview, returnSaved, returnView } from "./return-contracts";

export const ids = {
  ret: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", invoice: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b02", order: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b03", customer: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b04",
  lotA: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b05", lotB: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b06", lineA: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b07", lineB: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b08",
  user: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b09", zone: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0a", claim: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0b", buyer: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0c",
};

export const returnRowData = {
  id: ids.ret, code: "TL000001", returnDate: "2026-11-17", recordedAt: "2026-11-17T10:30:00+07:00", invoiceId: ids.invoice, invoiceCode: "HD000123", salesOrder: { id: ids.order, code: "DH000010" },
  customer: { id: ids.customer, code: "KH000004", name: "Trần Văn Lái" }, zoneCode: "V01", value: 4_250_000, statusId: 4101, status: "Recorded", recordedByName: "Chủ HTX", lineCount: 2, backForSaleKg: 30, discardedKg: 20,
};
export const returnTotalsData = { value: 4_250_000, backForSaleKg: 30, discardedKg: 20 };
export const page = (patch: Record<string, unknown> = {}) => returnPage.parse({ items: [returnRowData], total: 1, page: 1, pageSize: 15, totals: returnTotalsData, ...patch });

/** A recorded return of two lines, one back for sale and one thrown away. */
export const view = (patch: Record<string, unknown> = {}) => returnView.parse({
  id: ids.ret, code: "TL000001", invoiceId: ids.invoice, invoiceCode: "HD000123", returnDate: "2026-11-17", recordedAt: "2026-11-17T10:30:00+07:00", reason: "Hàu chết nhiều", value: 4_250_000, statusId: 4101, status: "Recorded",
  recordedBy: { id: ids.user, name: "Chủ HTX" }, cancelledAt: null, cancelReason: null, rowVersion: "AAA1", salesOrder: { id: ids.order, code: "DH000010" }, customer: { id: ids.customer, code: "KH000004", name: "Trần Văn Lái" },
  zoneCode: "V01", backForSaleKg: 30, discardedKg: 20, canCancel: true,
  lines: [
    { invoiceLineId: ids.lineA, lineNumber: 1, productName: "Hàu sữa", productCode: "SP1", harvestLotId: ids.lotA, lotCode: "LTH000007", returnedKg: 30, outcome: "BackForSale", discardedKg: 0 },
    { invoiceLineId: ids.lineB, lineNumber: 2, productName: "Hàu Pacific", productCode: "SP2", harvestLotId: ids.lotB, lotCode: "LTH000008", returnedKg: 20, outcome: "ThrownAway", discardedKg: 20 },
  ],
  lots: [{ harvestLotId: ids.lotA, lotCode: "LTH000007", remainingKg: 12, remainingAfterCancelKg: -18 }], ...patch,
});

/** What the editor reads before the save: two lines of one invoice with a customer. */
export const preview = (patch: Record<string, unknown> = {}) => returnPreview.parse({
  invoiceId: ids.invoice, invoiceCode: "HD000123", rowVersion: "INV1", requiresCustomer: false, customer: { id: ids.customer, name: "Trần Văn Lái", phoneNumber: "0901234567", code: "KH000004" }, value: 4_250_000,
  lines: [
    { invoiceLineId: ids.lineA, lineNumber: 1, productName: "Hàu sữa", harvestLotId: ids.lotA, lotCode: "LTH000007", lotStatusId: 2903, lotStatus: "Closed", kg: 30, unitPrice: 85_000, amount: 2_550_000 },
    { invoiceLineId: ids.lineB, lineNumber: 2, productName: "Hàu Pacific", harvestLotId: ids.lotB, lotCode: "LTH000008", lotStatusId: 2901, lotStatus: "Open", kg: 20, unitPrice: 85_000, amount: 1_700_000 },
  ],
  qualityClaims: [{ id: ids.claim, code: "KN000001", sentAt: "2026-11-16T08:00:00+07:00", statusId: 3703, status: "Accepted", offer: "ReturnAllGoods" }],
  customerDebt: 1_000_000, debtAfter: -3_250_000, owedBackAfter: 3_250_000, ownerMustAgree: false, ...patch,
});
export const saved = (patch: Record<string, unknown> = {}) => returnSaved.parse({ return: view(), debtAfter: -3_250_000, owedBack: 3_250_000, message: "ok", messageCode: "MSG-CLAIM-05", ...patch });

import type { Receipt, WaterMeasurement } from "../contracts";
export const ids = { receipt: "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", zone: "529ec3ce-af8f-42f7-a08f-4bab36ba7e63", otherZone: "529ec3ce-af8f-42f7-a08f-4bab36ba7e64",
  supplier: "529ec3ce-af8f-42f7-a08f-4bab36ba7e65", item: "529ec3ce-af8f-42f7-a08f-4bab36ba7e66", line: "529ec3ce-af8f-42f7-a08f-4bab36ba7e67", water: "529ec3ce-af8f-42f7-a08f-4bab36ba7e68", raft: "529ec3ce-af8f-42f7-a08f-4bab36ba7e69" };
export function receiptFixture(patch: Partial<Receipt> = {}): Receipt {
  return { id: ids.receipt, code: "PN-QA-01", supplier: { id: ids.supplier, name: "Nhà cung cấp QA", phoneNumber: "0900000099" }, zone: { id: ids.zone, code: "QA01", name: "Vùng QA" }, raft: null,
    receiptDate: "2026-10-01", subtotal: 100000, discountAmount: 0, payable: 100000, returned: 0, paid: 0, refunded: 0, outstanding: 100000, amountPaidNow: 0, paidNowMethod: null,
    notes: null, invoicePhotoUrls: [], statusId: 1701, status: "Draft", completedAt: null, cancelledAt: null, cancelReason: null, copiedFromReceiptId: null,
    lines: [{ id: ids.line, itemId: ids.item, itemCode: "IT01", itemName: "Hàng QA", group: "Other", unit: "kg", quantity: 10, unitPrice: 10000, lineAmount: 100000,
      supplierLotCode: null, actualSource: null, seedLotId: null, seedLotCode: null, stocked: 0, returnedQuantity: 0, returnable: 10 }], payments: [], returns: [], rowVersion: "AQID", ...patch };
}
export function waterFixture(patch: Partial<WaterMeasurement> = {}): WaterMeasurement {
  const measuredAt = "2026-10-01T08:00:00+07:00";
  return { id: ids.water, zoneId: ids.zone, zoneCode: "QA01", zoneName: "Vùng QA", raftId: ids.raft, raftCode: "B-QA", measuredAt, ph: 7.5, salinity: 25, temperature: 26,
    status: "Active", statusCode: "ACTIVE", photoUrl: "/api/operations/water?action=photo&id=" + ids.water,
    thresholdsUsed: { phMin: 7, phMax: 8.5, salinityMin: 18, salinityMax: 32, temperatureMin: 15, temperatureMax: 32 },
    alertState: "None", thresholdExceeded: false, violatedValues: null, alertedAt: null, measuredBy: null, voidReason: null, ...patch };
}

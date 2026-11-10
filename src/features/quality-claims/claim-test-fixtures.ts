import type { ClaimOffer } from "./claim-contracts";

/** Dữ liệu mẫu đúng hình dạng JSON của backend (QualityClaimRow / QualityClaimView / TraderQualityClaimView), dùng cho các test màn hình. */
export const ids = { claim: "11111111-1111-4111-8111-111111111111", claim2: "22222222-2222-4222-8222-222222222222", invoice: "33333333-3333-4333-8333-333333333333", customer: "44444444-4444-4444-8444-444444444444", zone: "55555555-5555-4555-8555-555555555555" };
const sentAt = "2026-11-08T03:15:00+00:00";
const line = { productName: "Hàu sữa", lotCode: "LH0001", kg: 120.5, unitPrice: 85000, amount: 10242500 };

export function row(over: Record<string, unknown> = {}) {
  return { id: ids.claim, code: "KN000001", sentAt, statusId: 3701, status: "Awaiting response", description: "Hàu chết nhiều, mùi hôi", photoCount: 2, offer: null,
    invoice: { id: ids.invoice, code: "HD000123" }, customer: { id: ids.customer, name: "Trần Văn Lái", phoneNumber: "0901234567" }, ...over };
}
export function page(items: unknown[] = [row()], over: Record<string, unknown> = {}) {
  return { items, page: 1, pageSize: 20, total: items.length, message: items.length ? null : "There is nothing to show yet.", messageCode: items.length ? null : "MSG-GEN-11", ...over };
}
export function staff(over: Record<string, unknown> = {}) {
  return { id: ids.claim, code: "KN000001", sentAt, statusId: 3701, status: "Awaiting response", description: "Hàu chết nhiều, mùi hôi", photos: [{ sortOrder: 1, url: "https://backend.example/a.jpg?sig=1" }, { sortOrder: 2, url: "https://backend.example/b.jpg?sig=2" }],
    offer: null, response: null, customer: { id: ids.customer, name: "Trần Văn Lái", phoneNumber: "0901234567" },
    invoice: { id: ids.invoice, code: "HD000123", invoiceDate: "2026-11-07", zoneId: ids.zone, zoneName: "Vùng nuôi 1", statusId: 3501, status: "Completed", subtotal: 10242500, discount: 0, otherCharges: 0, priceCutTotal: 0, total: 10242500,
      lines: [line], priceCuts: [] },
    sendings: [], rowVersion: "AAAAAAAAB9E=", message: null, messageCode: null, ...over };
}
export function trader(over: Record<string, unknown> = {}) {
  return { id: ids.claim, code: "KN000001", sentAt, statusId: 3701, status: "Awaiting response", description: "Hàu chết nhiều, mùi hôi", photos: [{ sortOrder: 1, url: "https://backend.example/a.jpg?sig=1" }],
    offer: null, response: null, invoice: { id: ids.invoice, code: "HD000123" }, invoiceDate: "2026-11-07", invoiceTotal: 10242500, lines: [{ ...line, unitPrice: null, amount: null }], ...over };
}
export function answered(offer: ClaimOffer | null, statusId: number, note: string | null) {
  return { statusId, status: statusId === 3703 ? "Accepted" : "Rejected", offer, response: { note, respondedAt: "2026-11-08T08:00:00+00:00" } };
}

import type { PurchaseRequest } from "../new-module-contracts";

export const requestId = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62";
/** Dạng PurchaseRequestView mà backend develop trả về (kg, không có lồng/nhân lực). */
export const backendRequest = (patch: Partial<PurchaseRequest> = {}): PurchaseRequest => ({
  id: requestId, customer: { id: requestId, name: "Thương lái An", phoneNumber: "0900000001", currentDebt: 1500000 }, productId: requestId, productName: "Hàu sữa", requestedKg: 120.5, pickupDate: "2026-11-12", note: "Giao sáng",
  sentAt: "2026-11-09T08:15:00+07:00", statusId: 3201, status: "Awaiting response", fulfilled: false, response: null, cancelReason: null, cancelledAt: null, sendings: [], rowVersion: "AAAA", ...patch,
});

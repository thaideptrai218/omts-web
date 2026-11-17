import { harvestDetail } from "@/features/cultivation-api/records-contracts";

export const ids = {
  zone: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", raft: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a22", lot: "122bb318-a72e-49aa-a8d7-a6169f889007", cycle: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a33",
  product: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", receipt: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b02", nursery: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b03", orderA: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b04",
  orderB: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b05", invoice: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b06", plan: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b07",
};

/** An open, weighed lot with one product line, as the API answers it; the fixture goes through the real schema, so its defaults are filled in. */
export function lotDetail(patch: Record<string, unknown> = {}) {
  return harvestDetail.parse({
    id: ids.lot, lotCode: "LTH000007", cycleId: ids.cycle, raftId: ids.raft, raftCode: "B1", zoneId: ids.zone, zoneCode: "DEMO-01", harvestedAt: "2026-11-17T08:00:00+07:00", harvestDate: "2026-11-17",
    laneNumbers: [1, 2], finishedLaneNumbers: [1], lanePercents: [{ laneNumber: 1, percent: 100 }, { laneNumber: 2, percent: 40 }], cageCount: 4, kgPerCage: 50, estimatedKg: 200,
    figures: { invoicedKg: 100, returnedKg: 5, soldKg: 95, remainingKg: 100.5, lostKg: 0, differenceKg: -4.5, notFinal: true }, closeDate: null, leftoverKg: null, photos: [], recordedByName: "Chủ", rowVersion: "v1",
    statusId: 2901, status: "Open", weighedKg: 195.5, weighedAt: "2026-11-17T09:00:00+07:00", weighedByName: "Cân viên", harvestPlan: { id: ids.plan, code: "KHT000003" }, overPlanReason: "Khách thêm đơn",
    productLines: [{ lineNumber: 1, productId: ids.product, productCode: "SP1", productName: "Hàu sữa", cageCount: 4, kg: 200, weighedKg: 195.5 }],
    productStocks: [{ productId: ids.product, productCode: "SP1", productName: "Hàu sữa", harvestedKg: 195.5, soldKg: 100, returnedKg: 5, remainingKg: 100.5 }],
    references: {
      seedLots: [{ receiptId: ids.receipt, receiptCode: "PN000004", lineNumber: 1, seedLotCode: "G-2026-01", itemCode: "GG1", itemName: "Giống hàu" }], nurseryBatch: { id: ids.nursery, code: "NU000002" },
      salesOrders: [{ id: ids.orderA, code: "DH000001" }],
    },
    canCorrect: false, canRemove: false, canWeigh: true, canClose: true, canReopen: false, ...patch,
  });
}

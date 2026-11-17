import { seedLotDetail, seedLotRow, type SeedLotState } from "./contracts";

export const ids = {
  line: "122bb318-a72e-49aa-a8d7-a6169f889007", receipt: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b02", supplier: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b08", item: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b09",
  product: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", nursery: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b03", seeding: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0a", cycle: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a33",
  ret: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0b", issue: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0c", harvest: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0d",
};

/** One seed lot row as the API sends it; the fixture goes through the real schema. `patch` overrides any field. */
export function seedLotRowFixture(patch: Record<string, unknown> = {}) {
  return seedLotRow.parse({
    id: ids.line, seedLotCode: "PN000004-1", receiptId: ids.receipt, receiptCode: "PN000004", receivedAt: "2026-11-10T08:00:00+07:00", supplier: { id: ids.supplier, code: "NCC000001", name: "Trại giống Vân Đồn" },
    item: { id: ids.item, code: "GG000001", name: "Hàu giống 3 cm" }, product: { id: ids.product, code: "SP000001", name: "Hàu sữa" }, unitName: "mảnh",
    receivedQty: 1000, returnedQty: 100, nursingQty: 0, nurseryLossQty: 0, seededQty: 400, issuedOtherQty: 0, remainingQty: 500, availableQty: 500, state: "PartlySeeded", lastUsedAt: "2026-11-14T07:00:00+07:00", ...patch,
  });
}

/** The detail of a lot with a nursery batch, a seeding, a return, an issue, a cycle and a harvest lot. */
export function seedLotDetailFixture(patch: Record<string, unknown> = {}, state: SeedLotState = "PartlySeeded") {
  return seedLotDetail.parse({
    ...seedLotRowFixture({ state }),
    nurseryBatches: [{ id: ids.nursery, code: "NU000002", statusId: 4002, status: "Completed", quantityIn: 300, survivors: 250, startDate: "2026-11-11" }],
    seedings: [{ id: ids.seeding, cycleId: ids.cycle, raftCode: "B1", zoneCode: "V01", quantity: 400, seededAt: "2026-11-14T07:00:00+07:00" }],
    returns: [{ id: ids.ret, code: "TH000001", quantity: 100, returnedAt: "2026-11-12T09:00:00+07:00", statusId: 1901 }],
    issues: [{ id: ids.issue, code: "XH000001", kind: "Disposal", quantity: 0, issuedAt: "2026-11-13T09:00:00+07:00" }],
    cycles: [{ id: ids.cycle, raftCode: "B1", zoneCode: "V01", statusId: 2001, productCode: "SP000001" }],
    harvestLots: [{ id: ids.harvest, lotCode: "LTH000007", statusId: 2901, weighedKg: 195.5, estimatedKg: 200 }],
    ...patch,
  });
}

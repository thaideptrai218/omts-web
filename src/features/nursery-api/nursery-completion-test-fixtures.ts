import { nurseryDetailSchema } from "./contracts";

export const completionBatch = nurseryDetailSchema.parse({
  id: "batch", code: "NU000001", zoneId: "zone", zoneCode: "DEMO-01", zoneName: "Vùng ươm một",
  quantityIn: 100, startDate: "2026-01-01", daysNursing: 1, statusId: 4001, status: "Nursing", rowVersion: "version",
  seedLot: { id: "lot", code: "PN000001-1", itemName: "Giống hàu", unit: "mảnh" },
});

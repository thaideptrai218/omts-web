import type { CycleRow } from "@/features/cycles-api/cycle-model";
import { nurseryDetailSchema } from "./contracts";

export const completionBatch = nurseryDetailSchema.parse({
  id: "batch", code: "NU000001", zoneId: "zone", zoneCode: "DEMO-01", zoneName: "Vùng ươm một",
  quantityIn: 100, startDate: "2026-01-01", daysNursing: 1, statusId: 4001, status: "Nursing", rowVersion: "version",
  seedLot: { id: "lot", code: "PN000001-1", itemName: "Giống hàu", unit: "mảnh" }, allocations: [],
});

export const completionRafts: CycleRow[] = ["B1-01", "B1-02", "B1-03"].map((raftCode, index) => ({
  raftId: `00000000-0000-4000-8000-00000000000${index + 1}`, raftCode, raftStatusId: 101, raftStatus: "InUse",
  laneCount: index + 1, cycle: null, lastCloseDate: null, canStart: true, canEdit: true, canCancel: false,
}));

export const completionRecipient = {
  id: "allocation", raftId: completionRafts[0].raftId, raftCode: "B1-01", cycleId: "cycle", quantity: 80, seeded: 30,
  remaining: 50, targetYieldKg: 20, canChange: true,
};

import type { RaftCycle, RaftEvent, RaftRecord } from "../domain/raft";

// Synthetic frontend scenarios, not imported database records or real farm data.
function record(zoneId: string, prefix: string, index: number): RaftRecord {
  const id = `raft-${prefix}-${index}`;
  const recorder = zoneId === "zone-east" ? "Nguyễn Văn An" : "Phạm Quốc Cường";
  const cycle: RaftCycle = {
    id: `cycle-${id}`,
    code: `CK-${prefix}-${index}`,
    openedAt: "2026-10-01",
    closedAt: index === 2 ? "2026-10-10" : null,
  };
  const lanes = Array.from({ length: 3 }, (_, lane) => ({
    number: lane + 1,
    length: 24,
    markerA: "Đầu A",
    markerB: "Đầu B",
  }));
  const events: RaftEvent[] =
    index === 3
      ? []
      : [
          {
            id: `seed-${id}-1`,
            cycleId: cycle.id,
            laneNumber: 1,
            kind: "seeded",
            from: 0,
            to: 24,
            date: "2026-10-01",
            recordedBy: recorder,
            confirmedBy: "Lê Minh Hải",
            seedLotCode: `GIONG-${prefix}-01`,
          },
          {
            id: `seed-${id}-2`,
            cycleId: cycle.id,
            laneNumber: 2,
            kind: "seeded",
            from: 0,
            to: 16,
            date: "2026-10-03",
            recordedBy: recorder,
            confirmedBy: "Lê Minh Hải",
            seedLotCode: `GIONG-${prefix}-01`,
          },
          {
            id: `harvest-${id}`,
            cycleId: cycle.id,
            laneNumber: 1,
            kind: "harvested",
            from: 0,
            to: index === 2 ? 24 : 8,
            date: index === 2 ? "2026-10-09" : "2026-10-20",
            recordedBy: recorder,
            confirmedBy: "Lê Minh Hải",
            orderCode: `DH-${prefix}-01`,
          },
        ];
  if (index === 1)
    events.push(
      {
        id: `writeoff-${id}`,
        cycleId: cycle.id,
        laneNumber: 1,
        kind: "written-off",
        from: 20,
        to: 24,
        date: "2026-10-26",
        recordedBy: recorder,
        confirmedBy: "Lê Minh Hải",
        reason: "Dây hư sau đợt sóng, đã ghi nhận phần hao hụt.",
      },
      {
        id: `planned-${id}`,
        cycleId: cycle.id,
        laneNumber: 1,
        kind: "planned",
        from: 8,
        to: 16,
        date: "2026-10-27",
        recordedBy: "Lê Minh Hải",
        confirmedBy: null,
        orderCode: `DH-${prefix}-02`,
      },
    );
  if (index === 2)
    events.push({
      id: `harvest-second-${id}`,
      cycleId: cycle.id,
      laneNumber: 2,
      kind: "harvested",
      from: 0,
      to: 16,
      date: "2026-10-09",
      recordedBy: recorder,
      confirmedBy: "Lê Minh Hải",
      orderCode: `DH-${prefix}-01`,
    });
  return {
    profile: {
      id,
      zoneId,
      code: `B${prefix}-${String(index).padStart(2, "0")}`,
      latitude: zoneId === "zone-east" ? 21.0712 : 21.0834,
      longitude: zoneId === "zone-east" ? 107.4321 : 107.4518,
      location: "Vị trí bè theo hồ sơ vùng",
      size: "10 m × 24 m",
      conditionNotes:
        index === 3
          ? "Bè cũ đã ngừng sử dụng."
          : "Bè gỗ, phao HDPE; theo dõi dây và phao định kỳ.",
      status: index === 3 ? "discontinued" : "in-use",
      createdBy: "account-owner-demo",
      recordVersion: `raft-${prefix}-${index}-v1`,
      layouts: [
        {
          version: 1,
          validFrom: "2026-09-01",
          validTo: index === 2 ? "2026-10-15" : null,
          lanes,
        },
        ...(index === 2
          ? [
              {
                version: 2,
                validFrom: "2026-10-15",
                validTo: null,
                lanes: lanes.map((lane) => ({ ...lane, length: 26 })),
              },
            ]
          : []),
      ],
      cycles: index === 3 ? [] : [cycle],
      materialCostVnd: null,
    },
    events,
  };
}
export const mockRafts: readonly RaftRecord[] = [
  "zone-east",
  "zone-south",
].flatMap((zone, index) =>
  [1, 2, 3].map((number) => record(zone, String(index + 1), number)),
);

import { expect, it } from "vitest";
import { createMockFarmingZoneStore } from "./mock-farming-zone-store";
import { initialFarmingZones } from "../mocks/farming-zone-fixtures";
import type { FarmingZone, ZoneAccess } from "../domain/farming-zone";

const owner: ZoneAccess = {
  canWrite: true,
  visibleZoneIds: null,
  actorName: "Chủ HTX kiểm thử",
};
export function zoneInput(zone: FarmingZone = initialFarmingZones[0]) {
  return {
    id: zone.id,
    recordVersion: zone.recordVersion,
    code: zone.code,
    name: zone.name,
    location: zone.location,
    latitude: String(zone.latitude),
    longitude: String(zone.longitude),
    area: String(zone.area),
    waterMeasurementPoint: zone.waterMeasurementPoint,
  };
}
function setup(zones = initialFarmingZones) {
  const store = createMockFarmingZoneStore({
    initialZones: zones,
    latencyMs: 0,
  });
  return { store, repository: store.forAccess(() => owner) };
}
it("renames a zone using the same ID without changing the earlier snapshot", async () => {
  const { store, repository } = setup();
  const before = store.snapshotOptions();
  const result = await repository.save({
    ...zoneInput(),
    name: "Vùng do Owner đặt tên",
  });
  expect(result.status).toBe("saved");
  expect(store.snapshotOptions()[0]).toEqual({
    ...before[0],
    label: "Vùng do Owner đặt tên",
  });
  expect(before[0].label).toBe("Khu Đông");
});
it("blocks a duplicate code, including whitespace/case differences", async () => {
  const { store, repository } = setup();
  expect(
    await repository.save({
      ...zoneInput(),
      id: null,
      recordVersion: null,
      code: " demo-01 ",
    }),
  ).toMatchObject({ status: "duplicate", existingId: "zone-east" });
  expect(store.snapshotZones()).toHaveLength(3);
});
it("rejects an older version rather than replacing the new name", async () => {
  const { store, repository } = setup();
  await repository.save({ ...zoneInput(), name: "Tên vừa lưu" });
  expect(
    await repository.save({ ...zoneInput(), name: "Tên cũ gửi muộn" }),
  ).toMatchObject({ status: "conflict", updatedBy: owner.actorName });
  expect(store.snapshotZones()[0].name).toBe("Tên vừa lưu");
});
it("limits Manager reads to assigned zones and rejects every write", async () => {
  const { store } = setup();
  const manager = store.forAccess(() => ({
    canWrite: false,
    visibleZoneIds: ["zone-east"],
    actorName: "Quản lý vùng",
  }));
  expect(await manager.load()).toMatchObject({
    status: "loaded",
    workspace: { canWrite: false, zones: [{ id: "zone-east" }] },
  });
  expect(await manager.save(zoneInput())).toEqual({ status: "forbidden" });
  expect(
    await manager.changeStatus({
      id: "zone-east",
      recordVersion: "mock-zone-1",
      status: "discontinued",
    }),
  ).toEqual({ status: "forbidden" });
});
it("blocks discontinuation with active rafts and preserves every zone field", async () => {
  const initial = [{ ...initialFarmingZones[0], inUseRaftCodes: ["BE-01"] }];
  const { store, repository } = setup(initial);
  expect(
    await repository.changeStatus({
      id: "zone-east",
      recordVersion: "mock-zone-1",
      status: "discontinued",
    }),
  ).toEqual({ status: "blocked", raftCodes: ["BE-01"] });
  expect(store.snapshotZones()).toEqual(initial);
});
it("discontinues and restores using the returned version without deleting the zone", async () => {
  const { store, repository } = setup();
  const changed = await repository.changeStatus({
    id: "zone-east",
    recordVersion: "mock-zone-1",
    status: "discontinued",
  });
  if (changed.status !== "saved") throw new Error("Expected status change");
  const zone = changed.workspace.zones.find((item) => item.id === "zone-east")!;
  expect(
    await repository.changeStatus({
      id: zone.id,
      recordVersion: zone.recordVersion,
      status: "in-use",
    }),
  ).toMatchObject({ status: "saved" });
  expect(store.snapshotZones()).toHaveLength(3);
  expect(store.snapshotZones()[0].status).toBe("in-use");
});

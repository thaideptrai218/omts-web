import type {
  FarmingZone,
  ZoneAccess,
  ZoneDocument,
  ZoneFailure,
  ZoneWorkspace,
} from "../domain/farming-zone";

export type MockZoneState = {
  zones: FarmingZone[];
  documents: ZoneDocument[];
  files: Map<string, File>;
  updates: Map<string, { updatedBy: string; updatedAt: string }>;
  getInUseRaftCodes?: (zoneId: string) => readonly string[];
  now(): Date;
};
export function cloneZone(zone: FarmingZone): FarmingZone {
  return { ...zone, inUseRaftCodes: [...zone.inUseRaftCodes] };
}
export function currentZone(
  state: MockZoneState,
  zone: FarmingZone,
): FarmingZone {
  return {
    ...cloneZone(zone),
    inUseRaftCodes: [
      ...(state.getInUseRaftCodes?.(zone.id) ?? zone.inUseRaftCodes),
    ],
  };
}
export function projectZones(
  state: MockZoneState,
  access: ZoneAccess,
): ZoneWorkspace {
  const visible = (id: string) =>
    access.visibleZoneIds === null || access.visibleZoneIds.includes(id);
  return {
    canWrite: access.canWrite,
    zones: state.zones
      .filter((zone) => visible(zone.id))
      .map((zone) => {
        const projected = currentZone(state, zone);
        return access.canWrite
          ? projected
          : { ...projected, inUseRaftCodes: [] };
      }),
    documents: state.documents
      .filter((document) => document.zoneIds.some(visible))
      .map((document) => ({
        ...document,
        zoneIds: document.zoneIds.filter(visible),
        replacementEffectiveDate: state.documents.find(
          (item) => item.replacesId === document.id,
        )?.effectiveDate,
      })),
  };
}
export function zoneConflict(state: MockZoneState, id: string): ZoneFailure {
  const update = state.updates.get(id)!;
  return { status: "conflict", ...update };
}
export function stampZone(
  state: MockZoneState,
  id: string,
  access: ZoneAccess,
) {
  state.updates.set(id, {
    updatedBy: access.actorName,
    updatedAt: state
      .now()
      .toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
  });
}

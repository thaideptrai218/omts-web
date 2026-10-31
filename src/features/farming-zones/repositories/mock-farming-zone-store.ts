import type {
  FarmingZone,
  ZoneAccess,
  ZoneDocument,
  ZoneMutationResult,
} from "../domain/farming-zone";
import type { FarmingZoneRepository } from "./farming-zone-repository";
import { farmingZoneSchema, zoneNumber } from "../schemas/farming-zone-schema";
import {
  cloneZone,
  currentZone,
  projectZones,
  stampZone,
  zoneConflict,
  type MockZoneState,
} from "./mock-zone-state";
import { mockZoneDocuments } from "./mock-zone-documents";

export function createMockFarmingZoneStore(
  options: Readonly<{
    initialZones: readonly FarmingZone[];
    initialDocuments?: readonly ZoneDocument[];
    latencyMs?: number;
    now?: () => Date;
    initialActorName?: string;
    getInUseRaftCodes?: (zoneId: string) => readonly string[];
  }>,
) {
  const state: MockZoneState = {
    zones: options.initialZones.map(cloneZone),
    documents: (options.initialDocuments ?? []).map((document) => ({
      ...document,
      zoneIds: [...document.zoneIds],
    })),
    files: new Map(),
    updates: new Map(),
    now: options.now ?? (() => new Date()),
    getInUseRaftCodes: options.getInUseRaftCodes,
  };
  for (const record of [...state.zones, ...state.documents])
    state.updates.set(record.id, {
      updatedBy: options.initialActorName ?? "Người khởi tạo",
      updatedAt: state
        .now()
        .toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    });

  function forAccess(
    getAccess: () => ZoneAccess | null,
  ): FarmingZoneRepository {
    async function prepare() {
      if ((options.latencyMs ?? 350) > 0)
        await new Promise((resolve) =>
          setTimeout(resolve, options.latencyMs ?? 350),
        );
      return getAccess();
    }
    function saved(actor: ZoneAccess, id: string): ZoneMutationResult {
      stampZone(state, id, actor);
      return {
        status: "saved",
        savedId: id,
        workspace: projectZones(state, actor),
      };
    }
    return {
      ...mockZoneDocuments(state, prepare, getAccess),
      async load() {
        const actor = await prepare();
        return actor
          ? { status: "loaded", workspace: projectZones(state, actor) }
          : { status: "forbidden" };
      },
      async save(input) {
        const actor = await prepare();
        if (!actor?.canWrite) return { status: "forbidden" };
        const parsed = farmingZoneSchema.safeParse(input);
        if (!parsed.success)
          return {
            status: "invalid",
            fields: parsed.error.issues.map((issue) => String(issue.path[0])),
          };
        const existing = state.zones.find((zone) => zone.id === input.id);
        if (input.id && !existing) return { status: "not-found" };
        if (existing && existing.recordVersion !== input.recordVersion)
          return zoneConflict(state, existing.id);
        const duplicate = state.zones.find(
          (zone) =>
            zone.id !== input.id &&
            zone.code.toLocaleLowerCase("vi") ===
              parsed.data.code.toLocaleLowerCase("vi"),
        );
        if (duplicate) return { status: "duplicate", existingId: duplicate.id };
        const zone: FarmingZone = {
          ...parsed.data,
          latitude: zoneNumber(parsed.data.latitude),
          longitude: zoneNumber(parsed.data.longitude),
          area: zoneNumber(parsed.data.area),
          id: existing?.id ?? crypto.randomUUID(),
          recordVersion: crypto.randomUUID(),
          status: existing?.status ?? "in-use",
          inUseRaftCodes: [...(existing?.inUseRaftCodes ?? [])],
        };
        state.zones = existing
          ? state.zones.map((item) => (item.id === zone.id ? zone : item))
          : [...state.zones, zone];
        return saved(actor, zone.id);
      },
      async changeStatus(input) {
        const actor = await prepare();
        if (!actor?.canWrite) return { status: "forbidden" };
        const zone = state.zones.find((item) => item.id === input.id);
        if (!zone) return { status: "not-found" };
        if (zone.recordVersion !== input.recordVersion)
          return zoneConflict(state, zone.id);
        if (
          !["in-use", "discontinued"].includes(input.status) ||
          zone.status === input.status
        )
          return { status: "invalid", fields: ["status"] };
        const raftCodes =
          state.getInUseRaftCodes?.(zone.id) ?? zone.inUseRaftCodes;
        if (input.status === "discontinued" && raftCodes.length)
          return { status: "blocked", raftCodes: [...raftCodes] };
        state.zones = state.zones.map((item) =>
          item.id === zone.id
            ? {
                ...item,
                status: input.status,
                recordVersion: crypto.randomUUID(),
              }
            : item,
        );
        return saved(actor, zone.id);
      },
    };
  }
  return {
    forAccess,
    snapshotZones: () => state.zones.map((zone) => currentZone(state, zone)),
    snapshotOptions: () =>
      state.zones.map((zone) => ({
        id: zone.id,
        label: zone.name,
        status: zone.status,
      })),
  };
}

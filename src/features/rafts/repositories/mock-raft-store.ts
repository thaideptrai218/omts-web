import type { FarmingZoneOption } from "@/features/account-management/domain/account-management";
import { canReadRaft } from "@/shared/mocks/mock-raft-access";
import { isDateOnly } from "@/shared/format/date-only";
import type {
  RaftAccess,
  RaftProfile,
  RaftRecord,
  RaftWorkspace,
  RaftMutationResult,
} from "../domain/raft";
import { updatedRaft, validRaftPhoto } from "./raft-write-rules";
import { projectRaftCondition } from "../domain/project-raft-condition";
import type { RaftRepository } from "./raft-repository";

function cloneProfile(raft: RaftProfile): RaftProfile {
  return {
    ...raft,
    layouts: raft.layouts.map((layout) => ({
      ...layout,
      lanes: layout.lanes.map((lane) => ({ ...lane })),
    })),
    cycles: raft.cycles.map((cycle) => ({ ...cycle })),
  };
}
export function createMockRaftStore({
  initialRafts,
  getZones,
  latencyMs = 350,
}: {
  initialRafts: readonly RaftRecord[];
  getZones(): readonly FarmingZoneOption[];
  latencyMs?: number;
}) {
  let rafts: RaftRecord[] = initialRafts.map((record) => ({
    profile: cloneProfile(record.profile),
    events: record.events.map((event) => ({ ...event })),
  }));
  const photos = new Map<string, File>();
  function workspace(access: RaftAccess): RaftWorkspace {
    return {
      canWrite: access.isOwner,
      rafts: rafts
        .filter((record) => canReadRaft(access, record.profile))
        .map((record) => cloneProfile(record.profile)),
      zones: getZones()
        .filter(
          (zone) =>
            access.isOwner ||
            access.grants.some(
              (grant) => grant.zoneId === null || grant.zoneId === zone.id,
            ),
        )
        .map((zone) => ({ ...zone })),
    };
  }
  function publish(
    access: RaftAccess,
    profile: RaftProfile,
  ): RaftMutationResult {
    const existing = rafts.find((record) => record.profile.id === profile.id);
    rafts = [
      ...rafts.filter((record) => record.profile.id !== profile.id),
      { profile: cloneProfile(profile), events: existing?.events ?? [] },
    ];
    return {
      status: "saved",
      savedId: profile.id,
      workspace: workspace(access),
    };
  }
  return {
    snapshotRafts: () => rafts.map((record) => cloneProfile(record.profile)),
    forAccess(getAccess: () => RaftAccess | null): RaftRepository {
      async function prepare() {
        if (latencyMs > 0)
          await new Promise((resolve) => setTimeout(resolve, latencyMs));
        return getAccess();
      }
      return {
        async load() {
          const access = await prepare();
          if (!access) return { status: "forbidden" };
          return {
            status: "loaded",
            workspace: workspace(access),
          };
        },
        async getCondition(input) {
          const access = await prepare();
          if (!access) return { status: "forbidden" };
          const record = rafts.find((raft) => raft.profile.id === input.raftId);
          if (!record || !canReadRaft(access, record.profile))
            return { status: "forbidden" };
          if (!isDateOnly(input.date)) return { status: "invalid-date" };
          if (
            input.cycleId &&
            !record.profile.cycles.some((cycle) => cycle.id === input.cycleId)
          )
            return { status: "invalid-cycle" };
          return {
            status: "loaded",
            condition: projectRaftCondition(record, input),
          };
        },
        async save(input) {
          const access = await prepare();
          if (!access?.isOwner) return { status: "forbidden" };
          const record = rafts.find((record) => record.profile.id === input.id);
          if (input.id && !record) return { status: "not-found" };
          if (record && record.profile.recordVersion !== input.recordVersion)
            return { status: "conflict" };
          if (record && record.profile.zoneId !== input.zoneId)
            return { status: "invalid", fields: ["zoneId"] };
          if (
            !record &&
            !getZones().some(
              (zone) => zone.id === input.zoneId && zone.status === "in-use",
            )
          )
            return { status: "zone-unavailable" };
          const duplicate = rafts.find(
            (r) =>
              r.profile.id !== input.id &&
              r.profile.zoneId === input.zoneId &&
              r.profile.code.toLocaleLowerCase("vi") ===
                input.code.trim().toLocaleLowerCase("vi"),
          );
          if (duplicate)
            return { status: "duplicate", existingId: duplicate.profile.id };
          const result = updatedRaft(record, input, access.accountId);
          return "profile" in result ? publish(access, result.profile) : result;
        },
        async changeStatus(input) {
          const access = await prepare();
          if (!access?.isOwner) return { status: "forbidden" };
          const profile = rafts.find(
            (record) => record.profile.id === input.id,
          )?.profile;
          if (!profile) return { status: "not-found" };
          if (profile.recordVersion !== input.recordVersion)
            return { status: "conflict" };
          if (profile.status === input.status)
            return { status: "invalid-status" };
          if (
            input.status === "discontinued" &&
            profile.cycles.some((cycle) => !cycle.closedAt)
          )
            return { status: "open-cycle" };
          if (
            input.status === "in-use" &&
            !getZones().some(
              (zone) => zone.id === profile.zoneId && zone.status === "in-use",
            )
          )
            return { status: "zone-unavailable" };
          return publish(access, {
            ...profile,
            status: input.status,
            recordVersion: crypto.randomUUID(),
          });
        },
        async savePhoto({ id, file }) {
          const access = await prepare();
          if (!access?.isOwner) return { status: "forbidden" };
          const profile = rafts.find(
            (record) => record.profile.id === id,
          )?.profile;
          if (!profile) return { status: "not-found" };
          if (!(await validRaftPhoto(file))) return { status: "invalid-photo" };
          // Reading the file yields: recheck authority and the version before publishing.
          const freshAccess = getAccess();
          if (
            !freshAccess?.isOwner ||
            freshAccess.accountId !== access.accountId
          )
            return { status: "forbidden" };
          if (
            rafts.find((record) => record.profile.id === id)?.profile
              .recordVersion !== profile.recordVersion
          )
            return { status: "conflict" };
          photos.set(id, file);
          return publish(freshAccess, {
            ...profile,
            photoFileName: file.name,
            recordVersion: crypto.randomUUID(),
          });
        },
        async getPhoto(id) {
          const access = await prepare();
          const profile = rafts.find(
            (record) => record.profile.id === id,
          )?.profile;
          return access && profile && canReadRaft(access, profile)
            ? (photos.get(id) ?? null)
            : null;
        },
      };
    },
  };
}

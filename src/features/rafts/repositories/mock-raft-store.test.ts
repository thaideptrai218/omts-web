import { expect, it } from "vitest";
import { createMockManagementEnvironment } from "@/shared/mocks/mock-management-environment";
import { createManagedMockAuth } from "@/shared/mocks/managed-mock-auth";
import { resolveMockRaftAccess } from "@/shared/mocks/mock-raft-access";
import { createMockRaftStore } from "./mock-raft-store";
import { mockRafts } from "../mocks/raft-fixtures";
import { initialFarmingZones } from "@/features/farming-zones/mocks/farming-zone-fixtures";
import type { RaftAccess } from "../domain/raft";

const owner: RaftAccess = {
  accountId: "account-owner-demo",
  isOwner: true,
  grants: [],
};
function setup(access: () => RaftAccess | null = () => owner) {
  const store = createMockRaftStore({
    initialRafts: mockRafts,
    latencyMs: 0,
    getZones: () =>
      initialFarmingZones.map((zone) => ({
        id: zone.id,
        label: zone.name,
        status: zone.status,
      })),
  });
  return { store, repository: store.forAccess(access) };
}
it("Owner reads the current workspace without turning missing cost into zero", async () => {
  const { repository } = setup();
  const result = await repository.load();
  expect(result).toMatchObject({
    status: "loaded",
    workspace: {
      rafts: expect.arrayContaining([
        expect.objectContaining({ materialCostVnd: null }),
      ]),
    },
  });
  if (result.status !== "loaded") throw new Error("Expected workspace");
  expect(result.workspace.rafts).toHaveLength(6);
});
it("limits both profiles and condition queries to the granted zone", async () => {
  const { repository } = setup(() => ({
    accountId: "manager",
    isOwner: false,
    grants: [{ zoneId: "zone-east", ownOnly: false }],
  }));
  const result = await repository.load();
  if (result.status !== "loaded") throw new Error("Expected workspace");
  expect(result.workspace.rafts).toHaveLength(3);
  expect(result.workspace.zones.map((zone) => zone.id)).toEqual(["zone-east"]);
  expect(
    await repository.getCondition({
      raftId: "raft-2-1",
      date: "2026-10-28",
      cycleId: null,
    }),
  ).toEqual({ status: "forbidden" });
  expect(
    await repository.getCondition({
      raftId: "unknown-raft",
      date: "2026-10-28",
      cycleId: null,
    }),
  ).toEqual({ status: "forbidden" });
});
it("OWN scope never grants all records in the zone", async () => {
  const { repository } = setup(() => ({
    accountId: "manager",
    isOwner: false,
    grants: [{ zoneId: "zone-east", ownOnly: true }],
  }));
  expect(await repository.load()).toMatchObject({ workspace: { rafts: [] } });
  expect(
    await repository.getCondition({
      raftId: "raft-1-1",
      date: "2026-10-28",
      cycleId: null,
    }),
  ).toEqual({ status: "forbidden" });
});
it("combines grants without applying a ZONE grant to another zone's OWN grant", async () => {
  const { repository } = setup(() => ({
    ...owner,
    isOwner: false,
    accountId: "manager",
    grants: [
      { zoneId: "zone-east", ownOnly: false },
      { zoneId: "zone-south", ownOnly: true },
    ],
  }));
  const result = await repository.load();
  if (result.status !== "loaded") throw new Error("Expected workspace");
  expect(
    result.workspace.rafts.every((raft) => raft.zoneId === "zone-east"),
  ).toBe(true);
});
it("copies nested layouts and cycles so the UI cannot edit the repository through a snapshot", async () => {
  const { repository } = setup();
  const result = await repository.load();
  if (result.status !== "loaded") throw new Error("Expected workspace");
  Reflect.set(result.workspace.rafts[0].layouts[0].lanes[0], "length", 999);
  const next = await repository.load();
  if (next.status !== "loaded") throw new Error("Expected workspace");
  expect(next.workspace.rafts[0].layouts[0].lanes[0].length).toBe(24);
});
it("rejects invalid dates/cycles and does not publish data after access is revoked during latency", async () => {
  let access: RaftAccess | null = owner;
  const store = createMockRaftStore({
    initialRafts: mockRafts,
    latencyMs: 5,
    getZones: () => [],
  });
  const repository = store.forAccess(() => access);
  expect(
    await repository.getCondition({
      raftId: "raft-1-1",
      date: "2026-02-30",
      cycleId: null,
    }),
  ).toEqual({ status: "invalid-date" });
  expect(
    await repository.getCondition({
      raftId: "raft-1-1",
      date: "2026-10-28",
      cycleId: "missing",
    }),
  ).toEqual({ status: "invalid-cycle" });
  const pending = repository.getCondition({
    raftId: "raft-1-1",
    date: "2026-10-28",
    cycleId: null,
  });
  access = null;
  expect(await pending).toEqual({ status: "forbidden" });
});
it("renames zones from one source and blocks zone discontinuation using actual in-use rafts", async () => {
  const env = createMockManagementEnvironment(0);
  const zone = env.zones.snapshotZones()[0];
  const zones = env.zones.forAccess(() => ({
    canWrite: true,
    visibleZoneIds: null,
    actorName: "Owner",
  }));
  const save = await zones.save({
    ...zone,
    name: "Vùng đổi tên",
    latitude: String(zone.latitude),
    longitude: String(zone.longitude),
    area: String(zone.area),
  });
  if (save.status !== "saved") throw new Error("Expected saved zone");
  const repository = env.rafts.forAccess(() => owner);
  expect(await repository.load()).toMatchObject({
    workspace: {
      zones: expect.arrayContaining([
        expect.objectContaining({ id: zone.id, label: "Vùng đổi tên" }),
      ]),
    },
  });
  const latest = env.zones.snapshotZones()[0];
  expect(
    await zones.changeStatus({
      id: zone.id,
      recordVersion: latest.recordVersion,
      status: "discontinued",
    }),
  ).toEqual({ status: "blocked", raftCodes: ["B1-01", "B1-02"] });
  expect(
    createManagedMockAuth(env).resolve("nguyen.an")?.account.access.permissions,
  ).toContainEqual({
    key: "farming.rafts.view",
    scope: { kind: "zones", zoneIds: ["zone-east"] },
  });
});
it("does not infer access from a role name or accept locked/expired grants", () => {
  const env = createMockManagementEnvironment(0);
  const accounts = env.accounts.snapshotAccounts();
  const roles = env.roles.snapshotRoles();
  const zones = env.zones.snapshotOptions();
  expect(
    resolveMockRaftAccess(
      "account-nguyen-an",
      accounts,
      roles,
      zones,
      "2026-10-28",
    ),
  ).toMatchObject({ grants: [{ zoneId: "zone-east", ownOnly: false }] });
  expect(
    resolveMockRaftAccess(
      "account-nguyen-an",
      accounts,
      roles,
      zones,
      "2026-01-01",
    ),
  ).toBeNull();
  expect(
    resolveMockRaftAccess("account-tran-binh", accounts, roles, zones),
  ).toBeNull();
  expect(
    resolveMockRaftAccess(
      "account-nguyen-an",
      accounts,
      roles.map((role) => ({ ...role, permissions: [] })),
      zones,
    ),
  ).toBeNull();
});

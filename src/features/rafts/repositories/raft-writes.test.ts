import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type {
  RaftAccess,
  RaftMutationResult,
  RaftProfile,
  SaveRaftInput,
} from "../domain/raft";
import { mockRafts } from "../mocks/raft-fixtures";
import { createMockRaftStore } from "./mock-raft-store";

const owner: RaftAccess = { accountId: "owner", isOwner: true, grants: [] };
function setup() {
  let access: RaftAccess | null = owner;
  let zoneActive = true;
  const store = createMockRaftStore({
    initialRafts: mockRafts,
    latencyMs: 0,
    getZones: () => [
      {
        id: "zone-east",
        label: "Vùng A",
        status: zoneActive ? "in-use" : "discontinued",
      },
    ],
  });
  return {
    store,
    repo: store.forAccess(() => access),
    revoke: () => {
      access = null;
    },
    staff: () => {
      access = {
        ...owner,
        isOwner: false,
        grants: [{ zoneId: null, ownOnly: false }],
      };
    },
    stopZone: () => {
      zoneActive = false;
    },
  };
}
function input(profile?: RaftProfile): SaveRaftInput {
  return {
    id: profile?.id ?? null,
    recordVersion: profile?.recordVersion ?? null,
    zoneId: "zone-east",
    code: profile?.code ?? "B-MỚI",
    latitude: "20,9",
    longitude: "107.2",
    location: "",
    size: "24 × 12 m",
    conditionNotes: "",
    lanes: profile?.layouts.at(-1)?.lanes ?? [
      { number: 1, length: 24, markerA: "Đầu bờ", markerB: "Phía biển" },
    ],
  };
}
function saved(result: RaftMutationResult) {
  if (result.status !== "saved")
    throw new Error(`Expected saved, got ${result.status}`);
  return result.workspace.rafts.find((r) => r.id === result.savedId)!;
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-28T08:00:00Z"));
});
afterEach(() => vi.useRealTimers());

it("creates a raft and layout together, cost stays unknown, input/snapshots cannot change the store", async () => {
  const { repo, store } = setup();
  const draft = input();
  const profile = saved(await repo.save(draft));
  expect(profile).toMatchObject({
    status: "in-use",
    materialCostVnd: null,
    latitude: 20.9,
    layouts: [{ version: 1, validFrom: "2026-10-28" }],
  });
  Reflect.set(draft.lanes[0], "length", 999);
  Reflect.set(profile.layouts[0].lanes[0], "length", 888);
  expect(
    store.snapshotRafts().find((r) => r.id === profile.id)?.layouts[0].lanes[0]
      .length,
  ).toBe(24);
});
it.each(["code", "size", "latitude", "longitude"] as const)(
  "rejects an empty required %s without creating anything",
  async (field) => {
    const { repo, store } = setup();
    expect(await repo.save({ ...input(), [field]: "" })).toMatchObject({
      status: "invalid",
      fields: expect.arrayContaining([field]),
    });
    expect(store.snapshotRafts()).toHaveLength(6);
  },
);
it.each([0, -1, NaN, Infinity, 1.234, 100000000])(
  "rejects invalid lane length %s",
  async (length) => {
    const { repo } = setup();
    const draft = input();
    expect(
      await repo.save({ ...draft, lanes: [{ ...draft.lanes[0], length }] }),
    ).toMatchObject({ status: "invalid" });
  },
);
it("rejects missing/duplicated lane numbers and out-of-range coordinates", async () => {
  const { repo } = setup();
  const draft = input();
  for (const lanes of [
    [],
    [{ ...draft.lanes[0], number: 2 }],
    [draft.lanes[0], draft.lanes[0]],
  ])
    expect(await repo.save({ ...draft, lanes })).toMatchObject({
      status: "invalid",
    });
  expect(
    await repo.save({ ...draft, latitude: "91", longitude: "181" }),
  ).toMatchObject({ status: "invalid" });
});
it("rejects duplicate code in the same zone and never overwrites the old profile", async () => {
  const { repo, store } = setup();
  expect(await repo.save({ ...input(), code: " b1-01 " })).toEqual({
    status: "duplicate",
    existingId: "raft-1-1",
  });
  expect(store.snapshotRafts()).toHaveLength(6);
});
it("edits metadata during an open cycle but blocks layout changes and discontinuation", async () => {
  const { repo, store } = setup();
  const current = store.snapshotRafts()[0];
  const next = saved(
    await repo.save({ ...input(current), conditionNotes: "Kiểm tra phao" }),
  );
  expect(next.layouts).toEqual(current.layouts);
  expect(
    await repo.save({
      ...input(next),
      lanes: [
        ...next.layouts[0].lanes,
        { number: 4, length: 10, markerA: "A", markerB: "B" },
      ],
    }),
  ).toEqual({ status: "open-cycle" });
  expect(
    await repo.changeStatus({
      id: next.id,
      recordVersion: next.recordVersion,
      status: "discontinued",
    }),
  ).toEqual({ status: "open-cycle" });
});
it("keeps the old layout when changing a closed-cycle raft and blocks removing a historical lane", async () => {
  const { repo, store } = setup();
  const current = store.snapshotRafts()[1];
  const draft = input(current);
  const next = saved(
    await repo.save({
      ...draft,
      lanes: draft.lanes.map((lane) => ({ ...lane, length: 28 })),
    }),
  );
  expect(next.layouts).toHaveLength(3);
  expect(next.layouts[1]).toMatchObject({
    validTo: "2026-10-28",
    lanes: [{ length: 26 }, { length: 26 }, { length: 26 }],
  });
  expect(next.layouts[2]).toMatchObject({
    version: 3,
    validFrom: "2026-10-28",
  });
  expect(
    await repo.save({ ...input(next), lanes: [next.layouts[2].lanes[0]] }),
  ).toEqual({ status: "lanes-in-use", laneNumbers: [2] });
});
it("requires the latest version for both edit and status; rejects moving a raft to another zone", async () => {
  const { repo, store } = setup();
  const current = store.snapshotRafts()[1];
  saved(await repo.save(input(current)));
  expect(await repo.save(input(current))).toEqual({ status: "conflict" });
  expect(
    await repo.changeStatus({
      id: current.id,
      recordVersion: current.recordVersion,
      status: "discontinued",
    }),
  ).toEqual({ status: "conflict" });
  const fresh = store.snapshotRafts().find((r) => r.id === current.id)!;
  expect(
    await repo.save({ ...input(fresh), zoneId: "zone-south" }),
  ).toMatchObject({ status: "invalid", fields: ["zoneId"] });
});
it("allows discontinue/reactivate without cycles; rechecks the live zone before create/reactivate", async () => {
  const h = setup();
  const current = h.store.snapshotRafts()[1];
  const stopped = saved(
    await h.repo.changeStatus({
      id: current.id,
      recordVersion: current.recordVersion,
      status: "discontinued",
    }),
  );
  const active = saved(
    await h.repo.changeStatus({
      id: stopped.id,
      recordVersion: stopped.recordVersion,
      status: "in-use",
    }),
  );
  expect(active.status).toBe("in-use");
  h.stopZone();
  expect(await h.repo.save(input())).toEqual({ status: "zone-unavailable" });
  const off = h.store.snapshotRafts().find((r) => r.status === "discontinued")!;
  expect(
    await h.repo.changeStatus({
      id: off.id,
      recordVersion: off.recordVersion,
      status: "in-use",
    }),
  ).toEqual({ status: "zone-unavailable" });
});
it("staff cannot write even with View in all zones; revoked access cannot publish", async () => {
  const h = setup();
  h.staff();
  expect(await h.repo.load()).toMatchObject({
    status: "loaded",
    workspace: { canWrite: false },
  });
  expect(await h.repo.save(input())).toEqual({ status: "forbidden" });
  expect(
    await h.repo.changeStatus({
      id: "raft-1-3",
      recordVersion: "x",
      status: "in-use",
    }),
  ).toEqual({ status: "forbidden" });
  h.revoke();
  expect(await h.repo.save(input())).toEqual({ status: "forbidden" });
  expect(h.store.snapshotRafts()).toHaveLength(6);
});

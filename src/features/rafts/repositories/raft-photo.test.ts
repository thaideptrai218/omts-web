import { expect, it } from "vitest";
import { createMockRaftStore } from "./mock-raft-store";
import { mockRafts } from "../mocks/raft-fixtures";
import type { RaftAccess } from "../domain/raft";

function setup() {
  let access: RaftAccess | null = {
    accountId: "owner",
    isOwner: true,
    grants: [],
  };
  const store = createMockRaftStore({
    initialRafts: mockRafts,
    latencyMs: 0,
    getZones: () => [{ id: "zone-east", label: "Vùng A", status: "in-use" }],
  });
  return {
    store,
    repo: store.forAccess(() => access),
    revoke: () => {
      access = null;
    },
  };
}
function png(name = "be.png") {
  return new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], name, {
    type: "image/png",
  });
}
it("saves a separate photo and keeps metadata/layout; a failed replacement leaves the previous file", async () => {
  const { repo, store } = setup();
  const before = store.snapshotRafts()[0];
  expect(await repo.savePhoto({ id: before.id, file: png() })).toMatchObject({
    status: "saved",
  });
  expect(store.snapshotRafts().find((r) => r.id === before.id)).toMatchObject({
    code: before.code,
    layouts: before.layouts,
    photoFileName: "be.png",
  });
  const previousFile = await repo.getPhoto(before.id);
  expect(
    await repo.savePhoto({
      id: before.id,
      file: new File(["not a photo"], "fake.png", { type: "image/png" }),
    }),
  ).toEqual({ status: "invalid-photo" });
  expect(await repo.getPhoto(before.id)).toBe(previousFile);
});
it.each([
  new File([], "empty.png", { type: "image/png" }),
  new File(["pdf"], "file.pdf", { type: "application/pdf" }),
  new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png", {
    type: "image/png",
  }),
  new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "wrong.jpg", {
    type: "image/jpeg",
  }),
])(
  "rejects an invalid photo without changing the record version",
  async (file) => {
    const { repo, store } = setup();
    const before = store.snapshotRafts()[0];
    expect(await repo.savePhoto({ id: before.id, file })).toEqual({
      status: "invalid-photo",
    });
    expect(store.snapshotRafts()[0].recordVersion).toBe(before.recordVersion);
  },
);
it("does not publish a file after authority is revoked during the asynchronous header read", async () => {
  const h = setup();
  const file = png();
  const original = file.slice.bind(file);
  file.slice = (...args) => {
    const part = original(...args);
    const read = part.arrayBuffer.bind(part);
    part.arrayBuffer = async () => {
      h.revoke();
      return read();
    };
    return part;
  };
  expect(await h.repo.savePhoto({ id: "raft-1-1", file })).toEqual({
    status: "forbidden",
  });
  expect(h.store.snapshotRafts()[0].photoFileName).toBeUndefined();
  expect(await h.repo.getPhoto("raft-1-1")).toBeNull();
});
it("does not overwrite a newer record when photo validation yields", async () => {
  const h = setup();
  const file = png();
  const original = file.slice.bind(file);
  const stopped = h.store.snapshotRafts()[2];
  file.slice = (...args) => {
    const part = original(...args);
    const read = part.arrayBuffer.bind(part);
    part.arrayBuffer = async () => {
      await h.repo.changeStatus({
        id: stopped.id,
        recordVersion: stopped.recordVersion,
        status: "in-use",
      });
      return read();
    };
    return part;
  };
  expect(await h.repo.savePhoto({ id: stopped.id, file })).toEqual({
    status: "conflict",
  });
  expect(
    h.store.snapshotRafts().find((r) => r.id === stopped.id),
  ).toMatchObject({ status: "in-use" });
});

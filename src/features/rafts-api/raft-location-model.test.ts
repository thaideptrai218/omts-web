import { expect, it } from "vitest";
import { emptyRaftDraft, raftBody, validateRaftDraft } from "./raft-model";

const valid = { ...emptyRaftDraft, code: "B01", size: "20 x 10 m" };
it("keeps a cleared raft location null without manufacturing zero coordinates", () => {
  expect(validateRaftDraft(valid)).toEqual({});
  expect(raftBody(valid)).toMatchObject({ latitude: null, longitude: null });
});
it("requires the written location only when creating, never when editing an old raft without one", () => {
  expect(validateRaftDraft(valid, undefined, { requireLocation: true })).toEqual({ location: "Nhập vị trí của bè." });
  expect(validateRaftDraft({ ...valid, location: "  " }, undefined, { requireLocation: true })).toHaveProperty("location");
  expect(validateRaftDraft({ ...valid, location: "Vịnh Vân Đồn" }, undefined, { requireLocation: true })).toEqual({});
  expect(validateRaftDraft(valid)).toEqual({});
});
it("requires a complete pair when a raft location is present", () => {
  expect(validateRaftDraft({ ...valid, latitude: "21" })).toHaveProperty("longitude");
  expect(validateRaftDraft({ ...valid, longitude: "107" })).toHaveProperty("latitude");
  expect(validateRaftDraft({ ...valid, latitude: "91", longitude: "107" })).toHaveProperty("latitude");
  expect(raftBody({ ...valid, latitude: "21.0712", longitude: "107.4321" })).toMatchObject({ latitude: 21.0712, longitude: 107.4321 });
});

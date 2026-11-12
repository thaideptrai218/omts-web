// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { RaftGeometryFields } from "./raft-geometry-fields";
import { emptyRaftDraft, raftBody, raftDraftOf, validateRaftDraft, type RaftDraft } from "./raft-model";
import { raftFixture } from "@/features/farming-api/fixtures";
import { raftGeometryRequest } from "./raft-geometry";
afterEach(cleanup);
function Form({ locked }: { locked?: string }) {
  const [draft, setDraft] = useState<RaftDraft>({ ...emptyRaftDraft, code: "B01", lengthM: "24", widthM: "10", size: "24 m x 10 m", laneCount: "2" });
  return <RaftGeometryFields draft={draft} setDraft={setDraft} laneCountLocked={locked} />;
}
it("shows live read-only area, units and a non-submitting end stepper", () => {
  render(<Form />);
  const area = screen.getByLabelText("Diện tích") as HTMLInputElement;
  expect(area.readOnly).toBe(true);
  expect(area.value).toBe("240");
  fireEvent.change(screen.getByLabelText("Độ dài dây *"), { target: { value: "20" } });
  expect(area.value).toBe("200");
  expect(screen.getByText("m²")).toBeTruthy();
  const add = screen.getByRole("button", { name: "Thêm làn cuối" });
  expect(add.getAttribute("type")).toBe("button");
  fireEvent.click(add);
  expect((screen.getByLabelText("Số làn *") as HTMLInputElement).value).toBe("3");
  expect(screen.getByRole("group", { name: "Sơ đồ làn" })).toBeTruthy();
});
it("locks both manual lane-count changes and steppers during an open cycle", () => {
  render(<Form locked="Bè có chu kỳ đang mở." />);
  expect((screen.getByLabelText("Số làn *") as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Thêm làn cuối" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Bớt làn cuối" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("Bè có chu kỳ đang mở.")).toBeTruthy();
});
it("resets an override to the raft length", () => {
  render(<Form />);
  fireEvent.click(screen.getByText("Độ dài dây từng làn"));
  fireEvent.change(screen.getByLabelText("Làn 1"), { target: { value: "12" } });
  expect((screen.getByLabelText("Làn 1") as HTMLInputElement).value).toBe("12");
  fireEvent.click(screen.getAllByRole("button", { name: "Theo bè" })[0]);
  expect((screen.getByLabelText("Làn 1") as HTMLInputElement).value).toBe("24");
});
it("bounds the preview when a pasted lane count exceeds the limit", () => {
  render(<Form />);
  fireEvent.change(screen.getByLabelText("Số làn *"), { target: { value: "10000000" } });
  expect(screen.getByRole("group", { name: "Sơ đồ làn" }).children).toHaveLength(200);
});
it("keeps overrides through intermediate lane-count keystrokes", () => {
  render(<Form />);
  fireEvent.click(screen.getByText("Độ dài dây từng làn"));
  fireEvent.change(screen.getByLabelText("Làn 2"), { target: { value: "12" } });
  fireEvent.change(screen.getByLabelText("Số làn *"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Số làn *"), { target: { value: "2" } });
  expect((screen.getByLabelText("Làn 2") as HTMLInputElement).value).toBe("12");
});
it("filters only removed tail overrides when committing and preserves physical numbers after an inactive middle", () => {
  const draft = { ...emptyRaftDraft, code: "B01", lengthM: "24", widthM: "10", laneCount: "2", laneLines: '{"3":"18","4":"16"}' };
  const lanes = [1, 2, 3, 4].map(n => ({ id: String(n), laneNumber: n, statusId: n === 2 ? 2002 : 2001, status: "InUse" }));
  expect(raftBody(draft, "v1", lanes).laneLengths).toEqual([{ laneNumber: 3, lineLengthM: 18 }]);
});
it("counts only active lanes when an old response omits laneCount", () => {
  const raft = raftFixture();
  expect(raftDraftOf({ ...raft, laneCount: undefined, lanes: [...raft.lanes, { id: "removed", laneNumber: 2, statusId: 2002, status: "Removed" }] }).laneCount).toBe(String(raft.lanes.length));
});
it("validates ranges, precision and overrides; sends legacy size and numeric geometry without client area", () => {
  const draft = { ...emptyRaftDraft, code: "B01", lengthM: "24", widthM: "10", size: "24 m x 10 m", laneCount: "2", laneLines: '{"1":"18.5"}' };
  expect(validateRaftDraft(draft)).toEqual({});
  expect(raftBody(draft, "v1")).toMatchObject({ size: "24 m x 10 m", lengthM: 24, widthM: 10, laneLengths: [{ laneNumber: 1, lineLengthM: 18.5 }], rowVersion: "v1" });
  expect(raftBody(draft)).not.toHaveProperty("areaM2");
  expect(validateRaftDraft({ ...draft, lengthM: "18" }).size).toBeTruthy();
  expect(validateRaftDraft({ ...draft, laneCount: "201" }).laneCount).toBeTruthy();
  for (const value of [{ lengthM: 501 }, { widthM: 201 }, { lengthM: 1.111 }, { laneLengths: [{ laneNumber: 1, lineLengthM: 25 }], lengthM: 24 }])
    expect(raftGeometryRequest.safeParse(value).success).toBe(false);
});

// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { raftFixture } from "@/features/farming-api/fixtures";
import type { ContextPin } from "@/features/farming-api/location-picker-model";
import { RaftFormFields } from "./raft-form-fields";
import { RaftInfoTab } from "./raft-info-tab";
import { emptyRaftDraft } from "./raft-model";

const { context, mutate } = vi.hoisted(() => ({ context: vi.fn(), mutate: vi.fn() }));
vi.mock("./use-raft-location-pins", () => ({ useRaftLocationPins: context }));
// The lane diagram needs the API workspace context; this file only covers the location fields.
vi.mock("./raft-lane-diagram", () => ({ RaftLaneDiagram: () => null }));
vi.mock("@/features/api-workspace/workspace-repository", () => ({ createWorkspaceRepository: () => ({ mutate }) }));
vi.mock("@/features/farming-api/location-picker", () => ({ LocationPicker: ({ latitude, longitude, onChange, pins }: {
  latitude: string; longitude: string; pins: ContextPin[]; onChange(value: { latitude: string; longitude: string }): void;
}) => <div role="group" aria-label="Chọn vị trí bè">
  <p>Vĩ độ {latitude} · Kinh độ {longitude}</p>{pins.map(pin => <span key={pin.id}>{pin.label}</span>)}
  <button type="button" onClick={() => onChange({ latitude: "21.0712", longitude: "107.4321" })}>Đặt ghim</button>
  <button type="button" onClick={() => onChange({ latitude: "", longitude: "" })}>Xóa vị trí</button>
</div> }));
afterEach(() => { cleanup(); context.mockReset(); mutate.mockReset(); });

it("replaces coordinate fields with a controlled picker and passes zone context", () => {
  context.mockReturnValue({ loading: false, pins: [{ id: "z1", label: "Vùng V1", kind: "zone", latitude: 21, longitude: 107 }] });
  function Editor() {
    const [draft, setDraft] = useState({ ...emptyRaftDraft });
    return <RaftFormFields draft={draft} setDraft={setDraft} errors={{}} zoneId="z1" only={["latitude", "longitude"]} />;
  }
  const { container } = render(<Editor />);
  expect(container.querySelectorAll("input")).toHaveLength(0);
  expect(context).toHaveBeenCalledWith("z1", undefined);
  expect(screen.getByText("Vùng V1")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Đặt ghim" }));
  expect(screen.getByText("Vĩ độ 21.0712 · Kinh độ 107.4321")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Xóa vị trí" }));
  expect(screen.getByText("Vĩ độ · Kinh độ")).toBeTruthy();
});

it("edits an existing raft location in place and saves the same numeric request shape", async () => {
  const raft = raftFixture(), onSaved = vi.fn();
  context.mockReturnValue({ loading: false, pins: [] });
  mutate.mockResolvedValue({ status: "success", data: { ...raft, latitude: 21.0712, longitude: 107.4321 } });
  const { container } = render(<RaftInfoTab raft={raft} zoneId={raft.zone.id} zoneLabel="Vùng 1" canEdit busy={false} dirtyRef={{ current: false }}
    onSaved={onSaved} onReload={vi.fn()} onStatus={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
  expect(context).toHaveBeenCalledWith(raft.zone.id, raft.id);
  expect(screen.getByText("Vĩ độ 21 · Kinh độ 107")).toBeTruthy();
  expect(container.querySelector("input[name='latitude'], input[name='longitude']")).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Đặt ghim" }));
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  await vi.waitFor(() => expect(mutate).toHaveBeenCalledWith("update", expect.objectContaining({ latitude: 21.0712, longitude: 107.4321, rowVersion: "AQID" }), raft.id));
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
});

// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { ContextPin } from "./location-picker-model";
import { ResourceEditorFields } from "@/features/api-workspace/api-resource-editor-fields";

const read = vi.hoisted(() => vi.fn());
vi.mock("./zone-map-repository", () => ({ readZoneMap: read }));
vi.mock("./location-picker", () => ({ LocationPicker: ({ latitude, longitude, onChange, pins, error }: {
  latitude: string; longitude: string; onChange(value: { latitude: string; longitude: string }): void; pins: ContextPin[]; error?: string;
}) => <div>
  <div tabIndex={0} aria-label="Bản đồ chọn vị trí" />
  <p>{latitude}/{longitude}</p>{error && <p role="alert">{error}</p>}
  {pins.map(pin => <span key={pin.id}>{pin.label}</span>)}
  <button type="button" onClick={() => onChange({ latitude: "21.0712", longitude: "107.4321" })}>Chọn ghim</button>
  <button type="button" onClick={() => onChange({ latitude: "", longitude: "" })}>Xóa vị trí</button>
</div> }));

afterEach(() => { cleanup(); read.mockReset(); });
function Editor({ resource, record = null }: { resource: "zones" | "rafts"; record?: { id: string; zoneId: string } | null }) {
  const [values, setValues] = useState<Record<string, string>>({ latitude: "", longitude: "" });
  return <form data-testid="editor"><ResourceEditorFields resource={resource} record={record} values={values} setValues={setValues}
    lockedField={() => false} seedUnit={null} zones={[]} workingZoneIds={[]} setWorkingZoneIds={() => {}}
    bank={{}} setBank={() => {}} laneCount="1" setLaneCount={() => {}} /></form>;
}

it("replaces zone coordinate controls and preserves required map selection", () => {
  render(<Editor resource="zones" />);
  expect(screen.queryByLabelText("Vĩ độ")).toBeNull();
  expect(screen.queryByLabelText("Kinh độ")).toBeNull();
  const selection = screen.getByLabelText("Vị trí vùng nuôi") as HTMLInputElement;
  expect(selection.checkValidity()).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Chọn ghim" }));
  expect(screen.getByText("21.0712/107.4321")).toBeTruthy();
  expect(selection.checkValidity()).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Xóa vị trí" }));
  expect(selection.checkValidity()).toBe(false);
});

it("leaves raft location optional and shows its zone and sibling rafts only", async () => {
  read.mockResolvedValue({ status: "success", data: [{ id: "z1", code: "V1", latitude: 21, longitude: 107,
    rafts: [{ id: "r1", code: "B1", latitude: 21.1, longitude: 107.1 }, { id: "r2", code: "B2", latitude: 21.2, longitude: 107.2 }] },
  { id: "z2", code: "V2", latitude: 22, longitude: 108, rafts: [] }] });
  render(<Editor resource="rafts" record={{ id: "r1", zoneId: "z1" }} />);
  expect(await screen.findByText("Vùng V1")).toBeTruthy();
  expect(screen.getByText("Bè B2")).toBeTruthy();
  expect(screen.queryByText("Bè B1")).toBeNull();
  expect(screen.queryByText("Vùng V2")).toBeNull();
  expect(screen.queryByLabelText("Vĩ độ")).toBeNull();
  expect(screen.queryByLabelText("Vị trí vùng nuôi")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Chọn ghim" }));
  expect(screen.getByText("21.0712/107.4321")).toBeTruthy();
});

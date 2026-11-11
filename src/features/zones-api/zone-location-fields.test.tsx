// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ZoneFormFields } from "./zone-form-fields";
import { ZoneInfoTab } from "./zone-info-tab";
import { emptyZoneDraft, type ZoneDetail } from "./zone-model";

const mutate = vi.hoisted(() => vi.fn());
vi.mock("@/features/api-workspace/workspace-repository", () => ({ createWorkspaceRepository: () => ({ mutate }) }));
vi.mock("@/features/farming-api/location-picker", () => ({ LocationPicker: ({ latitude, longitude, onChange, error }: {
  latitude: string; longitude: string; error?: string; onChange(value: { latitude: string; longitude: string }): void;
}) => <div role="group" aria-label="Chọn vị trí vùng">
  <p>Vĩ độ {latitude} · Kinh độ {longitude}</p>{error && <p role="alert">{error}</p>}
  <button type="button" onClick={() => onChange({ latitude: "21.0712", longitude: "107.4321" })}>Đặt ghim</button>
</div> }));
afterEach(() => { cleanup(); mutate.mockReset(); });

it("uses the map for coordinate fields and keeps both draft values synchronized", () => {
  function Editor() {
    const [draft, setDraft] = useState({ ...emptyZoneDraft });
    return <ZoneFormFields draft={draft} setDraft={setDraft} errors={{}} only={["latitude", "longitude"]} />;
  }
  const { container } = render(<Editor />);
  expect(container.querySelectorAll("input")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Đặt ghim" }));
  expect(screen.getByText("Vĩ độ 21.0712 · Kinh độ 107.4321")).toBeTruthy();
});

it("opens the picker in the existing info tab and saves numeric coordinates in place", async () => {
  const zone: ZoneDetail = { id: "5a92b32d-2901-4560-9237-350be750cb10", code: "V01", name: "Vùng 1", location: "Cô Tô", area: 10,
    latitude: 21, longitude: 107, statusId: 101, status: "In Use", rowVersion: "AQID", licenseState: "Missing", inUseRaftCount: 0 };
  const onSaved = vi.fn(), dirtyRef = { current: false };
  mutate.mockResolvedValue({ status: "success", data: { ...zone, latitude: 21.0712, longitude: 107.4321 } });
  const { container } = render(<ZoneInfoTab zone={zone} canEdit canSeeLicense={false} busy={false} dirtyRef={dirtyRef}
    onSaved={onSaved} onReload={vi.fn()} onStatus={vi.fn()} />);
  expect(screen.queryByRole("group", { name: "Chọn vị trí vùng" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
  expect(screen.getByText("Vĩ độ 21 · Kinh độ 107")).toBeTruthy();
  expect(container.querySelector("input[name='latitude'], input[name='longitude']")).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Đặt ghim" }));
  expect(dirtyRef.current).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  await vi.waitFor(() => expect(mutate).toHaveBeenCalledWith("update", expect.objectContaining({ latitude: 21.0712, longitude: 107.4321, rowVersion: "AQID" }), zone.id));
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(screen.queryByRole("group", { name: "Chọn vị trí vùng" })).toBeNull();
});

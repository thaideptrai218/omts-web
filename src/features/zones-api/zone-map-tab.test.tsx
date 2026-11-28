// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { MapZone } from "@/features/farming-api/zone-map-contract";

const state = vi.hoisted(() => ({ readZoneMap: vi.fn(), shown: [] as unknown[][] }));
vi.mock("@/features/farming-api/zone-map-repository", () => ({ readZoneMap: state.readZoneMap }));
vi.mock("next/dynamic", () => ({ default: () => ({ zones }: { zones: unknown[] }) => { state.shown.push(zones); return <div>Bản đồ giả</div>; } }));
import { ZoneMapTab } from "./zone-map-tab";

const ZONE = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63", OTHER = "529ec3ce-af8f-42f7-a08f-4bab36ba7e64";
const square = (lon: number, lat: number) => ({ type: "FeatureCollection" as const, features: [{ type: "Feature" as const, properties: { name: "Khu 1" },
  geometry: { type: "Polygon" as const, coordinates: [[[lon, lat], [lon + 0.01, lat], [lon + 0.01, lat + 0.01], [lon, lat + 0.01], [lon, lat]] as [number, number][]] as [[number, number][]] } }] });
const row = (over: Partial<MapZone>): MapZone => ({ id: ZONE, code: "V01", name: "Vùng 1", latitude: 21.005, longitude: 107.455, statusId: 101, status: "In Use", boundary: null, rafts: [], ...over });
const zone = (statusId = 101) => ({ id: ZONE, code: "V01", name: "Vùng 1", statusId } as never);
const lastZones = () => state.shown.at(-1) as MapZone[];

beforeEach(() => { state.shown = []; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("reads the zone map once, keeps only this zone and drops the pin of a zone that has a boundary", async () => {
  state.readZoneMap.mockResolvedValue({ status: "success", data: [row({ id: OTHER, code: "V02" }), row({ boundary: square(107.45, 21), rafts: [
    { id: OTHER, code: "B01", latitude: 21.005, longitude: 107.455 }, { id: ZONE, code: "B02", latitude: 21.005, longitude: 107.5 }, { id: ZONE, code: "B03", latitude: null, longitude: null }] })] });
  render(<ZoneMapTab zone={zone()} canSeeRafts onOpenRaft={vi.fn()} />);
  await screen.findByText("Bản đồ giả");
  expect(state.readZoneMap).toHaveBeenCalledTimes(1);
  expect(state.readZoneMap).toHaveBeenCalledWith(false, expect.anything());
  expect(lastZones()).toHaveLength(1);
  expect(lastZones()[0]).toMatchObject({ id: ZONE, latitude: null, longitude: null });
  expect(lastZones()[0].boundary?.features).toHaveLength(1);
  expect(screen.getByText("Vùng V01: ranh giới theo sơ đồ cấp phép · 2/3 bè có tọa độ · 1 bè ngoài ranh giới")).toBeTruthy();
});

it("keeps the zone marker only when there is no boundary but a legacy pin", async () => {
  state.readZoneMap.mockResolvedValue({ status: "success", data: [row({})] });
  render(<ZoneMapTab zone={zone()} canSeeRafts onOpenRaft={vi.fn()} />);
  await screen.findByText("Bản đồ giả");
  expect(lastZones()[0]).toMatchObject({ latitude: 21.005, longitude: 107.455, boundary: null });
  expect(screen.getByText("Vùng V01: 21.005, 107.455 · 0/0 bè có tọa độ")).toBeTruthy();
});

it("shows nothing to draw for a zone without boundary, pin or raft position, and hides rafts from an account that may not see them", async () => {
  state.readZoneMap.mockResolvedValue({ status: "success", data: [row({ latitude: null, longitude: null, rafts: [{ id: OTHER, code: "B01", latitude: 21, longitude: 107 }] })] });
  const view = render(<ZoneMapTab zone={zone()} canSeeRafts={false} onOpenRaft={vi.fn()} />);
  await screen.findByText(/chưa có ranh giới hoặc tọa độ/);
  expect(lastZones()).toEqual([]);
  expect(screen.queryByText(/bè có tọa độ/)).toBeNull();
  view.unmount();
});

it("asks for discontinued zones too when the open zone is discontinued", async () => {
  state.readZoneMap.mockResolvedValue({ status: "success", data: [row({ statusId: 102 })] });
  render(<ZoneMapTab zone={zone(102)} canSeeRafts onOpenRaft={vi.fn()} />);
  await waitFor(() => expect(state.readZoneMap).toHaveBeenCalledWith(true, expect.anything()));
});

it("offers a retry when the map read fails", async () => {
  state.readZoneMap.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false });
  render(<ZoneMapTab zone={zone()} canSeeRafts onOpenRaft={vi.fn()} />);
  expect(await screen.findByRole("button", { name: "Tải lại" })).toBeTruthy();
});

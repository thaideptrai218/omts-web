// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const map = vi.hoisted(() => ({ readZoneMap: vi.fn() }));
vi.mock("@/features/farming-api/zone-map-repository", () => map);
import { useRaftLocationPins } from "./use-raft-location-pins";

const ZONE = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63", OTHER = "529ec3ce-af8f-42f7-a08f-4bab36ba7e64", SELF = "529ec3ce-af8f-42f7-a08f-4bab36ba7e65", SIBLING = "529ec3ce-af8f-42f7-a08f-4bab36ba7e66";
const boundary = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[107.43, 21.07], [107.4325, 21.07], [107.4325, 21.0715], [107.43, 21.07]]] } }] };
const zone = (id: string, over: object = {}) => ({ id, code: id === ZONE ? "V01" : "V02", name: "Vùng", latitude: 21.07, longitude: 107.43, statusId: 101, status: "In Use", boundary: null, rafts: [], ...over });
function Probe({ selfId }: { selfId?: string }) {
  const { pins, boundary: area, loading } = useRaftLocationPins(ZONE, selfId);
  return <p>{loading ? "đang tải" : `pins:${pins.map(pin => pin.label).join("|")} area:${area ? area.features.length : "none"}`}</p>;
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("takes the zone pin, its other rafts and its boundary from one map read", async () => {
  map.readZoneMap.mockResolvedValue({ status: "success", data: [zone(OTHER, { boundary, rafts: [{ id: SIBLING, code: "X1", latitude: 21, longitude: 107 }] }), zone(ZONE, { boundary, rafts: [
    { id: SELF, code: "B01", latitude: 21.0705, longitude: 107.431 }, { id: SIBLING, code: "B02", latitude: 21.0706, longitude: 107.4311 }, { id: ZONE, code: "B03", latitude: null, longitude: null }] })] });
  render(<Probe selfId={SELF} />);
  expect(await screen.findByText("pins:Vùng V01|Bè B02 area:1")).toBeTruthy();
  expect(map.readZoneMap).toHaveBeenCalledTimes(1);
});

it("works without pins or boundary when the zone is not in the answer or the read fails", async () => {
  map.readZoneMap.mockResolvedValue({ status: "success", data: [zone(OTHER, { boundary })] });
  const view = render(<Probe />);
  expect(await screen.findByText("pins: area:none")).toBeTruthy();
  view.unmount();
  map.readZoneMap.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false });
  render(<Probe />);
  expect(await screen.findByText("pins: area:none")).toBeTruthy();
});

// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const map = vi.hoisted(() => ({ readZoneMap: vi.fn(), shown: [] as unknown[][] }));
vi.mock("next/dynamic", () => ({ default: () => ({ zones }: { zones: unknown[] }) => { map.shown.push(zones); return null; } }));
vi.mock("./zone-map-repository", () => map);
import { GlobalZoneMap } from "./global-zone-map";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const ok = { status: "success", data: [] };

it("never reads or offers discontinued zones outside the Vùng nuôi screen", async () => {
  map.readZoneMap.mockResolvedValue(ok);
  render(<GlobalZoneMap />);
  await waitFor(() => expect(map.readZoneMap).toHaveBeenCalledWith(false, expect.anything()));
  expect(screen.queryByLabelText(/Bao gồm vùng ngừng dùng/)).toBeNull();
});

it("lets the Vùng nuôi screen include discontinued zones", async () => {
  map.readZoneMap.mockResolvedValue(ok);
  render(<GlobalZoneMap allowDiscontinued />);
  await waitFor(() => expect(map.readZoneMap).toHaveBeenCalledWith(false, expect.anything()));
  fireEvent.click(screen.getByLabelText(/Bao gồm vùng ngừng dùng/));
  await waitFor(() => expect(map.readZoneMap).toHaveBeenLastCalledWith(true, expect.anything()));
});

it("hands the map the boundary of every zone, so each zone is drawn with its polygons", async () => {
  const boundary = { type: "FeatureCollection", features: [] };
  const zone = (id: string, code: string, withBoundary: boolean) => ({ id, code, name: code, latitude: 21, longitude: 107, statusId: 101, status: "In Use", boundary: withBoundary ? boundary : null, rafts: [] });
  map.readZoneMap.mockResolvedValue({ status: "success", data: [zone("a", "V01", true), zone("b", "V02", false), zone("c", "V03", true)] });
  render(<GlobalZoneMap />);
  await waitFor(() => expect(map.shown.length).toBeGreaterThan(0));
  expect((map.shown.at(-1) as { boundary: unknown }[]).map(row => row.boundary !== null)).toEqual([true, false, true]);
});

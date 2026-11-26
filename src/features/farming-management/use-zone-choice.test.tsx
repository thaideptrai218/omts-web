// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const state = vi.hoisted(() => ({ query: "", loadOptions: vi.fn(), readZoneDetail: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.query) }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: state.loadOptions }));
vi.mock("@/features/zones-api/zone-model", async original => ({ ...(await original<typeof import("@/features/zones-api/zone-model")>()), readZoneDetail: state.readZoneDetail }));
import { useZoneChoice, zoneOptionLabel } from "./use-zone-choice";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const zone = (n: number, statusId: number) => ({ id: id(n), code: `V0${n}`, name: `Vùng ${n}`, location: null, area: null, statusId, status: statusId === 101 ? "In Use" : "Discontinued", inUseRaftCount: 0, licenseState: null });

beforeEach(() => {
  state.query = "";
  state.loadOptions.mockResolvedValue({ status: "success", data: [zone(1, 101), zone(3, 101)] });
  state.readZoneDetail.mockResolvedValue({ status: "success", data: { ...zone(2, 102), latitude: null, longitude: null, rowVersion: "AQ==" } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("offers In Use zones only for manual choice, without reading any other zone", async () => {
  const { result } = renderHook(() => useZoneChoice());
  await waitFor(() => expect(result.current.zones.length).toBe(2));
  expect(state.loadOptions).toHaveBeenCalledWith("zones", expect.anything(), { statusId: "101" });
  expect(result.current.zones.map(row => row.code)).toEqual(["V01", "V03"]);
  expect(result.current.zoneId).toBe(id(1));
  expect(result.current.readOnly).toBe(false);
  expect(state.readZoneDetail).not.toHaveBeenCalled();
});

it("opens the discontinued zone a link names, as one extra read-only option, instead of switching zones", async () => {
  state.query = `zoneId=${id(2)}`;
  const { result } = renderHook(() => useZoneChoice());
  await waitFor(() => expect(result.current.zones.length).toBe(3));
  expect(state.readZoneDetail).toHaveBeenCalledWith(id(2), expect.anything());
  expect(result.current.zones.map(row => row.code)).toEqual(["V01", "V03", "V02"]);
  expect(result.current.zoneId).toBe(id(2));
  expect(result.current.readOnly).toBe(true);
  expect(result.current.remote.data).toBeTruthy();
  expect(zoneOptionLabel(result.current.zones[2])).toBe("V02 · Vùng 2 (ngừng sử dụng)");
  expect(zoneOptionLabel(result.current.zones[0])).toBe("V01 · Vùng 1");
});

it("opens the discontinued zone of a linked record chosen after the zones loaded, and leaves it for a manual In Use choice", async () => {
  const { result } = renderHook(() => useZoneChoice());
  await waitFor(() => expect(result.current.zones.length).toBe(2));
  act(() => result.current.setChoice(id(2)));
  await waitFor(() => expect(result.current.zoneId).toBe(id(2)));
  expect(result.current.readOnly).toBe(true);
  act(() => result.current.setChoice(id(3)));
  await waitFor(() => expect(result.current.zoneId).toBe(id(3)));
  expect(result.current.readOnly).toBe(false);
  expect(result.current.zones.map(row => row.code)).toEqual(["V01", "V03"]);
});

it("does not wait on a zone read for a link to an In Use zone", async () => {
  state.query = `zoneId=${id(3)}`;
  const { result } = renderHook(() => useZoneChoice());
  await waitFor(() => expect(result.current.zoneId).toBe(id(3)));
  expect(state.readZoneDetail).not.toHaveBeenCalled();
  expect(result.current.readOnly).toBe(false);
});

it("falls back to the first In Use zone only when the linked zone cannot be read at all", async () => {
  state.query = `zoneId=${id(2)}`;
  state.readZoneDetail.mockResolvedValue({ status: "error", httpStatus: 404, uncertain: false });
  const { result } = renderHook(() => useZoneChoice());
  await waitFor(() => expect(result.current.remote.data).toBeTruthy());
  expect(result.current.zoneId).toBe(id(1));
  expect(result.current.zones.map(row => row.code)).toEqual(["V01", "V03"]);
});

it("does not add a linked discontinued zone the screen does not allow", async () => {
  state.query = `zoneId=${id(2)}`;
  const { result } = renderHook(() => useZoneChoice(row => row.id !== id(2)));
  await waitFor(() => expect(result.current.remote.data).toBeTruthy());
  expect(result.current.zones.map(row => row.code)).toEqual(["V01", "V03"]);
  expect(result.current.zoneId).toBe(id(1));
});

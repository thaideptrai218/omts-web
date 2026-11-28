// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const state = vi.hoisted(() => ({ params: "", list: vi.fn(), zoneDetail: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.params) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
// Full list rows: the screen reads the zones through the zone contract as well as the header.
vi.mock("@/features/zones-api/in-use-zones", async () => {
  const { headerZones } = await import("@/test/header-zone-rows");
  return { loadInUseZones: async () => ({ status: "success", data: headerZones.map(zone => ({ ...zone, location: null, area: null, inUseRaftCount: 1, licenseState: null })) }) };
});
vi.mock("@/features/zones-api/zone-model", async original => ({ ...(await original<typeof import("@/features/zones-api/zone-model")>()), readZoneDetail: state.zoneDetail }));
vi.mock("./service", async original => ({ ...(await original<typeof import("./service")>()), nurseryService: { list: state.list } }));
vi.mock("./nursery-start-dialog", () => ({ NurseryStartDialog: ({ initialZone, zones }: { initialZone: string; zones: { id: string }[] }) => <div role="dialog" data-initial-zone={initialZone} data-zones={zones.map(zone => zone.id).join(",")} /> }));
vi.mock("./nursery-detail-panel", () => ({ NurseryDetailPanel: () => null }));
import { NurseryScreen } from "./nursery-screen";
import { HeaderZones, chooseHeaderZones, headerZoneIds, headerZones } from "@/test/header-zones";

const discontinued = "00000000-0000-4000-8000-000000000009";
const row = (zone: number) => ({ id: `00000000-0000-4000-8000-00000000010${zone}`, code: `NU0${zone}`, zoneId: headerZoneIds[zone - 1], zoneCode: headerZones[zone - 1].code, zoneName: headerZones[zone - 1].name, quantityIn: 1000, seedLotCode: "PN1-1", itemName: "Giống hàu",
  startDate: "2026-11-01", daysNursing: 12, statusId: 4001, status: "Nursing", survivors: null, lossPieces: null, lossPercent: null, seeded: 0, remaining: 0, closedOn: null, closeLossPieces: null, rowVersion: "v" });
const answer = (...zones: number[]) => ({ status: "success", data: { items: zones.map(row), page: 1, pageSize: 10, total: zones.length } });
const show = () => render(<ToastProvider><HeaderZones><NurseryScreen /></HeaderZones></ToastProvider>);
const last = () => state.list.mock.calls.at(-1)![0] as Record<string, string>;
const zoneRail = () => screen.getByLabelText("Vùng ươm") as HTMLSelectElement;
const stored = () => JSON.parse(localStorage.getItem("omts.selected-zones.v1.header-zones-test") ?? "null");

beforeEach(() => {
  chooseHeaderZones([]); state.params = "";
  state.list.mockResolvedValue(answer(1, 2, 3));
  state.zoneDetail.mockResolvedValue({ status: "success", data: { ...headerZones[0], id: discontinued, code: "Z9", name: "Vùng cũ", statusId: 102, status: "Discontinued", location: null, area: null, inUseRaftCount: 0, licenseState: null, latitude: null, longitude: null, rowVersion: "v" } });
});
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });

// The header zone chip is the zone filter of the list: the rail shows what the header holds and writes back to it.
describe("nursery screen and the header zones", () => {
  it("lists the batches of every header zone together, naming the zone on each row", async () => {
    show();
    await screen.findByText("NU03");
    expect(last().zoneIds).toBeUndefined();
    expect(last().zoneId).toBeUndefined();
    expect(screen.getByRole("columnheader", { name: "Vùng ươm" })).toBeTruthy();
    // The row names its zone (the same text is also a rail option).
    expect(screen.getAllByText("Z3 · Quan Lạn").some(element => element.closest("td"))).toBe(true);
    expect(zoneRail().selectedOptions[0].textContent).toBe("Tất cả vùng nuôi");
  });
  it("sends a header subset as one comma list and keeps the zone column for it", async () => {
    chooseHeaderZones([headerZoneIds[0], headerZoneIds[2]]);
    state.list.mockResolvedValue(answer(1, 3));
    show();
    await waitFor(() => expect(last().zoneIds).toBe(`${headerZoneIds[0]},${headerZoneIds[2]}`));
    await screen.findByText("NU03");
    expect(zoneRail().selectedOptions[0].textContent).toBe("2 vùng đã chọn");
    expect(screen.getByRole("columnheader", { name: "Vùng ươm" })).toBeTruthy();
  });
  it("narrows the header when one zone is picked: the list asks for that zone alone, from page 1, without a zone column", async () => {
    show();
    await screen.findByText("NU03");
    state.list.mockResolvedValue(answer(2));
    fireEvent.change(zoneRail(), { target: { value: headerZoneIds[1] } });
    await waitFor(() => expect(last()).toMatchObject({ zoneIds: headerZoneIds[1], page: "1" }));
    expect(stored()).toEqual({ kind: "ids", ids: [headerZoneIds[1]] });
    await waitFor(() => expect(screen.queryByRole("columnheader", { name: "Vùng ươm" })).toBeNull());
    fireEvent.change(zoneRail(), { target: { value: "" } });
    await waitFor(() => expect(last().zoneIds).toBeUndefined());
    expect(stored()).toEqual({ kind: "all" });
  });
  it("starts a nursery in the one chosen zone, or in the first zone while several are chosen", async () => {
    show();
    await screen.findByText("NU03");
    fireEvent.click(screen.getByRole("button", { name: "+ Bắt đầu ươm" }));
    expect((await screen.findByRole("dialog")).getAttribute("data-initial-zone")).toBe(headerZoneIds[0]);
    cleanup();
    chooseHeaderZones([headerZoneIds[1]]);
    show();
    await screen.findByText("NU03");
    fireEvent.click(screen.getByRole("button", { name: "+ Bắt đầu ươm" }));
    expect((await screen.findByRole("dialog")).getAttribute("data-initial-zone")).toBe(headerZoneIds[1]);
  });
  it("opens on the zone of a link by narrowing the header to it before the first read", async () => {
    state.params = new URLSearchParams({ zoneId: headerZoneIds[2] }).toString();
    show();
    await screen.findByText("NU03");
    expect(state.list.mock.calls.map(call => call[0].zoneIds ?? call[0].zoneId)).toEqual([headerZoneIds[2]]);
    expect(stored()).toEqual({ kind: "ids", ids: [headerZoneIds[2]] });
  });
  it("keeps a link to a discontinued zone read-only on that zone alone, until the rail or the header picks another selection", async () => {
    state.params = new URLSearchParams({ zoneId: discontinued }).toString();
    state.list.mockResolvedValue(answer(1));
    show();
    await waitFor(() => expect(last().zoneId).toBe(discontinued));
    expect(last().zoneIds).toBeUndefined();
    expect(zoneRail().selectedOptions[0].textContent).toBe("Z9 · Vùng cũ (ngừng sử dụng)");
    expect(screen.queryByRole("button", { name: "+ Bắt đầu ươm" })).toBeNull();
    fireEvent.change(zoneRail(), { target: { value: headerZoneIds[0] } });
    await waitFor(() => expect(last()).toMatchObject({ zoneIds: headerZoneIds[0] }));
    expect(last().zoneId).toBeUndefined();
    expect(zoneRail().selectedOptions[0].textContent).toBe("Z1 · Ngọc Vừng");
    expect(screen.getByRole("button", { name: "+ Bắt đầu ươm" })).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const state = vi.hoisted(() => ({ params: "", rafts: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.params) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
// Full list rows: the raft screen reads the zones through the zone contract as well as the header.
vi.mock("@/features/zones-api/in-use-zones", async () => {
  const { headerZones } = await import("@/test/header-zone-rows");
  return { loadInUseZones: async () => ({ status: "success", data: headerZones.map(zone => ({ ...zone, location: null, area: null, inUseRaftCount: 1, licenseState: null })) }) };
});
// One raft per zone, coded after its zone so a list says which zones were read.
vi.mock("@/features/operations/lookups", async () => {
  const { headerZones } = await import("@/test/header-zone-rows");
  return { loadOptions: async (kind: string, _signal: AbortSignal, query?: { zoneId?: string }) => {
    if (kind === "zones") return { status: "success", data: headerZones };
    state.rafts(query?.zoneId);
    const zone = headerZones.find(item => item.id === query?.zoneId);
    return { status: "success", data: zone ? [{ id: `00000000-0000-4000-8000-0000000000${zone.code.slice(1)}0`, code: `B-${zone.code}`, statusId: 101, status: "In Use", laneCount: 4 }] : [] };
  } };
});
vi.mock("./raft-detail-panel", () => ({ RaftDetailPanel: () => null }));
vi.mock("@/features/cycles-api/repository", () => ({ readCycles: vi.fn() }));
import { RaftScreen } from "./raft-screen";
import { HeaderZones, chooseHeaderZones, headerZoneIds } from "@/test/header-zones";

const headerStored = () => JSON.parse(localStorage.getItem("omts.selected-zones.v1.header-zones-test") ?? "null");
const zoneRail = () => screen.getByLabelText("Vùng nuôi") as HTMLSelectElement;
const show = () => render(<ToastProvider><HeaderZones><RaftScreen /></HeaderZones></ToastProvider>);
const readZones = () => [...new Set(state.rafts.mock.calls.map(call => call[0] as string))].sort();

beforeEach(() => { chooseHeaderZones([]); state.params = ""; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

// The header chip is the only place that holds the zone choice: the screen lists what the header says and the rail writes back to it.
describe("raft screen and the header zones", () => {
  it("lists the rafts of every header zone together, with a zone column, and cannot add a raft until one zone is chosen", async () => {
    show();
    await screen.findByText("B-Z3");
    expect(readZones()).toEqual([...headerZoneIds]);
    expect(screen.getByRole("columnheader", { name: "Vùng nuôi" })).toBeTruthy();
    expect(zoneRail().selectedOptions[0].textContent).toBe("Tất cả vùng nuôi");
    expect(screen.queryByRole("button", { name: /Thêm bè nuôi/ })).toBeNull();
  });
  it("narrows the header when a zone is picked in the rail, and then lists only that zone", async () => {
    show();
    await screen.findByText("B-Z3");
    state.rafts.mockClear();
    fireEvent.change(zoneRail(), { target: { value: headerZoneIds[1] } });
    await waitFor(() => expect(screen.queryByText("B-Z3")).toBeNull());
    expect(screen.getByText("B-Z2")).toBeTruthy();
    expect(headerStored()).toEqual({ kind: "ids", ids: [headerZoneIds[1]] });
    expect(readZones()).toEqual([headerZoneIds[1]]);
    expect(screen.queryByRole("columnheader", { name: "Vùng nuôi" })).toBeNull();
    expect(screen.getByRole("button", { name: /Thêm bè nuôi/ })).toBeTruthy();
    fireEvent.change(zoneRail(), { target: { value: "" } });
    await screen.findByText("B-Z3");
    expect(headerStored()).toEqual({ kind: "all" });
  });
  it("lists exactly the zones of a header subset and names the subset in the rail", async () => {
    chooseHeaderZones([headerZoneIds[0], headerZoneIds[2]]);
    show();
    await screen.findByText("B-Z3");
    expect(screen.getByText("B-Z1")).toBeTruthy();
    expect(screen.queryByText("B-Z2")).toBeNull();
    expect(readZones()).toEqual([headerZoneIds[0], headerZoneIds[2]]);
    expect(within(zoneRail()).getByRole("option", { name: "2 vùng đã chọn" })).toBeTruthy();
    expect(zoneRail().selectedOptions[0].textContent).toBe("2 vùng đã chọn");
  });
  it("opens on the zone of a link by narrowing the header to it, without first listing the other zones", async () => {
    state.params = new URLSearchParams({ zoneId: headerZoneIds[2] }).toString();
    show();
    await screen.findByText("B-Z3");
    expect(readZones()).toEqual([headerZoneIds[2]]);
    expect(headerStored()).toEqual({ kind: "ids", ids: [headerZoneIds[2]] });
  });
});

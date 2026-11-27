// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner", username: "chu" }, permissions: { functionPermissions: [] } }) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), planRepository: { list: state.list } }));
vi.mock("@/features/zones-api/in-use-zones", async () => (await import("@/test/header-zone-rows")).inUseZonesMock);
import { PlansScreen } from "./plans-screen";
import { HeaderZones, chooseHeaderZones, headerZoneIds } from "@/test/header-zones";

const show = () => render(<HeaderZones><PlansScreen /></HeaderZones>);
const last = () => state.list.mock.calls.at(-1)![0] as Record<string, string>;
beforeEach(() => { chooseHeaderZones([]); state.list.mockResolvedValue({ status: "success", data: { items: [], page: 1, pageSize: 10, total: 0 } }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

// The zone filter of the plan list is the header zone chip: the rail shows what the header holds and writing it narrows the header.
it("sends no zone while the header holds every zone, and one comma list for a subset", async () => {
  chooseHeaderZones([headerZoneIds[0], headerZoneIds[1]]);
  show();
  await waitFor(() => expect(last().zoneIds).toBe(`${headerZoneIds[0]},${headerZoneIds[1]}`));
  expect((screen.getByLabelText("Vùng") as HTMLSelectElement).selectedOptions[0].textContent).toBe("2 vùng đã chọn");
  expect(last().zoneId).toBeUndefined();
});

it("narrows the header when a zone is picked and widens it again with all zones, starting from the first page", async () => {
  show();
  await waitFor(() => expect(state.list).toHaveBeenCalled());
  expect(last().zoneIds).toBeUndefined();
  fireEvent.change(screen.getByLabelText("Vùng"), { target: { value: headerZoneIds[2] } });
  await waitFor(() => expect(last()).toMatchObject({ zoneIds: headerZoneIds[2], page: "1" }));
  expect(JSON.parse(localStorage.getItem("omts.selected-zones.v1.header-zones-test")!)).toEqual({ kind: "ids", ids: [headerZoneIds[2]] });
  fireEvent.change(screen.getByLabelText("Vùng"), { target: { value: "" } });
  await waitFor(() => expect(last().zoneIds).toBeUndefined());
  expect(JSON.parse(localStorage.getItem("omts.selected-zones.v1.header-zones-test")!)).toEqual({ kind: "all" });
});

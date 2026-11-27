// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const state = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: state.read }) }));
vi.mock("./lookups", async () => {
  const { headerZones } = await import("@/test/header-zone-rows");
  return { loadOptions: vi.fn(async () => ({ status: "success", data: headerZones })) };
});
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
import { WaterScreen } from "./water-screen";
import { HeaderZones, chooseHeaderZones, headerZoneIds } from "@/test/header-zones";

const thresholds = { phMin: null, phMax: null, salinityMin: null, salinityMax: null, temperatureMin: null, temperatureMax: null };
const answerFor = (action: string, query: { zoneId?: string }) => action === "chart" ? { status: "success", data: { zoneId: query.zoneId, from: "2025-11-27", to: "2026-11-27", thresholds, points: [] } }
  : action === "thresholds" ? { status: "success", data: { zoneId: query.zoneId, zoneCode: "Z", zoneName: "Vùng", zoneStatus: "In Use", thresholds } }
  : { status: "success", data: { items: [], total: 0, page: 1, pageSize: 100 } };
beforeEach(() => { chooseHeaderZones([]); state.read.mockImplementation(async (action: string, query: { zoneId?: string }) => answerFor(action, query)); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

// Water quality is read zone by zone, so its zone select offers the header zones only and a pick narrows the header to that zone.
it("offers only the zones the header chose and narrows the header when a zone is picked", async () => {
  chooseHeaderZones([headerZoneIds[0], headerZoneIds[1]]);
  render(<ToastProvider><HeaderZones><WaterScreen /></HeaderZones></ToastProvider>);
  const select = await screen.findByRole("combobox", { name: "Vùng nuôi" }) as HTMLSelectElement;
  await waitFor(() => expect([...select.options].map(option => option.textContent)).toEqual(["Ngọc Vừng", "Minh Châu"]));
  expect(select.value).toBe(headerZoneIds[0]);
  fireEvent.change(select, { target: { value: headerZoneIds[1] } });
  await waitFor(() => expect(state.read).toHaveBeenCalledWith("list", expect.objectContaining({ zoneId: headerZoneIds[1] }), expect.anything(), expect.anything()));
  expect(JSON.parse(localStorage.getItem("omts.selected-zones.v1.header-zones-test")!)).toEqual({ kind: "ids", ids: [headerZoneIds[1]] });
  expect([...select.options].map(option => option.textContent)).toEqual(["Minh Châu"]);
  expect(select.value).toBe(headerZoneIds[1]);
});

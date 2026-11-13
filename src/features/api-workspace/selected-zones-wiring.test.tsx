// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render as baseRender, screen, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";
const state = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "Staff" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./workspace-repository", () => ({ createWorkspaceRepository: (resource: string) => ({ list: (query: unknown) => state.list(resource, query) }) }));
import { ApiResourceScreen } from "./api-resource-screen";
import { SelectedZonesProvider } from "./selected-zones";
const render = (ui: import("react").ReactElement) => baseRender(<ToastProvider>{ui}</ToastProvider>);

const zoneId = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const zones = ["Ngọc Vừng", "Minh Châu", "Quan Lạn"].map((name, index) => ({ id: zoneId(index + 1), code: `Z${index + 1}`, name, location: null, area: null, statusId: 101, status: "In Use", inUseRaftCount: 0, licenseState: null }));
beforeEach(() => {
  localStorage.clear();
  state.list.mockImplementation(async (resource: string) => ({ status: "success", data: { items: resource === "zones" ? zones : [], page: 1, pageSize: 100, total: resource === "zones" ? zones.length : 0 } }));
});
afterEach(() => cleanup());

it("restricts the raft screen's zone select to the header selection and starts on the first selected zone", async () => {
  localStorage.setItem("omts.selected-zones.v1.acc-1", JSON.stringify({ kind: "ids", ids: [zoneId(2), zoneId(3)] }));
  render(<SelectedZonesProvider accountId="acc-1" enabled><ApiResourceScreen resource="rafts" /></SelectedZonesProvider>);
  await screen.findByRole("option", { name: "Z2 · Minh Châu" });
  expect(screen.queryByRole("option", { name: "Z1 · Ngọc Vừng" })).toBeNull();
  expect(screen.getByRole("option", { name: "Z3 · Quan Lạn" })).toBeTruthy();
  expect((screen.getByRole("combobox", { name: "Vùng nuôi" }) as HTMLSelectElement).value).toBe(zoneId(2));
  await vi.waitFor(() => expect(state.list).toHaveBeenCalledWith("rafts", expect.objectContaining({ zoneId: zoneId(2) })));
});

it("keeps every zone when no narrowing selection exists", async () => {
  render(<SelectedZonesProvider accountId="acc-1" enabled><ApiResourceScreen resource="rafts" /></SelectedZonesProvider>);
  await screen.findByRole("option", { name: "Z1 · Ngọc Vừng" });
  expect(within(screen.getByRole("combobox", { name: "Vùng nuôi" })).getAllByRole("option")).toHaveLength(3);
});

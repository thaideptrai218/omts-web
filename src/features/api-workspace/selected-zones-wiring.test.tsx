// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "Staff" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./workspace-repository", () => ({ createWorkspaceRepository: (resource: string) => ({ list: (query: unknown) => state.list(resource, query) }) }));
import { ApiResourceScreen } from "./api-resource-screen";
import { SelectedZonesProvider } from "./selected-zones";

const zones = ["Ngọc Vừng", "Minh Châu", "Quan Lạn"].map((name, index) => ({ id: `z${index + 1}`, name }));
beforeEach(() => {
  localStorage.clear();
  state.list.mockImplementation(async (resource: string) => ({ status: "success", data: { items: resource === "zones" ? zones : [], page: 1, pageSize: 100, total: resource === "zones" ? zones.length : 0 } }));
});
afterEach(() => cleanup());

it("restricts the raft screen's zone select to the header selection and starts on the first selected zone", async () => {
  localStorage.setItem("omts.selected-zones.v1.acc-1", JSON.stringify({ kind: "ids", ids: ["z2", "z3"] }));
  render(<SelectedZonesProvider accountId="acc-1" enabled><ApiResourceScreen resource="rafts" /></SelectedZonesProvider>);
  await screen.findByRole("option", { name: "Minh Châu" });
  expect(screen.queryByRole("option", { name: "Ngọc Vừng" })).toBeNull();
  expect(screen.getByRole("option", { name: "Quan Lạn" })).toBeTruthy();
  expect((screen.getByRole("combobox", { name: "Vùng nuôi" }) as HTMLSelectElement).value).toBe("z2");
  await vi.waitFor(() => expect(state.list).toHaveBeenCalledWith("rafts", expect.objectContaining({ zoneId: "z2" })));
});

it("keeps every zone when no narrowing selection exists", async () => {
  render(<SelectedZonesProvider accountId="acc-1" enabled><ApiResourceScreen resource="rafts" /></SelectedZonesProvider>);
  await screen.findByRole("option", { name: "Ngọc Vừng" });
  expect(screen.getAllByRole("option")).toHaveLength(4);
});

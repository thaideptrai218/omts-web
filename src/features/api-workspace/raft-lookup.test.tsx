// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "Staff" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./workspace-repository", () => ({ createWorkspaceRepository: (resource: string) => ({ list: (query: unknown) => state.list(resource, query) }) }));
import { ApiResourceScreen } from "./api-resource-screen";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("loads the second zone page and allows a raft read in that zone", async () => {
  state.list.mockImplementation(async (resource, query) => ({ status: "success", data: resource === "zones" ? { items: [{ id: query.page === "1" ? "zone1" : "zone101", name: query.page === "1" ? "Vùng đầu" : "Vùng trang2" }], page: Number(query.page), pageSize: 100, total: 101 } : { items: [], page: 1, pageSize: 20, total: 0 } }));
  render(<ApiResourceScreen resource="rafts" />); await screen.findByRole("option", { name: "Vùng trang2" }); fireEvent.change(screen.getByRole("combobox", { name: "Vùng nuôi" }), { target: { value: "zone101" } });
  await vi.waitFor(() => expect(state.list).toHaveBeenCalledWith("rafts", expect.objectContaining({ zoneId: "zone101" })));
});
it("reports failed zone lookup and recovers on an explicit retry", async () => {
  state.list.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false }); render(<ApiResourceScreen resource="rafts" />);
  const retry = await screen.findByRole("button", { name: "Tải lại danh mục vùng" });
  state.list.mockResolvedValue({ status: "success", data: { items: [{ id: "zone1", name: "Vùng khôi phục" }], page: 1, pageSize: 100, total: 1 } }); fireEvent.click(retry);
  await screen.findByRole("option", { name: "Vùng khôi phục" }); expect(screen.queryByRole("button", { name: "Tải lại danh mục vùng" })).toBeNull();
});

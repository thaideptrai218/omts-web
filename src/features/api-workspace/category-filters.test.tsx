// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), mutate: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./workspace-repository", () => ({ createWorkspaceRepository: () => state }));
import { ApiResourceScreen } from "./api-resource-screen";
beforeEach(() => { vi.clearAllMocks(); state.list.mockImplementation(async (query) => ({ status: "success", data: { items: [], page: Number(query.page), pageSize: 20, total: 40 } })); });
afterEach(cleanup);
it.each([["suppliers", "Loại nhà cung cấp", "Material", "type"], ["input-items", "Nhóm vật tư", "RaftMaterial", "group"]] as const)("combines category, status and search and resets paging for %s", async (resource, label, value, key) => {
  render(<ApiResourceScreen resource={resource} />); await vi.waitFor(() => expect(state.list).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "Sau" })); await vi.waitFor(() => expect(state.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: "2" }), expect.any(AbortSignal)));
  fireEvent.change(screen.getByRole("combobox", { name: label }), { target: { value } });
  fireEvent.change(screen.getByRole("combobox", { name: "Trạng thái" }), { target: { value: "101" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Tìm kiếm" }), { target: { value: "qa" } });
  await vi.waitFor(() => expect(state.list).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: value, search: "qa", statusId: "101", page: "1" }), expect.any(AbortSignal)));
  fireEvent.change(screen.getByRole("combobox", { name: label }), { target: { value: "" } });
  await vi.waitFor(() => { const query = state.list.mock.calls.at(-1)![0]; expect(query[key]).toBeUndefined(); expect(query.search).toBe("qa"); }); expect(state.mutate).not.toHaveBeenCalled();
});

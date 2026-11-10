// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
const state = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), mutate: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./workspace-repository", () => ({ createWorkspaceRepository: () => state }));
import { ApiResourceScreen } from "./api-resource-screen";
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => { vi.clearAllMocks(); state.list.mockImplementation(async (query) => ({ status: "success", data: { items: [], page: Number(query.page), pageSize: 20, total: 40 } })); });
afterEach(cleanup);
it.each([["input-items", "Nhóm vật tư", "Material", "group"]] as const)("combines category, status and search and resets paging for %s", async (resource, label, value, key) => {
  render(<ApiResourceScreen resource={resource} />);
  fireEvent.click(await screen.findByRole("button", { name: "Sau" })); await vi.waitFor(() => expect(state.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: "2" }), expect.any(AbortSignal)));
  const category = within(screen.getByRole("group",{name:label}));
  fireEvent.click(category.getByRole("checkbox",{name:"Tất cả"})); fireEvent.click(category.getByRole("checkbox",{name:"Vật tư"}));
  const status = within(screen.getByRole("group",{name:"Trạng thái"})); fireEvent.click(status.getByRole("checkbox",{name:"Tất cả"})); fireEvent.click(status.getByRole("checkbox",{name:"Đang dùng"}));
  fireEvent.change(screen.getByRole("searchbox", { name: "Tìm kiếm" }), { target: { value: "qa" } });
  await vi.waitFor(() => expect(state.list).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: value, search: "qa", statusId: "101", page: "1" }), expect.any(AbortSignal)));
  fireEvent.click(category.getByRole("checkbox",{name:"Tất cả"}));
  await vi.waitFor(() => { const query = state.list.mock.calls.at(-1)![0]; expect(query[key]).toBeUndefined(); expect(query.search).toBe("qa"); }); expect(state.mutate).not.toHaveBeenCalled();
});

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
it.each([["suppliers", "Loại nhà cung cấp", "Material", "type"], ["input-items", "Nhóm vật tư", "Material", "group"]] as const)("combines category, status and search and resets paging for %s", async (resource, label, value, key) => {
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

it("does not describe a failed customer read as an empty customer directory", async () => {
  state.list.mockResolvedValue({ status: "error", httpStatus: 404, uncertain: false });
  render(<ApiResourceScreen resource="customers" />);
  await screen.findByRole("alert");
  expect(screen.getByText("Chưa tải được dữ liệu")).toBeTruthy();
  expect(screen.queryByText("Không có dữ liệu phù hợp.")).toBeNull();
  expect(state.mutate).not.toHaveBeenCalled();
});

it("preserves a linked customer's locked phone when opening the refined profile", async () => {
  const customer = { id: "20000000-0000-4000-8000-000000000001", name: "Khách QA", phoneNumber: "0900000001", address: null, hasTraderAccount: true };
  state.list.mockResolvedValue({ status: "success", data: { items: [customer], page: 1, pageSize: 20, total: 1 } });
  state.detail.mockResolvedValue({ status: "success", data: { ...customer, phoneLocked: true, note: null, email: null, currentDebt: 2500000, mergedIntoCustomerId: null, traderAccount: { displayName: "Thương lái QA" }, rowVersion: "opaque" } });
  render(<ApiResourceScreen resource="customers" />);
  fireEvent.click(await screen.findByRole("button", { name: "Mở khách hàng" }));
  await screen.findByRole("heading", { name: "Khách QA" });
  expect((screen.getByLabelText("Số điện thoại") as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByText("2.500.000 ₫")).toBeTruthy();
  expect(screen.getByText("Thương lái QA")).toBeTruthy();
  expect(state.mutate).not.toHaveBeenCalled();
});

it("expands supplier details beneath the row without opening the edit dialog", async () => {
 const supplier = {id:"20000000-0000-4000-8000-000000000001",name:"Nhà cung cấp QA",supplierType:"Seed",phoneNumber:"0900000001",statusId:101};
 state.list.mockResolvedValue({status:"success",data:{items:[supplier],page:1,pageSize:20,total:1}});
 state.detail.mockResolvedValue({status:"success",data:{...supplier,address:"Địa chỉ kiểm thử",email:"supplier@example.test"}});
 render(<ApiResourceScreen resource="suppliers"/>);
 fireEvent.click(await screen.findByRole("button",{name:"Xem hồ sơ Nhà cung cấp QA"}));
 expect(await screen.findByText("Địa chỉ kiểm thử")).toBeTruthy();
 expect(screen.getByRole("region",{name:"Chi tiết nhà cung cấp"}).closest("tr")?.previousElementSibling?.textContent).toContain("Nhà cung cấp QA");
 expect(screen.queryByRole("dialog")).toBeNull();
 fireEvent.click(screen.getByRole("button",{name:"Xem hồ sơ Nhà cung cấp QA"}));
 expect(screen.queryByRole("region",{name:"Chi tiết nhà cung cấp"})).toBeNull();
 expect(state.mutate).not.toHaveBeenCalled();
});

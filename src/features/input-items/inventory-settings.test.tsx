// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  subject: "CooperativeOwner",
  repo: { units: vi.fn(), groups: vi.fn(), issueTypes: vi.fn(), settings: vi.fn(), reorderGroups: vi.fn(), saveSettings: vi.fn(), removeGroup: vi.fn(), saveUnit: vi.fn(), removeUnit: vi.fn(), saveGroup: vi.fn(), saveIssueType: vi.fn(), removeIssueType: vi.fn() },
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({
  useApiWorkspace: () => ({ identity: { subjectType: state.subject }, permissions: { functionPermissions: [{ functionCode: "PURCHASE_RECEIPTS", action: "View" }] } }),
}));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), inputRepository: state.repo }));
import { InputInventorySettings } from "./inventory-settings";
import { ToastProvider } from "@/components/ui/toast-provider";

const ok = <T,>(data: T) => ({ status: "success" as const, data });
const group = (id: string, name: string, sortOrder: number, itemCount: number) => ({ id, name, sortOrder, itemCount, rowVersion: `v-${id}` });
const view = () => render(<ToastProvider><InputInventorySettings /></ToastProvider>);

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  state.subject = "CooperativeOwner";
  state.repo.units.mockResolvedValue(ok([{ id: "u1", name: "cái", itemCount: 3, isUsed: true, rowVersion: "v" }]));
  state.repo.groups.mockResolvedValue(ok([group("g1", "Thức ăn", 0, 0), group("g2", "Thuốc", 1, 2)]));
  state.repo.issueTypes.mockResolvedValue(ok([{ id: "t1", name: "Thả giống", isSystem: true, rowVersion: "v" }, { id: "t2", name: "Cho ăn thêm", isSystem: false, rowVersion: "v" }]));
  state.repo.settings.mockResolvedValue(ok({ costMethod: "Fixed", allowNegativeQuantity: true, rowVersion: "s1" }));
  state.repo.reorderGroups.mockResolvedValue(ok([]));
  state.repo.saveSettings.mockResolvedValue(ok({ costMethod: "Average", allowNegativeQuantity: true, rowVersion: "s2" }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("sends the whole new order when a group moves up, and refuses to delete a group that has items", async () => {
  const user = userEvent.setup();
  view();
  await user.click(await screen.findByRole("tab", { name: /Nhóm hàng/ }));
  await user.click(await screen.findByRole("button", { name: "Đưa Thuốc lên" }));
  await waitFor(() => expect(state.repo.reorderGroups).toHaveBeenCalledWith(["g2", "g1"]));
  await user.click(screen.getByRole("button", { name: "Xóa Thuốc" }));
  expect((await screen.findByRole("alert")).textContent).toContain("đang được sử dụng");
  expect(state.repo.removeGroup).not.toHaveBeenCalled();
});

it("shows child groups under their parent, moves them only within it, and creates a group under a chosen parent", async () => {
  state.repo.groups.mockResolvedValue(ok([
    { ...group("g1", "Dụng cụ", 0, 3), parentId: null }, { ...group("g2", "Lưới", 1, 2), parentId: "g1" }, { ...group("g3", "Phao", 2, 1), parentId: "g1" }, { ...group("g4", "Thức ăn", 3, 0), parentId: null },
  ]));
  state.repo.saveGroup.mockResolvedValue(ok({ ...group("g5", "Dây", 4, 0), parentId: "g1" }));
  const user = userEvent.setup();
  view();
  await user.click(await screen.findByRole("tab", { name: /Nhóm hàng/ }));
  await screen.findByText("Phao");
  expect(screen.getAllByRole("row").slice(1).map((row) => row.textContent)).toEqual([
    expect.stringContaining("Dụng cụ"), expect.stringContaining("Lưới"), expect.stringContaining("Phao"), expect.stringContaining("Thức ăn")]);
  // The first child cannot go above its parent; the second moves above the first.
  expect((screen.getByRole("button", { name: "Đưa Lưới lên" }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole("button", { name: "Đưa Phao lên" }));
  await waitFor(() => expect(state.repo.reorderGroups).toHaveBeenCalledWith(["g1", "g3", "g2", "g4"]));
  // A parent moves with its children.
  await user.click(screen.getByRole("button", { name: "Đưa Thức ăn lên" }));
  await waitFor(() => expect(state.repo.reorderGroups).toHaveBeenLastCalledWith(["g4", "g1", "g2", "g3"]));
  // A parent with children is not deleted.
  await user.click(screen.getByRole("button", { name: "Xóa Dụng cụ" }));
  expect((await screen.findByRole("alert")).textContent).toContain("còn nhóm con");
  expect(state.repo.removeGroup).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Tạo nhóm hàng" }));
  await user.type(screen.getByLabelText("Tên *"), "Dây");
  await user.selectOptions(screen.getByLabelText("Nhóm cha"), "g1");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.repo.saveGroup).toHaveBeenCalledWith("Dây", undefined, undefined, "g1"));
});

it("locks the system issue types and leaves the others editable", async () => {
  const user = userEvent.setup();
  view();
  await user.click(await screen.findByRole("tab", { name: /Loại xuất/ }));
  await screen.findByText("Cho ăn thêm");
  expect(screen.getByText("Hệ thống")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Sửa Thả giống" })).toBeNull();
  expect(screen.getByRole("button", { name: "Sửa Cho ăn thêm" })).toBeTruthy();
});

it("shows the lists read-only to an account that is not the Owner", async () => {
  state.subject = "Staff";
  view();
  await screen.findByText("cái");
  expect(screen.queryByRole("button", { name: "Tạo đơn vị tính" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Sửa cái" })).toBeNull();
});

it("saves the chosen cost method with the row version it was read with", async () => {
  const user = userEvent.setup();
  view();
  await user.click(await screen.findByRole("tab", { name: "Tính giá vốn" }));
  await user.click(await screen.findByRole("radio", { name: /Trung bình/ }));
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.repo.saveSettings).toHaveBeenCalledWith({ costMethod: "Average", allowNegativeQuantity: true, rowVersion: "s1" }));
});

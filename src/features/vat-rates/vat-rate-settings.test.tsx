// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  subject: "CooperativeOwner", functions: [] as { functionCode: string; action: string }[],
  repo: { list: vi.fn(), create: vi.fn(), update: vi.fn(), setDefault: vi.fn(), deactivate: vi.fn(), activate: vi.fn() },
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: state.subject }, permissions: { functionPermissions: state.functions } }) }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), vatRateRepository: state.repo }));
import { VatRateSettingsPanel } from "./vat-rate-settings";
import { ToastProvider } from "@/components/ui/toast-provider";

const ok = <T,>(data: T) => ({ status: "success" as const, data });
const rate = (id: string, name: string, percent: number | null, patch: object = {}) => ({ id, name, percent, isExempt: percent === null, isSystem: percent === null, isDefault: false, active: true, sortOrder: 0, itemCount: 0, rowVersion: `v-${id}`, ...patch });
const rows = () => [rate("kct", "KCT", null, { itemCount: 4 }), rate("r5", "5%", 5, { itemCount: 3 }), rate("r8", "8%", 8), rate("r10", "10%", 10, { isDefault: true, itemCount: 9 }), rate("r7", "7%", 7, { active: false })];
const view = () => render(<ToastProvider><VatRateSettingsPanel /></ToastProvider>);

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  state.subject = "CooperativeOwner"; state.functions = [];
  state.repo.list.mockResolvedValue(ok(rows()));
  state.repo.create.mockResolvedValue(ok(rate("r9", "9%", 9)));
  state.repo.update.mockResolvedValue(ok(rate("r5", "5%", 6)));
  state.repo.setDefault.mockResolvedValue(ok(rate("r8", "8%", 8, { isDefault: true })));
  state.repo.activate.mockResolvedValue(ok(rate("r7", "7%", 7)));
  state.repo.deactivate.mockResolvedValue(ok({ rate: rate("r5", "5%", 5, { active: false }), movedItems: 3 }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const rowOf = (name: string) => screen.getAllByRole("row").find((row) => row.querySelector("td")?.textContent?.startsWith(name))!;

it("lists the rates with KCT marked as a system rate that can be neither edited nor switched off", async () => {
  view();
  await screen.findByText("KCT");
  const kct = rowOf("KCT");
  expect(within(kct).getByText("Hệ thống")).toBeTruthy();
  expect(within(kct).queryByRole("switch")).toBeNull();
  expect(within(kct).queryByRole("button")).toBeNull();
  expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Tên", "Thuế suất", "Mặc định cho vật tư mới", "Số mặt hàng", "Đang dùng", "Thao tác"]);
  expect(within(rowOf("10%")).getByText("Mặc định")).toBeTruthy();
  expect(within(rowOf("5%")).getByText("3")).toBeTruthy();
  expect((screen.getByRole("switch", { name: "Đang dùng 7%" }) as HTMLInputElement).checked).toBe(false);
  expect((screen.getByRole("switch", { name: "Đang dùng 5%" }) as HTMLInputElement).checked).toBe(true);
});

it("adds a rate with a percent of up to two decimals and tells it with a toast, and refuses a percent that is out of range", async () => {
  const user = userEvent.setup();
  view();
  await user.click(await screen.findByRole("button", { name: /Thêm mức thuế/ }));
  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText(/^Tên/), "8,5%");
  await user.type(within(dialog).getByLabelText(/^Thuế suất/), "101");
  await user.click(within(dialog).getByRole("button", { name: "Lưu" }));
  expect((await within(dialog).findByRole("alert")).textContent).toMatch(/0 đến 100/);
  expect(state.repo.create).not.toHaveBeenCalled();
  await user.clear(within(dialog).getByLabelText(/^Thuế suất/));
  await user.type(within(dialog).getByLabelText(/^Thuế suất/), "8,5");
  await user.click(within(dialog).getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.repo.create).toHaveBeenCalledWith({ name: "8,5%", percent: 8.5 }));
  expect(await screen.findByText("Đã thêm mức thuế 9%.")).toBeTruthy();
  expect(state.repo.list).toHaveBeenCalledTimes(2);
});

it("keeps the dialog open with the name already taken", async () => {
  state.repo.create.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-02", uncertain: false });
  const user = userEvent.setup();
  view();
  await user.click(await screen.findByRole("button", { name: /Thêm mức thuế/ }));
  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText(/^Tên/), "5%");
  await user.type(within(dialog).getByLabelText(/^Thuế suất/), "5");
  await user.click(within(dialog).getByRole("button", { name: "Lưu" }));
  expect((await within(dialog).findByRole("alert")).textContent).toContain("đã có trong danh sách");
});

it("notes that a changed percent only applies to later documents, and asks to confirm before it saves; a name alone saves at once", async () => {
  const user = userEvent.setup();
  view();
  await user.click(await screen.findByRole("button", { name: "Sửa 5%" }));
  let dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("Đổi % chỉ áp dụng cho phiếu tạo sau; phiếu đã lập giữ mức cũ.")).toBeTruthy();
  await user.clear(within(dialog).getByLabelText(/^Thuế suất/));
  await user.type(within(dialog).getByLabelText(/^Thuế suất/), "6");
  await user.click(within(dialog).getByRole("button", { name: "Lưu" }));
  expect(within(dialog).getByText(/Đổi thuế suất của 5% từ 5% sang 6%/)).toBeTruthy();
  expect(state.repo.update).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("button", { name: "Xác nhận" }));
  await waitFor(() => expect(state.repo.update).toHaveBeenCalledWith("r5", { name: "5%", percent: 6, rowVersion: "v-r5" }));
  expect(await screen.findByText("Đã lưu mức thuế 5%.")).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Sửa 8%" }));
  dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText(/^Tên/), " VAT");
  await user.click(within(dialog).getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.repo.update).toHaveBeenLastCalledWith("r8", { name: "8% VAT", percent: 8, rowVersion: "v-r8" }));
});

it("makes a rate the default for new items and offers that only on an active rate that is not the default", async () => {
  const user = userEvent.setup();
  view();
  await screen.findByText("KCT");
  expect(within(rowOf("10%")).queryByRole("button", { name: /làm mặc định/ })).toBeNull();
  expect(within(rowOf("7%")).queryByRole("button", { name: /làm mặc định/ })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Đặt 8% làm mặc định" }));
  await waitFor(() => expect(state.repo.setDefault).toHaveBeenCalledWith("r8"));
  expect(await screen.findByText("Đã đặt 8% làm mức mặc định cho vật tư mới.")).toBeTruthy();
});

it("asks for the rate the items move to before it switches off a rate they still use, and sends it", async () => {
  const user = userEvent.setup();
  view();
  await user.click(await screen.findByRole("switch", { name: "Đang dùng 5%" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText(/Chuyển 3 mặt hàng sang mức:/)).toBeTruthy();
  const choices = within(within(dialog).getByLabelText("Mức thuế mới")).getAllByRole("option").map((option) => option.textContent);
  expect(choices).toEqual(["Chọn mức thuế", "KCT", "8%", "10%"]);
  await user.click(within(dialog).getByRole("button", { name: "Ngừng dùng" }));
  expect((await within(dialog).findByRole("alert")).textContent).toContain("Chọn mức thuế mới");
  expect(state.repo.deactivate).not.toHaveBeenCalled();
  await user.selectOptions(within(dialog).getByLabelText("Mức thuế mới"), "r10");
  await user.click(within(dialog).getByRole("button", { name: "Ngừng dùng" }));
  await waitFor(() => expect(state.repo.deactivate).toHaveBeenCalledWith("r5", { replacementId: "r10", rowVersion: "v-r5" }));
  expect(await screen.findByText("Đã ngừng dùng mức thuế 5%.")).toBeTruthy();
  expect(await screen.findByText("Đã chuyển 3 mặt hàng sang 10%.")).toBeTruthy();
});

it("switches off an unused rate after a confirmation, without a replacement", async () => {
  state.repo.deactivate.mockResolvedValue(ok({ rate: rate("r8", "8%", 8, { active: false }), movedItems: 0 }));
  const user = userEvent.setup();
  view();
  await user.click(await screen.findByRole("switch", { name: "Đang dùng 8%" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.repo.deactivate).toHaveBeenCalledWith("r8", { rowVersion: "v-r8" }));
  expect(await screen.findByText("Đã ngừng dùng mức thuế 8%.")).toBeTruthy();
});

it("explains that the default rate cannot be switched off and does not call the API", async () => {
  const user = userEvent.setup();
  view();
  await user.click(await screen.findByRole("switch", { name: "Đang dùng 10%" }));
  expect((await screen.findByRole("alert")).textContent).toContain("đang là mức mặc định");
  expect(state.repo.deactivate).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("switches a rate back on with a toast", async () => {
  const user = userEvent.setup();
  view();
  await user.click(await screen.findByRole("switch", { name: "Đang dùng 7%" }));
  await waitFor(() => expect(state.repo.activate).toHaveBeenCalledWith("r7"));
  expect(await screen.findByText("Đã dùng lại mức thuế 7%.")).toBeTruthy();
});

it("shows the message of the API when it refuses a write", async () => {
  state.repo.setDefault.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false, problem: { message: "Mức thuế đã ngừng dùng không đặt làm mặc định được." } });
  const user = userEvent.setup();
  view();
  await user.click(await screen.findByRole("button", { name: "Đặt 8% làm mặc định" }));
  expect((await screen.findByRole("alert")).textContent).toContain("không đặt làm mặc định được");
});

it("is read-only for an account that only views receipts: the list, no add, edit, default or switch", async () => {
  state.subject = "Staff"; state.functions = [{ functionCode: "PURCHASE_RECEIPTS", action: "View" }];
  view();
  await screen.findByText("KCT");
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.queryByRole("switch")).toBeNull();
  expect(within(rowOf("7%")).getByText("Ngừng dùng")).toBeTruthy();
  expect(within(rowOf("5%")).getByText("Đang dùng")).toBeTruthy();
  expect(screen.queryByRole("columnheader", { name: "Thao tác" })).toBeNull();
});

it("shows no list to an account without any receipt or item function", async () => {
  state.subject = "Staff";
  view();
  expect((await screen.findByRole("alert")).textContent).toContain("không có quyền");
  expect(state.repo.list).not.toHaveBeenCalled();
});

it("offers a retry when the list cannot be read", async () => {
  state.repo.list.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false });
  const user = userEvent.setup();
  view();
  await user.click(await screen.findByRole("button", { name: /Thử lại|Tải lại/ }));
  expect(await screen.findByText("KCT")).toBeTruthy();
});

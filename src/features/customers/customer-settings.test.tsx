// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ subject: "CooperativeOwner", settings: vi.fn(), saveSettings: vi.fn() }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: state.subject }, permissions: { functionPermissions: [] } }) }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), customerRepository: { settings: state.settings, saveSettings: state.saveSettings } }));
import { CustomerSettingsPanel } from "./customer-settings";
import { ToastProvider } from "@/components/ui/toast-provider";

const none = { phoneNumber2: false, email: false, gender: false, birthDate: false, address: false, facebook: false, bank: false, taxCode: false };
const stored = (patch: object = {}) => ({ debtWarningEnabled: false, maxDebtAmount: null, maxDebtDays: null, allowMoreDebtOverLimit: true, noDebtForWalkIn: true, requiredFields: none, rowVersion: "v1", ...patch });
const render_ = () => render(<ToastProvider><CustomerSettingsPanel /></ToastProvider>);

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  state.subject = "CooperativeOwner";
  state.settings.mockResolvedValue({ status: "success", data: stored() });
  state.saveSettings.mockImplementation(async (body: object) => ({ status: "success", data: { ...body, rowVersion: "v2" } }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("keeps the name and the first phone number required and locked", async () => {
  render_();
  expect(((await screen.findByLabelText("Tên khách hàng")) as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByLabelText("Số điện thoại 1") as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText("Số điện thoại 1") as HTMLInputElement).disabled).toBe(true);
});

it("saves a required field as soon as its toggle is switched, with the row version it read", async () => {
  const user = userEvent.setup();
  render_();
  await user.click(await screen.findByLabelText("Email"));
  await waitFor(() => expect(state.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ rowVersion: "v1", requiredFields: { ...none, email: true } })));
  await waitFor(() => expect((screen.getByLabelText("Email") as HTMLInputElement).checked).toBe(true));
});

it("only lets the Cooperative Owner change the settings", async () => {
  state.subject = "Staff";
  render_();
  expect(((await screen.findByLabelText("Email")) as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByText(/Chỉ Chủ hợp tác xã/)).toBeTruthy();
});

it("turns the debt warning on through the details dialog and refuses it without a limit", async () => {
  const user = userEvent.setup();
  render_();
  await user.click(await screen.findByRole("switch", { name: "Cảnh báo công nợ khách hàng" }));
  await user.click(await screen.findByRole("button", { name: "Lưu" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Nhập số tiền nợ");
  expect(state.saveSettings).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Số tiền nợ tối đa"), "500000");
  await user.click(screen.getByRole("checkbox", { name: "Số ngày nợ" }));
  await user.type(screen.getByLabelText("Số ngày nợ tối đa"), "15");
  await user.click(screen.getByRole("checkbox", { name: /Cho phép khách hàng nợ thêm/ }));
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ debtWarningEnabled: true, maxDebtAmount: 500000, maxDebtDays: 15, allowMoreDebtOverLimit: false })));
  expect(await screen.findByText(/nợ trên 500\.000 ₫, nợ quá 15 ngày/)).toBeTruthy();
});

it("turns the warning off without losing the limits", async () => {
  state.settings.mockResolvedValue({ status: "success", data: stored({ debtWarningEnabled: true, maxDebtAmount: 700000 }) });
  const user = userEvent.setup();
  render_();
  await user.click(await screen.findByRole("switch", { name: "Cảnh báo công nợ khách hàng" }));
  await waitFor(() => expect(state.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ debtWarningEnabled: false, maxDebtAmount: 700000 })));
});

it("shows why a save failed and reads the settings again", async () => {
  state.saveSettings.mockResolvedValue({ status: "error", httpStatus: 409, uncertain: false, code: "MSG06" });
  const user = userEvent.setup();
  render_();
  await user.click(await screen.findByLabelText("Facebook"));
  expect(await screen.findByRole("alert")).toBeTruthy();
  await waitFor(() => expect(state.settings).toHaveBeenCalledTimes(2));
});

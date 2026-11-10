// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), subject: "CooperativeOwner" }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: state.subject }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read: state.read, write: state.write }) }));
import { PayrollSettingsScreen } from "./payroll-settings-screen";

const periods = [{ start: "2026-12-26", end: "2027-01-25" }, { start: "2027-01-26", end: "2027-02-25" }];
const settings = { payPeriodStartDay: 26, automaticPayroll: false, nextPeriods: periods, rowVersion: "v1" };
const preview = { payPeriodStartDay: 26, automaticPayroll: false, nextPeriods: periods, message: "?", messageCode: "MSG-LABOR-36" };

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  state.subject = "CooperativeOwner";
  state.read.mockImplementation(async (action: string) => ({ status: "success", data: action === "settings" ? settings : preview }));
  state.write.mockResolvedValue({ status: "success", data: { settings: { ...settings, payPeriodStartDay: 10, rowVersion: "v2" }, message: "ok", messageCode: "MSG-LABOR-37" } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("has a compact title row without a description and shows the form next to the preview", async () => {
  render(<PayrollSettingsScreen />);
  expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Thiết lập kỳ lương");
  expect(screen.queryByText(/Chọn ngày bắt đầu kỳ lương hằng tháng/)).toBeNull();
  expect(await screen.findByRole("heading", { name: "Thiết lập hiện tại" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Hai kỳ lương kế tiếp" })).toBeTruthy();
  expect(await screen.findByText("Kỳ kế tiếp")).toBeTruthy();
});

it("keeps the draft logic: save is off until the draft changes, then asks to confirm and sends the row version", async () => {
  const user = userEvent.setup();
  render(<PayrollSettingsScreen />);
  const save = await screen.findByRole("button", { name: "Lưu thiết lập" });
  expect((save as HTMLButtonElement).disabled).toBe(true);
  await user.selectOptions(screen.getByRole("combobox"), "10");
  await waitFor(() => expect(state.read).toHaveBeenCalledWith("preview", { startDay: "10", automaticPayroll: "false" }, expect.anything(), expect.anything()));
  await waitFor(() => expect((screen.getByRole("button", { name: "Lưu thiết lập" }) as HTMLButtonElement).disabled).toBe(false));
  await user.click(screen.getByRole("button", { name: "Lưu thiết lập" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.write).toHaveBeenCalledWith("save", { payPeriodStartDay: 10, automaticPayroll: false, rowVersion: "v1" }, expect.anything()));
  expect(await screen.findByText("Đã lưu thiết lập kỳ lương.")).toBeTruthy();
});

it("keeps the draft on a version conflict and offers to read the current settings", async () => {
  const user = userEvent.setup();
  state.write.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG06", uncertain: false });
  render(<PayrollSettingsScreen />);
  await screen.findByRole("button", { name: "Lưu thiết lập" });
  await user.click(screen.getByRole("switch"));
  await waitFor(() => expect((screen.getByRole("button", { name: "Lưu thiết lập" }) as HTMLButtonElement).disabled).toBe(false));
  await user.click(screen.getByRole("button", { name: "Lưu thiết lập" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  expect((await screen.findByText(/vừa được người khác thay đổi/)).closest("[role=alert]")).toBeTruthy();
  expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(true);
  expect(screen.getByRole("button", { name: "Đọc lại thiết lập hiện tại" })).toBeTruthy();
});

it("tells anyone but the owner that the page is closed to them", async () => {
  state.subject = "Staff";
  render(<PayrollSettingsScreen />);
  expect((await screen.findByRole("alert")).textContent).toContain("Chỉ Chủ hợp tác xã");
});

// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ context: { identity: { subjectType: "Staff" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } }, list: vi.fn(), detail: vi.fn(), settings: vi.fn(), linked: "" }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.linked ? { code: state.linked } : {}) }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), customerRepository: { list: state.list, detail: state.detail, settings: state.settings, debt: vi.fn(), invoices: vi.fn(), requests: vi.fn(), bulk: vi.fn(), save: vi.fn(), exportList: vi.fn(), template: vi.fn(), import: vi.fn() } }));
vi.mock("@/features/cash-book/repository", () => ({ listCollectors: vi.fn(async () => ({ status: "success", data: [] })), listBanks: vi.fn(async () => ({ status: "success", data: [] })) }));
import { CustomerScreen } from "./customer-screen";
import { ToastProvider } from "@/components/ui/toast-provider";

const row = { id: "122bb318-a72e-49aa-a8d7-a6169f889007", code: "KH000001", name: "Chú Ba", phoneNumber: "0900000000", address: null, hasTraderAccount: true, rowVersion: "v", statusId: 101, status: "In Use", customerType: "Individual",
  createdAt: "2026-11-09T00:00:00Z", createdBy: "Chủ", currentDebt: 500000, totalSales: 2000000, netSales: 1900000 };
const detail = { ...row, email: null, note: null, phoneLocked: true, traderAccount: { accountId: row.id, username: "chuba", displayName: "Chú Ba" }, mergedIntoCustomerId: null, isUsed: true };
const settings = (patch: object = {}) => ({ debtWarningEnabled: false, maxDebtAmount: null, maxDebtDays: null, allowMoreDebtOverLimit: true, noDebtForWalkIn: true, rowVersion: "v1", ...patch,
  requiredFields: { phoneNumber2: false, email: false, gender: false, birthDate: false, address: false, facebook: false, bank: false, taxCode: false } });
const grant = (...pairs: [string, string][]) => { state.context.permissions.functionPermissions = pairs.map(([functionCode, action]) => ({ functionCode, action })); };
const page = (patch: object = {}) => ({ status: "success", data: { items: [row], page: 1, pageSize: 15, total: 1, summary: { debt: 500000, totalSales: 2000000, netSales: 1900000 }, ...patch } });

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  state.linked = "";
  state.list.mockResolvedValue(page());
  state.detail.mockResolvedValue({ status: "success", data: detail });
  state.settings.mockResolvedValue({ status: "success", data: settings() });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("shows the summary row and the debt columns only with the debt permission, and never asks for debt filters without it", async () => {
  grant(["CUSTOMERS", "View"], ["CUSTOMER_DEBTS", "View"]);
  const { unmount } = render(<ToastProvider><CustomerScreen /></ToastProvider>);
  await screen.findByText("Chú Ba");
  expect(screen.getByRole("row", { name: "Tổng hợp theo bộ lọc" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Nợ hiện tại" })).toBeTruthy();
  unmount();
  grant(["CUSTOMERS", "View"]);
  state.list.mockResolvedValue(page({ summary: null }));
  render(<ToastProvider><CustomerScreen /></ToastProvider>);
  await screen.findByText("Chú Ba");
  expect(screen.queryByRole("row", { name: "Tổng hợp theo bộ lọc" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Nợ hiện tại" })).toBeNull();
  expect(Object.keys(state.list.mock.calls.at(-1)![0]).some((key) => key.startsWith("currentDebt") || key.startsWith("totalSales"))).toBe(false);
});

it("opens a row on click with a debt tab only for those who may see debts, and a footer limited to what they may do", async () => {
  grant(["CUSTOMERS", "View"], ["CUSTOMERS", "Edit"]);
  const user = userEvent.setup();
  render(<ToastProvider><CustomerScreen /></ToastProvider>);
  await user.click(await screen.findByText("Chú Ba"));
  await waitFor(() => expect(screen.getByRole("tablist")).toBeTruthy());
  expect(screen.queryByRole("tab", { name: "Nợ cần thu" })).toBeNull();
  expect(screen.getByText("Tài khoản thương lái")).toBeTruthy();
  // The profile has documents, so it cannot be deleted; merging and editing are there.
  await screen.findByRole("button", { name: "Gộp hồ sơ" });
  expect(screen.queryByRole("button", { name: "Xóa" })).toBeNull();
});

it("searches a linked customer by its code among every status and opens its row", async () => {
  grant(["CUSTOMERS", "View"]);
  state.linked = "KH000001";
  render(<ToastProvider><CustomerScreen /></ToastProvider>);
  await screen.findByRole("tablist");
  expect(state.list.mock.calls[0][0]).toMatchObject({ search: "KH000001", status: "All" });
  expect((screen.getByLabelText("Tìm khách hàng") as HTMLInputElement).value).toBe("KH000001");
});

it("shows a customer over the debt limit in red with the reason, and filters them when the warning is on", async () => {
  grant(["CUSTOMERS", "View"], ["CUSTOMER_DEBTS", "View"]);
  state.settings.mockResolvedValue({ status: "success", data: settings({ debtWarningEnabled: true, maxDebtAmount: 100000 }) });
  state.list.mockResolvedValue(page({ items: [{ ...row, overDebtLimit: true, overDebtAmount: true, overDebtDays: false, debtDays: 3 }] }));
  const user = userEvent.setup();
  render(<ToastProvider><CustomerScreen /></ToastProvider>);
  expect((await screen.findAllByTitle(/vượt hạn mức số tiền nợ/)).length).toBeGreaterThan(0);
  await user.click(await screen.findByLabelText("Vượt hạn mức nợ"));
  await waitFor(() => expect(state.list.mock.calls.at(-1)![0]).toMatchObject({ overDebtLimit: "true" }));
});

it("offers no over-limit filter while the debt warning is off", async () => {
  grant(["CUSTOMERS", "View"], ["CUSTOMER_DEBTS", "View"]);
  render(<ToastProvider><CustomerScreen /></ToastProvider>);
  await screen.findByText("Chú Ba");
  await waitFor(() => expect(state.settings).toHaveBeenCalled());
  expect(screen.queryByLabelText("Vượt hạn mức nợ")).toBeNull();
});

it("does not describe a failed read as an empty customer list", async () => {
  grant(["CUSTOMERS", "View"]);
  state.list.mockResolvedValue({ status: "error", httpStatus: 404, uncertain: false });
  render(<ToastProvider><CustomerScreen /></ToastProvider>);
  await screen.findByRole("alert");
  expect(screen.queryByText("Chưa có khách hàng.")).toBeNull();
  expect(screen.getByRole("button", { name: "Tải lại" })).toBeTruthy();
});

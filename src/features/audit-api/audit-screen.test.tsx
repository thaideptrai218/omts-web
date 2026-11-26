// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ context: { identity: { subjectType: "CooperativeOwner" } }, list: vi.fn(), detail: vi.fn(), facets: vi.fn() }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("./repository", () => ({ auditRepository: { list: state.list, detail: state.detail, facets: state.facets } }));
import { AuditScreen } from "./audit-screen";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007", account = "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a22";
const actor = { kind: "Account", accountId: account, employeeId: null, name: "Chủ HTX", username: "owner" };
const item = { id, occurredAt: "2026-11-17T01:00:00Z", actor, action: "SupplierPayment.Recorded", recordType: "SupplierPayment", recordId: null, recordCode: "TT000012", zoneId: null, reason: null };
const page = (total = 1) => ({ status: "success", data: { page: { items: total ? [item] : [], page: 1, pageSize: 15, total }, from: "", to: "", message: null, messageCode: null } });
const lastQuery = () => state.list.mock.calls.at(-1)![0] as Record<string, string>;

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  state.context.identity.subjectType = "CooperativeOwner";
  state.list.mockResolvedValue(page());
  state.facets.mockResolvedValue({ status: "success", data: { actions: ["SupplierPayment.Recorded"], recordTypes: ["SupplierPayment"], people: [actor] } });
  state.detail.mockResolvedValue({ status: "success", data: { ...item, before: null, after: { Amount: 1000, Method: "Cash" } } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("loads the log by itself with server paging and has no lookup button or export", async () => {
  render(<AuditScreen />);
  expect(await screen.findByText("TT000012")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Tra cứu" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Xuất file/ })).toBeNull();
  expect(lastQuery()).toMatchObject({ page: "1", pageSize: "10", recordCode: "", recordType: "", action: "" });
  expect(lastQuery().from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(screen.getByRole("navigation", { name: "Phân trang" }).textContent).toContain("1–1 trong 1 thao tác");
});

it("refuses anyone but the owner without reading the log", () => {
  state.context.identity.subjectType = "Staff";
  render(<AuditScreen />);
  expect(screen.getByRole("alert").textContent).toContain("Bạn không có quyền");
  expect(state.list).not.toHaveBeenCalled();
});

it("searches by record code and filters by record type, action and person", async () => {
  const user = userEvent.setup();
  render(<AuditScreen />);
  await screen.findByText("TT000012");
  await user.type(screen.getByRole("searchbox", { name: "Tìm theo mã bản ghi" }), "TT0");
  await waitFor(() => expect(lastQuery().recordCode).toBe("TT0"));
  fireEvent.change(screen.getByLabelText("Loại bản ghi", { selector: "select" }), { target: { value: "SupplierPayment" } });
  await waitFor(() => expect(lastQuery().recordType).toBe("SupplierPayment"));
  await waitFor(() => expect(screen.getByLabelText("Hành động", { selector: "select" }).querySelector('option[value="SupplierPayment.Recorded"]')).toBeTruthy());
  fireEvent.change(screen.getByLabelText("Hành động", { selector: "select" }), { target: { value: "SupplierPayment.Recorded" } });
  await waitFor(() => expect(lastQuery().action).toBe("SupplierPayment.Recorded"));
  fireEvent.change(screen.getByLabelText("Người thao tác", { selector: "select" }), { target: { value: `account:${account}` } });
  await waitFor(() => expect(lastQuery().actorAccountId).toBe(account));
  fireEvent.change(screen.getByLabelText("Người thao tác", { selector: "select" }), { target: { value: "system" } });
  await waitFor(() => expect(lastQuery()).toMatchObject({ system: "true" }));
  expect(lastQuery().actorAccountId).toBeUndefined();
});

it("opens the change detail under the row instead of leaving the page", async () => {
  const user = userEvent.setup();
  render(<AuditScreen />);
  await user.click(await screen.findByText("TT000012"));
  const panel = await screen.findByRole("region", { name: "Chi tiết nhật ký" });
  expect(within(panel).getByRole("tab", { name: "Chi tiết thay đổi" })).toBeTruthy();
  expect(await within(panel).findByText("Thông tin được ghi nhận")).toBeTruthy();
  expect(within(panel).getByText("1.000 đồng")).toBeTruthy();
  expect(state.detail).toHaveBeenCalledWith(id, expect.anything());
  expect(screen.queryByRole("button", { name: /Quay lại/ })).toBeNull();
});

it("shows an empty state and a retry when the list cannot be read", async () => {
  state.list.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false });
  const user = userEvent.setup();
  render(<AuditScreen />);
  await user.click(await screen.findByRole("button", { name: "Tải lại" }));
  expect(await screen.findByText("TT000012")).toBeTruthy();
  state.list.mockResolvedValue(page(0));
  await user.type(screen.getByRole("searchbox", { name: "Tìm theo mã bản ghi" }), "ZZ");
  expect(await screen.findByText("Không có thao tác phù hợp bộ lọc.")).toBeTruthy();
});

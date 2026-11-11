// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { businessToday } from "@/features/operations/ui";
import { monthOptions } from "./payroll-model";
import { detail, fail, ids, ok, polyfillDialog, row } from "./payroll-test-fixtures";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] as unknown[] } },
  repo: { list: vi.fn(), detail: vi.fn(), create: vi.fn(), reload: vi.fn(), finalize: vi.fn(), cancel: vi.fn(), pay: vi.fn(), exportSheet: vi.fn(), exportList: vi.fn(), payments: vi.fn(), payable: vi.fn(), payStandalone: vi.fn() },
  employees: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("./repository", () => ({ payrollRepository: state.repo }));
vi.mock("@/features/api-workspace/workspace-repository", () => ({ createWorkspaceRepository: () => ({ list: state.employees }) }));
import { PayrollScreen } from "./payroll-screen";

const page = (items = [row(), row({ id: ids.b, code: "BL000002", name: "Bảng lương tháng 4/2026", status: "Finalized", total: 500_000, paid: 500_000, outstanding: 0 })]) =>
  ok({ items, total: items.length, page: 1, pageSize: 15, summary: { total: 3_500_000, paid: 1_500_000, outstanding: 2_000_000 } });
const lastQuery = () => state.repo.list.mock.calls.at(-1)![0];

beforeEach(() => {
  polyfillDialog(); localStorage.clear();
  state.repo.list.mockResolvedValue(page());
  state.repo.detail.mockResolvedValue(ok(detail()));
  state.employees.mockResolvedValue(ok({ items: [{ id: ids.empA, fullName: "Nguyễn Văn A" }, { id: ids.empB, fullName: "Trần Thị B" }], page: 1, pageSize: 100, total: 2 }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

it("lays out the KiotViet list: toolbar, filters, columns and a totals row", async () => {
  render(<PayrollScreen />);
  await screen.findByText("BL000001");
  expect(screen.getByRole("heading", { level: 1, name: "Bảng lương" })).toBeTruthy();
  expect(screen.getByPlaceholderText("Theo mã, tên bảng lương")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Bảng tính lương/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Xuất file/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Chọn trường hiển thị" })).toBeTruthy();
  const table = screen.getByRole("table", { name: "Danh sách bảng lương" });
  for (const heading of ["Mã", "Tên bảng lương", "Kỳ hạn trả lương", "Kỳ làm việc", "Tổng lương", "Đã trả nhân viên", "Còn cần trả", "Trạng thái"]) expect(within(table).getByRole("columnheader", { name: heading })).toBeTruthy();
  expect(within(table).getAllByText("01/05/2026 - 31/05/2026").length).toBe(2);
  expect(within(table).getAllByText("Hàng tháng", { selector: "td" }).length).toBe(2);
  expect(within(table).getAllByText("Tạm tính").length).toBe(1);
  expect(within(table).getByText("Đã chốt lương")).toBeTruthy();
  const totals = screen.getByTestId("payroll-totals").textContent ?? "";
  expect(totals).toContain("3.500.000"); expect(totals).toContain("1.500.000"); expect(totals).toContain("2.000.000");
  // Closed rows carry no action buttons, only the selection box and the chevron.
  expect(screen.queryByRole("button", { name: /Chốt lương|Hủy bỏ|Thanh toán/ })).toBeNull();
});

it("filters by status checkboxes (Đã hủy off by default) and pay period, server side", async () => {
  const user = userEvent.setup();
  render(<PayrollScreen />);
  await screen.findByText("BL000001");
  expect(lastQuery()).toMatchObject({ statuses: ["Creating", "Provisional", "Finalized"], periodType: "", sortBy: "code", sortDir: "desc", page: 1 });
  expect((screen.getByRole("checkbox", { name: "Đang tạo" }) as HTMLInputElement).checked).toBe(true);
  expect((screen.getByRole("checkbox", { name: "Đã hủy" }) as HTMLInputElement).checked).toBe(false);
  await user.click(screen.getByRole("checkbox", { name: "Đã hủy" }));
  await user.click(screen.getByRole("checkbox", { name: "Tạm tính" }));
  await waitFor(() => expect(lastQuery().statuses).toEqual(["Creating", "Finalized", "Cancelled"]));
  await user.selectOptions(screen.getByRole("combobox", { name: "Kỳ hạn trả lương" }), "Custom");
  await waitFor(() => expect(lastQuery().periodType).toBe("Custom"));
  await user.click(screen.getByRole("button", { name: "Tổng lương" }));
  await waitFor(() => expect(lastQuery()).toMatchObject({ sortBy: "total", sortDir: "asc" }));
  await user.type(screen.getByPlaceholderText("Theo mã, tên bảng lương"), "BL1");
  await waitFor(() => expect(lastQuery().search).toBe("BL1"));
});

it("shows the API error with a retry and no placeholder rows", async () => {
  state.repo.list.mockResolvedValueOnce(fail(503));
  const user = userEvent.setup();
  render(<PayrollScreen />);
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("Chưa kết nối được dịch vụ");
  expect(screen.queryByText("BL000001")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Tải lại" }));
  await screen.findByText("BL000001");
});

it("shows the empty state when nothing matches", async () => {
  state.repo.list.mockResolvedValue(ok({ items: [], total: 0, page: 1, pageSize: 15, summary: { total: 0, paid: 0, outstanding: 0 } }));
  render(<PayrollScreen />);
  expect(await screen.findByText("Chưa có bảng lương.")).toBeTruthy();
});

it("opens a row in place with the tabs Thông tin and Phiếu lương", async () => {
  const user = userEvent.setup();
  render(<PayrollScreen />);
  await user.click(await screen.findByText("Bảng lương tháng 5/2026"));
  await screen.findByRole("tablist", { name: "Nội dung bảng lương" });
  expect(state.repo.detail).toHaveBeenCalledWith(ids.a, expect.anything());
  expect(screen.getByText("Chủ hợp tác xã")).toBeTruthy();
  expect(screen.getByText("Tất cả nhân viên")).toBeTruthy();
  await user.click(screen.getByRole("tab", { name: "Phiếu lương" }));
  for (const heading of ["Mã phiếu lương", "Tên nhân viên", "Lương chính", "Thưởng", "Giảm trừ", "Tổng thu nhập", "Lương thực nhận", "Đã trả", "Còn cần trả"]) {
    expect(screen.getAllByRole("columnheader", { name: heading }).length).toBeGreaterThan(0);
  }
  expect(screen.getByText("PL000001")).toBeTruthy();
  expect(screen.getByText("100 giờ × 30.000")).toBeTruthy();
});

it("offers footer actions by status: Tạm tính, Đã chốt lương, Đã hủy", async () => {
  const user = userEvent.setup();
  render(<PayrollScreen />);
  await user.click(await screen.findByText("Bảng lương tháng 5/2026"));
  const names = () => within(screen.getByRole("group", { name: "Thao tác bảng lương" })).getAllByRole("button").map((button) => button.textContent);
  await waitFor(() => expect(names()).toEqual(["Tải lại dữ liệu", "Hủy bỏ", "Xuất file", "Chốt lương"]));
  await user.click(screen.getByRole("tab", { name: "Phiếu lương" }));
  expect(names()).toEqual(["Tải lại dữ liệu", "Hủy bỏ", "Xuất file", "Chốt lương"]);
  cleanup();

  state.repo.detail.mockResolvedValue(ok(detail({ status: "Finalized", expenseMonth: "2026-05" })));
  render(<PayrollScreen />);
  await user.click(await screen.findByText("Bảng lương tháng 5/2026"));
  await waitFor(() => expect(names()).toEqual(["Xuất file"]));
  expect(screen.getByText("Tháng 05/2026")).toBeTruthy();
  await user.click(screen.getByRole("tab", { name: "Phiếu lương" }));
  expect(names()).toEqual(["Xuất file", "Thanh toán"]);
  cleanup();

  state.repo.detail.mockResolvedValue(ok(detail({ status: "Cancelled" })));
  render(<PayrollScreen />);
  await user.click(await screen.findByText("Bảng lương tháng 5/2026"));
  await waitFor(() => expect(names()).toEqual(["Xuất file"]));
  await user.click(screen.getByRole("tab", { name: "Phiếu lương" }));
  expect(names()).toEqual(["Xuất file"]);
});

it("reloads data with the chosen mode from the inline menu", async () => {
  state.repo.reload.mockResolvedValue(ok(detail()));
  const user = userEvent.setup();
  render(<PayrollScreen />);
  await user.click(await screen.findByText("Bảng lương tháng 5/2026"));
  await user.click(await screen.findByRole("button", { name: "Tải lại dữ liệu" }));
  expect(screen.getByRole("menuitem", { name: "Tải lại toàn bộ dữ liệu" })).toBeTruthy();
  await user.click(screen.getByRole("menuitem", { name: "Chỉ cập nhật dữ liệu theo ngày làm việc" }));
  await waitFor(() => expect(state.repo.reload).toHaveBeenCalledWith(ids.a, "WorkingDaysOnly"));
  expect(await screen.findByText("Đã tải lại dữ liệu bảng lương.")).toBeTruthy();
});

it("finalizes with the expense month defaulting to the period end month, after a confirmation", async () => {
  state.repo.finalize.mockResolvedValue(ok(detail({ status: "Finalized" })));
  const user = userEvent.setup();
  render(<PayrollScreen />);
  await user.click(await screen.findByText("Bảng lương tháng 5/2026"));
  await user.click(await screen.findByRole("button", { name: "Chốt lương" }));
  const dialog = screen.getByRole("dialog", { name: "Xác nhận chốt lương" });
  expect(dialog.textContent).toContain("bị khóa");
  expect((within(dialog).getByRole("combobox") as HTMLSelectElement).value).toBe("2026-05");
  await user.selectOptions(within(dialog).getByRole("combobox"), "2026-06");
  await user.click(within(dialog).getByRole("button", { name: "Xác nhận" }));
  await waitFor(() => expect(state.repo.finalize).toHaveBeenCalledWith(ids.a, "2026-06"));
  expect(await screen.findByText(/Đã chốt lương\. Dữ liệu trong kỳ đã được khóa/)).toBeTruthy();
});

it("keeps the dialog and shows the error when finalizing fails; Bỏ qua changes nothing", async () => {
  state.repo.finalize.mockResolvedValue(fail(409));
  const user = userEvent.setup();
  render(<PayrollScreen />);
  await user.click(await screen.findByText("Bảng lương tháng 5/2026"));
  await user.click(await screen.findByRole("button", { name: "Chốt lương" }));
  await user.click(within(screen.getByRole("dialog", { name: "Xác nhận chốt lương" })).getByRole("button", { name: "Xác nhận" }));
  expect((await screen.findAllByText(/Dữ liệu đã thay đổi/)).length).toBeGreaterThan(0);
  await user.click(within(screen.getByRole("dialog", { name: "Xác nhận chốt lương" })).getByRole("button", { name: "Bỏ qua" }));
  expect(screen.queryByRole("dialog", { name: "Xác nhận chốt lương" })).toBeNull();
});

it("cancels only after the Hủy bảng lương? confirmation", async () => {
  state.repo.cancel.mockResolvedValue(ok(detail({ status: "Cancelled" })));
  const user = userEvent.setup();
  render(<PayrollScreen />);
  await user.click(await screen.findByText("Bảng lương tháng 5/2026"));
  await user.click(await screen.findByRole("button", { name: "Hủy bỏ" }));
  expect(state.repo.cancel).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole("dialog", { name: "Hủy bảng lương?" })).getByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.repo.cancel).toHaveBeenCalledWith(ids.a));
  expect(await screen.findByText("Đã hủy bảng lương.")).toBeTruthy();
});

it("exports one sheet and the filtered list", async () => {
  state.repo.exportSheet.mockResolvedValue(ok(true)); state.repo.exportList.mockResolvedValue(ok(true));
  const user = userEvent.setup();
  render(<PayrollScreen />);
  await screen.findByText("BL000001");
  await user.click(screen.getByRole("button", { name: /Xuất file/ }));
  await waitFor(() => expect(state.repo.exportList).toHaveBeenCalledWith(expect.objectContaining({ statuses: ["Creating", "Provisional", "Finalized"] })));
  await user.click(screen.getByText("Bảng lương tháng 5/2026"));
  await user.click(await within(await screen.findByRole("group", { name: "Thao tác bảng lương" })).findByRole("button", { name: "Xuất file" }));
  await waitFor(() => expect(state.repo.exportSheet).toHaveBeenCalledWith(ids.a));
});

it("creates a monthly sheet from the pop-up: 13 calendar months, scope All by default", async () => {
  state.repo.create.mockResolvedValue(ok(detail({ name: "Bảng lương tháng 11/2026", status: "Provisional" })));
  const user = userEvent.setup();
  render(<PayrollScreen />);
  await screen.findByText("BL000001");
  await user.click(screen.getByRole("button", { name: /Bảng tính lương/ }));
  const dialog = screen.getByRole("dialog", { name: "Thêm bảng tính lương" });
  const month = within(dialog).getByLabelText("Kỳ làm việc") as HTMLSelectElement;
  expect(month.options.length).toBe(13);
  const first = monthOptions(businessToday())[0];
  expect(month.value).toBe(first.value);
  expect(month.options[0].textContent).toBe(first.label);
  expect((within(dialog).getByRole("radio", { name: "Tất cả nhân viên" }) as HTMLInputElement).checked).toBe(true);
  expect(within(dialog).queryByLabelText("Tìm nhân viên")).toBeNull();
  await user.click(within(dialog).getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.repo.create).toHaveBeenCalledWith({ periodType: "Monthly", from: first.from, to: first.to, scope: "All" }));
  expect(await screen.findByText("Đã tạo Bảng lương tháng 11/2026.")).toBeTruthy();
  expect(screen.queryByRole("dialog", { name: "Thêm bảng tính lương" })).toBeNull();
  await waitFor(() => expect(state.repo.list.mock.calls.length).toBeGreaterThan(1));
});

it("needs a custom period and at least one chosen employee before it saves", async () => {
  state.repo.create.mockResolvedValue(ok(detail()));
  const user = userEvent.setup();
  render(<PayrollScreen />);
  await screen.findByText("BL000001");
  await user.click(screen.getByRole("button", { name: /Bảng tính lương/ }));
  const dialog = screen.getByRole("dialog", { name: "Thêm bảng tính lương" });
  await user.selectOptions(within(dialog).getByLabelText("Kỳ hạn trả lương"), "Custom");
  expect(within(dialog).getByRole("button", { name: /^Từ ngày:/ })).toBeTruthy();
  expect(within(dialog).getByRole("button", { name: /^Đến ngày:/ })).toBeTruthy();
  await user.click(within(dialog).getByRole("button", { name: "Lưu" }));
  expect((await within(dialog).findByRole("alert")).textContent).toBe("Hãy chọn kỳ làm việc.");
  await user.selectOptions(within(dialog).getByLabelText("Kỳ hạn trả lương"), "Monthly");
  await user.click(within(dialog).getByRole("radio", { name: "Tùy chọn" }));
  await user.click(within(dialog).getByRole("button", { name: "Lưu" }));
  expect((await within(dialog).findByRole("alert")).textContent).toBe("Hãy chọn ít nhất một nhân viên.");
  expect(state.repo.create).not.toHaveBeenCalled();
  await user.click(await within(dialog).findByRole("checkbox", { name: "Trần Thị B" }));
  expect(within(dialog).getByRole("status").textContent).toBe("Đã chọn 1 nhân viên");
  await user.click(within(dialog).getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.repo.create).toHaveBeenCalledWith(expect.objectContaining({ scope: "Selected", employeeIds: [ids.empB] })));
  expect(state.employees).toHaveBeenCalledWith(expect.objectContaining({ statusId: "401" }), expect.anything());
});

it("shows backend errors on the create form and keeps it open", async () => {
  state.repo.create.mockResolvedValueOnce(fail(409));
  const user = userEvent.setup();
  render(<PayrollScreen />);
  await screen.findByText("BL000001");
  await user.click(screen.getByRole("button", { name: /Bảng tính lương/ }));
  const dialog = screen.getByRole("dialog", { name: "Thêm bảng tính lương" });
  await user.click(within(dialog).getByRole("button", { name: "Lưu" }));
  expect((await within(dialog).findByRole("alert")).textContent).toBe("Đã có bảng lương cho kỳ làm việc này.");
  expect(screen.getByRole("dialog", { name: "Thêm bảng tính lương" })).toBeTruthy();
  await user.click(within(dialog).getByRole("button", { name: "Bỏ qua" }));
  expect(screen.queryByRole("dialog", { name: "Thêm bảng tính lương" })).toBeNull();
});

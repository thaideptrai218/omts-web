// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { detail, fail, ids, ok, payment, polyfillDialog, slip } from "./payroll-test-fixtures";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] as unknown[] } },
  repo: { list: vi.fn(), detail: vi.fn(), create: vi.fn(), reload: vi.fn(), finalize: vi.fn(), cancel: vi.fn(), pay: vi.fn(), exportSheet: vi.fn(), exportList: vi.fn(), payments: vi.fn(), payable: vi.fn(), payStandalone: vi.fn() },
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("./repository", () => ({ payrollRepository: state.repo }));
import { PayrollDetailFooter } from "./payroll-detail-footer";
import { PayrollPayDialog } from "./payroll-pay-dialog";
import { PayrollPaymentsScreen } from "./payroll-payments-screen";

const finalized = detail({
  status: "Finalized", total: 3_500_000, paid: 1_000_000, outstanding: 2_500_000,
  slips: [slip(), slip({ id: ids.slipB, code: "PL000002", employeeId: ids.empB, employeeName: "Trần Thị B", mainPay: 500_000, income: 500_000, net: 500_000, paid: 500_000, outstanding: 0 })],
});

beforeEach(() => { polyfillDialog(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("pay pop-up: default amount is what is owed, finished slips are disabled, partial payment is sent", async () => {
  state.repo.pay.mockResolvedValue(ok({ vouchers: [{ id: ids.pay, code: "PC000002", slipId: ids.slipA, employeeName: "Nguyễn Văn A", amount: 1_200_000 }] }));
  const onPaid = vi.fn(), user = userEvent.setup();
  render(<PayrollPayDialog sheet={finalized} onClose={vi.fn()} onPaid={onPaid} />);
  const dialog = screen.getByRole("dialog", { name: "Thanh toán lương" });
  for (const heading of ["Mã phiếu lương", "Nhân viên", "Lương thực nhận", "Đã trả", "Còn cần trả", "Tiền trả nhân viên"]) expect(within(dialog).getByRole("columnheader", { name: heading })).toBeTruthy();
  expect(within(dialog).getByLabelText("Bảng lương cần thanh toán").textContent).toContain("BL000001 · Bảng lương tháng 5/2026");
  expect(within(dialog).getByLabelText("Bảng lương cần thanh toán").textContent).toContain("01/05/2026 - 31/05/2026");
  expect(within(dialog).getByLabelText("Tiền trả Nguyễn Văn A")).toHaveProperty("value", "2000000");
  expect((within(dialog).getByLabelText("Tiền trả Trần Thị B") as HTMLInputElement).disabled).toBe(true);
  expect((within(dialog).getByRole("checkbox", { name: "Trả Trần Thị B" }) as HTMLInputElement).disabled).toBe(true);
  expect(within(dialog).getByLabelText("Phương thức thanh toán")).toHaveProperty("value", "Cash");
  expect(within(dialog).getByText(/Tổng tiền trả/).textContent).toContain("2.000.000");
  await user.clear(within(dialog).getByLabelText("Tiền trả Nguyễn Văn A"));
  await user.type(within(dialog).getByLabelText("Tiền trả Nguyễn Văn A"), "1200000");
  await user.selectOptions(within(dialog).getByLabelText("Phương thức thanh toán"), "BankTransfer");
  await user.type(within(dialog).getByLabelText("Ghi chú"), "Đợt 1");
  expect(within(dialog).getByText(/Tổng tiền trả/).textContent).toContain("1.200.000");
  await user.click(within(dialog).getByRole("button", { name: "Tạo phiếu chi" }));
  await waitFor(() => expect(state.repo.pay).toHaveBeenCalledTimes(1));
  const [sheetId, body] = state.repo.pay.mock.calls[0];
  expect(sheetId).toBe(ids.a);
  expect(body).toMatchObject({ method: "BankTransfer", note: "Đợt 1", lines: [{ slipId: ids.slipA, amount: 1_200_000 }] });
  expect(new Date(body.paidAt).toISOString()).toBe(body.paidAt);
  expect(onPaid).toHaveBeenCalledWith(1);
});

it("pay pop-up: refuses more than is owed or zero, and shows the API error", async () => {
  const user = userEvent.setup();
  render(<PayrollPayDialog sheet={finalized} onClose={vi.fn()} onPaid={vi.fn()} />);
  const dialog = screen.getByRole("dialog", { name: "Thanh toán lương" }), box = within(dialog).getByLabelText("Tiền trả Nguyễn Văn A");
  await user.clear(box); await user.type(box, "2500000");
  await user.click(within(dialog).getByRole("button", { name: "Tạo phiếu chi" }));
  expect((await within(dialog).findByText(/Từ 1 đến 2\.000\.000/)).textContent).toBeTruthy();
  expect(state.repo.pay).not.toHaveBeenCalled();
  await user.clear(box);
  expect((within(dialog).getByRole("button", { name: "Tạo phiếu chi" }) as HTMLButtonElement).disabled).toBe(true);
  await user.type(box, "100000");
  state.repo.pay.mockResolvedValueOnce(fail(400));
  await user.click(within(dialog).getByRole("button", { name: "Tạo phiếu chi" }));
  expect((await within(dialog).findAllByText("Vui lòng kiểm tra lại thông tin đã nhập.")).length).toBe(1);
});

it("the footer pays from the Phiếu lương tab and reports the vouchers and the cash book", async () => {
  state.repo.pay.mockResolvedValue(ok({ vouchers: [{ id: ids.pay, code: "PC1", slipId: ids.slipA, employeeName: "A", amount: 2_000_000 }] }));
  const onChanged = vi.fn(), user = userEvent.setup();
  render(<PayrollDetailFooter sheet={finalized} tab="slips" onChanged={onChanged} />);
  await user.click(screen.getByRole("button", { name: "Thanh toán" }));
  await user.click(within(screen.getByRole("dialog", { name: "Thanh toán lương" })).getByRole("button", { name: "Tạo phiếu chi" }));
  await waitFor(() => expect(onChanged).toHaveBeenCalledWith("Đã tạo 1 phiếu chi. Các phiếu chi xuất hiện trong Sổ quỹ."));
});

it("footer buttons are explicit type=button and never submit a surrounding form when the status changes", async () => {
  state.repo.exportSheet.mockResolvedValue(ok(true));
  const submit = vi.fn((event: { preventDefault(): void }) => event.preventDefault()), user = userEvent.setup();
  const view = (sheet: typeof finalized, tab: "info" | "slips") => <form onSubmit={submit}><PayrollDetailFooter sheet={sheet} tab={tab} onChanged={vi.fn()} /></form>;
  const { rerender } = render(view(detail({ status: "Provisional" }), "slips"));
  const group = () => screen.getByRole("group", { name: "Thao tác bảng lương" });
  const clickAll = async () => { for (const button of within(group()).getAllByRole("button")) await user.click(button); };
  expect(within(group()).getAllByRole("button").every((button) => button.getAttribute("type") === "button")).toBe(true);
  await clickAll();
  // Provisional -> Finalized at the same place: the right-hand "Chốt lương" node must not turn into a submit button.
  rerender(view(finalized, "slips"));
  expect(within(group()).getAllByRole("button").map((button) => button.textContent)).toEqual(["Xuất file", "Thanh toán"]);
  expect(within(group()).getAllByRole("button").every((button) => button.getAttribute("type") === "button")).toBe(true);
  await user.click(within(group()).getByRole("button", { name: "Xuất file" }));
  expect(submit).not.toHaveBeenCalled();
});

it("payments list shows wage payments and advances, searches and reports API errors", async () => {
  state.repo.payments.mockResolvedValue(ok({ items: [payment(), payment({ id: ids.b, voucherCode: "PC000002", kind: "Advance", payrollId: null, payrollCode: null, method: "BankTransfer", amount: 200_000, status: "Cancelled" })], total: 2, page: 1, pageSize: 15 }));
  const user = userEvent.setup();
  render(<PayrollPaymentsScreen />);
  const table = await screen.findByRole("table", { name: "Phiếu chi lương" });
  for (const heading of ["Mã phiếu chi", "Thời gian", "Nhân viên", "Bảng lương", "Loại", "Phương thức", "Số tiền", "Trạng thái"]) expect(within(table).getByRole("columnheader", { name: heading })).toBeTruthy();
  expect(within(table).getByText("BL000001")).toBeTruthy();
  expect(within(table).getByText("Tạm ứng")).toBeTruthy();
  expect(within(table).getByText("Trả lương")).toBeTruthy();
  expect(screen.getByTestId("payments-totals").textContent).toContain("500.000");
  expect(within(table).getByText("Tiền mặt")).toBeTruthy();
  expect(within(table).getByText("Chuyển khoản")).toBeTruthy();
  expect(within(table).getByText("Đã chi")).toBeTruthy();
  expect(within(table).getByText("Đã hủy")).toBeTruthy();
  expect(screen.getByRole("heading", { level: 1, name: "Thanh toán lương" })).toBeTruthy();
  await user.type(screen.getByPlaceholderText("Theo mã phiếu chi, nhân viên, bảng lương"), "PC0");
  await waitFor(() => expect(state.repo.payments.mock.calls.at(-1)![0]).toMatchObject({ search: "PC0", page: 1 }));
  state.repo.payments.mockResolvedValue(fail(503));
  await user.type(screen.getByPlaceholderText("Theo mã phiếu chi, nhân viên, bảng lương"), "1");
  expect((await screen.findByRole("alert")).textContent).toContain("Chưa kết nối được dịch vụ");
});

it("standalone payment: server search by name, and the advance option lists everyone", async () => {
  state.repo.payments.mockResolvedValue(ok({ items: [], total: 0, page: 1, pageSize: 15 }));
  state.repo.payable.mockImplementation(async (search: string, includeAll: boolean) => ok({ items: includeAll
    ? [{ employeeId: ids.empB, code: "NV002", name: "Trần Thị B", outstanding: 0 }]
    : search ? [{ employeeId: ids.empA, code: "NV001", name: "Nguyễn Văn A", outstanding: 2_000_000 }] : [] }));
  state.repo.payStandalone.mockResolvedValue(ok({ id: ids.pay }));
  const user = userEvent.setup();
  render(<PayrollPaymentsScreen />);
  await screen.findByText("Chưa có phiếu chi lương.");
  await user.click(screen.getByRole("button", { name: /Thanh toán lương/ }));
  const dialog = screen.getByRole("dialog", { name: "Thanh toán lương" });
  await within(dialog).findByRole("option", { name: "Không có nhân viên phù hợp" });
  await user.type(within(dialog).getByLabelText("Nhân viên"), "nguyen");
  await within(dialog).findByRole("option", { name: /Nguyễn Văn A/ });
  expect(state.repo.payable).toHaveBeenLastCalledWith("nguyen", false, expect.anything());
  await user.selectOptions(within(dialog).getByLabelText("Chọn nhân viên"), ids.empA);
  expect(within(dialog).queryByText(/tạm ứng lương/)).toBeNull();
  await user.click(within(dialog).getByRole("checkbox", { name: "Tạm ứng cho nhân viên không còn nợ" }));
  await within(dialog).findByRole("option", { name: /Trần Thị B/ });
  expect(state.repo.payable).toHaveBeenLastCalledWith("nguyen", true, expect.anything());
  await user.selectOptions(within(dialog).getByLabelText("Chọn nhân viên"), ids.empB);
  expect(within(dialog).getByText(/tạm ứng lương và sẽ được trừ vào kỳ lương tiếp theo/)).toBeTruthy();
  await user.click(within(dialog).getByRole("button", { name: "Tạo phiếu chi" }));
  expect(await within(dialog).findByText("Nhập số tiền lớn hơn 0.")).toBeTruthy();
  expect(state.repo.payStandalone).not.toHaveBeenCalled();
  await user.type(within(dialog).getByLabelText("Số tiền chi"), "300000");
  await user.click(within(dialog).getByRole("button", { name: "Tạo phiếu chi" }));
  await waitFor(() => expect(state.repo.payStandalone).toHaveBeenCalledWith(expect.objectContaining({ employeeId: ids.empB, amount: 300_000, method: "Cash", note: "" })));
  expect(await screen.findByText("Đã tạo phiếu chi. Phiếu chi xuất hiện trong Sổ quỹ.")).toBeTruthy();
  await waitFor(() => expect(state.repo.payments.mock.calls.length).toBeGreaterThan(1));
});

it("payments list: filters by loại, phương thức and trạng thái go to the server, and reset clears them", async () => {
  state.repo.payments.mockResolvedValue(ok({ items: [payment()], total: 1, page: 1, pageSize: 15 }));
  const user = userEvent.setup();
  render(<PayrollPaymentsScreen />);
  await screen.findByRole("table", { name: "Phiếu chi lương" });
  await user.selectOptions(screen.getByRole("combobox", { name: "Loại" }), "Advance");
  await waitFor(() => expect(state.repo.payments.mock.calls.at(-1)![0]).toMatchObject({ kind: "Advance", page: 1 }));
  await user.selectOptions(screen.getByRole("combobox", { name: "Phương thức" }), "BankTransfer");
  await user.selectOptions(screen.getByRole("combobox", { name: "Trạng thái" }), "Cancelled");
  await waitFor(() => expect(state.repo.payments.mock.calls.at(-1)![0]).toMatchObject({ kind: "Advance", method: "BankTransfer", status: "Cancelled" }));
  await user.click(screen.getByRole("button", { name: "Đặt lại" }));
  await waitFor(() => expect(state.repo.payments.mock.calls.at(-1)![0]).toMatchObject({ kind: "", method: "", status: "" }));
});

it("payments list: the totals row uses the backend summary, else sums the recorded vouchers of the page", async () => {
  const items = [payment(), payment({ id: ids.b, voucherCode: "PC000002", amount: 300_000, status: "Cancelled" })];
  state.repo.payments.mockResolvedValue(ok({ items, total: 2, page: 1, pageSize: 15 }));
  const first = render(<PayrollPaymentsScreen />);
  expect((await screen.findByTestId("payments-totals")).textContent).toContain("500.000");
  expect(screen.getByTestId("payments-totals").textContent).toContain("trang này");
  first.unmount();
  state.repo.payments.mockResolvedValue(ok({ items, total: 2, page: 1, pageSize: 15, summary: { amount: 9_000_000 } }));
  render(<PayrollPaymentsScreen />);
  await waitFor(() => expect(screen.getByTestId("payments-totals").textContent).toContain("9.000.000"));
  expect(screen.getByTestId("payments-totals").textContent).not.toContain("trang này");
});

it("payments list: a row opens its voucher in place with links to the sheet and the employee; an advance names no sheet", async () => {
  state.repo.payments.mockResolvedValue(ok({ items: [payment(), payment({ id: ids.b, voucherCode: "PC000002", kind: "Advance", payrollId: null, payrollCode: null })], total: 2, page: 1, pageSize: 15 }));
  const user = userEvent.setup();
  render(<PayrollPaymentsScreen />);
  const open = await screen.findByRole("button", { name: "Mở phiếu chi PC000001" });
  expect(open.getAttribute("aria-expanded")).toBe("false");
  await user.click(open);
  const detailPanel = await screen.findByRole("region", { name: "Chi tiết phiếu chi PC000001" });
  expect(within(detailPanel).getByRole("link", { name: "BL000001" }).getAttribute("href")).toBe(`/operations/payroll?recordId=${ids.a}&search=BL000001`);
  expect(within(detailPanel).getByRole("link", { name: "Nguyễn Văn A" }).getAttribute("href")).toContain(`/workspace/employees?recordId=${ids.empA}`);
  await user.click(screen.getByRole("button", { name: "Mở phiếu chi PC000002" }));
  expect((await screen.findByRole("region", { name: "Chi tiết phiếu chi PC000002" })).textContent).toContain("Tạm ứng ngoài bảng lương");
  await user.click(screen.getByRole("button", { name: "Thu gọn phiếu chi PC000002" }));
  expect(screen.queryByRole("region", { name: "Chi tiết phiếu chi PC000002" })).toBeNull();
});

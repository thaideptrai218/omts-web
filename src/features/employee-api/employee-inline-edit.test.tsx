// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { employeeDetailFixture, workingZoneId } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema, type Employee } from "./contracts";
import { EmployeeDetailPanel } from "./employee-detail-panel";

const jobId = "9429f1c0-b70f-42d6-9a9f-1c6a1e608c22";
const nextJobId = "20d6d85a-9acd-4ae2-935f-a72525a9c833";
const record = (): Employee => ({ ...employeeViewSchema.parse(employeeDetailFixture()), jobTypes: [{ id: jobId, name: "Thu hoạch", status: "In Use" }] });
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
async function setup(employee = record(), zoneStatus = 101) {
  repository.read.mockResolvedValue({ status: "success", data: employee });
  repository.write.mockResolvedValue({ status: "success", data: employee });
  const onSaved = vi.fn(), onGuardChange = vi.fn();
  render(<EmployeeDetailPanel id={employee.id} cache={new Map()} onOpen={vi.fn()} onSaved={onSaved}
    zones={[{ id: workingZoneId, code: "V01", name: "Vùng Đông", statusId: zoneStatus }]}
    jobTypes={[{ id: jobId, name: "Thu hoạch" }, { id: nextJobId, name: "Treo giống" }]}
    lookupsReady onGuardChange={onGuardChange} />);
  await screen.findByRole("tab", { name: "Thông tin" });
  return { employee, onSaved, onGuardChange };
}
const panel = () => within(screen.getByRole("tabpanel"));
function tab(name: string) { fireEvent.click(screen.getByRole("tab", { name })); }
function edit() { fireEvent.click(panel().getByRole("button", { name: "Chỉnh sửa" })); }
function save() { fireEvent.click(panel().getByRole("button", { name: "Lưu" })); }
function change(label: string, value: string) { fireEvent.change(panel().getByLabelText(label, { exact: true }), { target: { value } }); }
function expectPreserved(employee: Employee, overrides: Record<string, unknown>) {
  expect(repository.write).toHaveBeenCalledTimes(1);
  expect(repository.write.mock.calls[0][0]).toBe("update");
  expect(repository.write.mock.calls[0][3]).toBe(employee.id);
  expect(repository.write.mock.calls[0][1]).toEqual({
    code: employee.code, fullName: employee.fullName, phoneNumber: employee.phoneNumber, birthday: employee.birthday,
    gender: employee.gender, idNumber: employee.idNumber, startDate: employee.startDate,
    address: employee.address, area: employee.area, ward: employee.ward, otherInformation: employee.otherInformation,
    notes: employee.notes, bankAccount: employee.bankAccount, employeeType: employee.employeeType,
    jobTypeIds: [jobId], workingZoneIds: [workingZoneId], rowVersion: employee.rowVersion, ...overrides,
  });
}

it.each(["Thông tin", "Công việc", "Ngân hàng"])("discards only the %s draft without a write and restores edit focus", async (name) => {
  await setup(); tab(name); edit();
  if (name === "Thông tin") change("Ghi chú", "Nháp thông tin");
  if (name === "Công việc") fireEvent.click(panel().getByRole("checkbox", { name: "Treo giống" }));
  if (name === "Ngân hàng") change("Ngân hàng", "Ngân hàng nháp");
  fireEvent.click(panel().getByRole("button", { name: "Bỏ qua" }));
  await waitFor(() => expect(document.activeElement).toBe(panel().getByRole("button", { name: "Chỉnh sửa" })));
  expect(repository.write).not.toHaveBeenCalled();
  edit();
  if (name === "Thông tin") expect((panel().getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe(record().notes);
  if (name === "Công việc") expect((panel().getByRole("checkbox", { name: "Treo giống" }) as HTMLInputElement).checked).toBe(false);
  if (name === "Ngân hàng") expect((panel().getByLabelText("Ngân hàng") as HTMLInputElement).value).toBe(record().bankAccount!.bankName);
});

it("saves personal fields in place while preserving loaded job, zone, type and bank data", async () => {
  const { employee, onSaved } = await setup(); edit();
  await waitFor(() => expect(document.activeElement).toBe(panel().getByLabelText("Mã nhân viên")));
  change("Ghi chú", "Ghi chú mới"); save();
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(employee));
  expectPreserved(employee, { notes: "Ghi chú mới" });
  expect(screen.queryByRole("dialog")).toBeNull();
  await waitFor(() => expect(document.activeElement).toBe(panel().getByRole("button", { name: "Chỉnh sửa" })));
});

it("saves selected job types without changing personal, bank or zone fields", async () => {
  const { employee } = await setup(); tab("Công việc"); edit();
  fireEvent.click(panel().getByRole("checkbox", { name: "Thu hoạch" }));
  fireEvent.click(panel().getByRole("checkbox", { name: "Treo giống" })); save();
  await waitFor(() => expect(repository.write).toHaveBeenCalled());
  expectPreserved(employee, { jobTypeIds: [nextJobId] });
});

it("preserves saved inactive zones during a personal-tab save", async () => {
  const { employee } = await setup(record(), 102); edit(); change("Ghi chú", "Không đổi vùng cũ"); save();
  await waitFor(() => expect(repository.write).toHaveBeenCalled());
  expectPreserved(employee, { notes: "Không đổi vùng cũ" });
});

it("maps backend field errors below the personal field without opening a dialog", async () => {
  await setup();
  repository.write.mockResolvedValueOnce({ status: "error", httpStatus: 400, code: "MSG01", uncertain: false,
    employeeProblem: { kind: "invalid-fields", fields: ["Phone number"] } });
  edit(); change("Số điện thoại", "0911111111"); save();
  const phone = panel().getByLabelText("Số điện thoại");
  await waitFor(() => expect(phone.getAttribute("aria-invalid")).toBe("true"));
  expect(document.getElementById(phone.getAttribute("aria-describedby")!)?.textContent).toContain("Kiểm tra giá trị đã nhập");
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("requires at least one working zone in the work tab", async () => {
  await setup(); tab("Công việc"); edit();
  fireEvent.click(panel().getByRole("checkbox", { name: /Vùng Đông/ })); save();
  expect(repository.write).not.toHaveBeenCalled();
  expect(panel().getByText(/Chọn ít nhất một vùng làm việc/)).toBeTruthy();
});

it("saves bank fields without changing the rest of the employee", async () => {
  const { employee } = await setup(); tab("Ngân hàng"); edit(); change("Số tài khoản", "000111222333"); save();
  await waitFor(() => expect(repository.write).toHaveBeenCalled());
  expectPreserved(employee, { bankAccount: { ...employee.bankAccount, accountNumber: "000111222333" } });
});

it("clears all three bank fields as null without removing existing work assignments", async () => {
  const { employee } = await setup(); tab("Ngân hàng"); edit();
  for (const label of ["Ngân hàng", "Số tài khoản", "Chủ tài khoản"]) change(label, "");
  save(); await waitFor(() => expect(repository.write).toHaveBeenCalled());
  expectPreserved(employee, { bankAccount: null });
});

it("requires an effective date when the work tab changes employee type", async () => {
  const { employee } = await setup(); tab("Công việc"); edit(); change("Loại nhân viên", "SeasonalWorker"); save();
  expect(repository.write).not.toHaveBeenCalled();
  expect(panel().getByText(/Chọn ngày áp dụng loại nhân viên/)).toBeTruthy();
  // The date is picked from the kit's calendar (the same one as the time filter), not typed: open it and take the first selectable day.
  fireEvent.click(panel().getByRole("button", { name: /^Áp dụng từ ngày: chưa chọn/ }));
  const day = document.querySelector<HTMLButtonElement>("button.rdp-day_button:not([disabled])");
  expect(day).toBeTruthy();
  fireEvent.click(day!);
  save();
  await waitFor(() => expect(repository.write).toHaveBeenCalled());
  const body = repository.write.mock.calls[0][1] as { employeeType: string; employeeTypeFrom: string };
  expect(body.employeeType).toBe("SeasonalWorker");
  expect(body.employeeTypeFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expectPreserved(employee, { employeeType: "SeasonalWorker", employeeTypeFrom: body.employeeTypeFrom });
});

it("prevents duplicate submissions and keeps save pending until the request completes", async () => {
  const { employee, onSaved } = await setup(); let finish!: (value: unknown) => void;
  repository.write.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  edit(); change("Ghi chú", "Đang lưu"); save();
  // While the request is pending the shared Button swaps its label to "Đang xử lý..." and sets aria-busy.
  const button = panel().getByRole("button", { name: /Đang xử lý/ });
  expect(button.getAttribute("aria-busy")).toBe("true");
  expect((button as HTMLButtonElement).disabled).toBe(true);
  fireEvent.submit(button.closest("form")!); expect(repository.write).toHaveBeenCalledTimes(1);
  await act(async () => finish({ status: "success", data: employee }));
  expect(onSaved).toHaveBeenCalledTimes(1);
});

it("renders bank validation under the responsible input and never sends an incomplete account", async () => {
  await setup(); tab("Ngân hàng"); edit(); change("Số tài khoản", "123"); save();
  expect(repository.write).not.toHaveBeenCalled();
  const input = panel().getByLabelText("Số tài khoản", { exact: true });
  expect(input.getAttribute("aria-invalid")).toBe("true");
  const descriptions = input.getAttribute("aria-describedby")?.split(" ").map(id => document.getElementById(id));
  expect(descriptions?.some(node => node?.getAttribute("role") === "alert" || node?.textContent?.includes("kiểm tra"))).toBe(true);
});

it("keeps MSG06 comparison inline and preserves the draft until explicit review", async () => {
  await setup();
  const latest = { ...record(), notes: "Người khác sửa", rowVersion: "AQID" };
  repository.write.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG06", uncertain: false });
  repository.read.mockResolvedValue({ status: "success", data: latest });
  edit(); change("Ghi chú", "Nháp của tôi"); save();
  fireEvent.click(await screen.findByRole("button", { name: "Tải hồ sơ mới để đối chiếu" }));
  fireEvent.click(await screen.findByRole("button", { name: "Đã đối chiếu, giữ bản nháp để sửa tiếp" }));
  expect((panel().getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Nháp của tôi");
  expect(screen.queryByRole("dialog")).toBeNull();
  save(); await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(2));
  expect(repository.write.mock.calls[1][1]).toMatchObject({ rowVersion: "AQID", notes: "Nháp của tôi" });
});

it("renders a duplicate-phone comparison inline without losing the draft", async () => {
  await setup();
  repository.write.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG03", uncertain: false, employeeProblem: { kind: "duplicate-employee", existingEmployeeId: record().id } });
  edit(); change("Số điện thoại", "0911111111"); save();
  const compare = await screen.findByRole("button", { name: "Đối chiếu hồ sơ hiện có" });
  expect(repository.read).toHaveBeenCalledTimes(1);
  fireEvent.click(compare); await screen.findByText("Hồ sơ hiện tại trên hệ thống");
  expect((panel().getByLabelText("Số điện thoại") as HTMLInputElement).value).toBe("0911111111");
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("shows a Left-employee server rejection inline and retains the editable draft", async () => {
  await setup(); repository.write.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false });
  edit(); change("Ghi chú", "Giữ nháp"); save();
  expect((await screen.findByRole("alert")).textContent).toContain("Trạng thái hiện tại không cho phép thao tác");
  expect((panel().getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Giữ nháp");
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("asks inline before leaving a dirty tab; staying keeps the draft and discard permits navigation", async () => {
  await setup(); edit(); change("Ghi chú", "Nháp chưa lưu"); tab("Công việc");
  expect(screen.getByRole("tab", { name: "Thông tin" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText("Có thay đổi chưa lưu")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ở lại" }));
  expect((panel().getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Nháp chưa lưu");
  tab("Ngân hàng"); fireEvent.click(screen.getByRole("button", { name: "Bỏ thay đổi" }));
  expect(screen.getByRole("tab", { name: "Ngân hàng" }).getAttribute("aria-selected")).toBe("true");
  expect(repository.write).not.toHaveBeenCalled(); expect(screen.queryByRole("dialog")).toBeNull();
  tab("Thông tin"); edit(); expect((panel().getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe(record().notes);
});

it("guards a row-leave request until the user discards the dirty draft", async () => {
  const { onGuardChange } = await setup(); edit(); change("Ghi chú", "Nháp chặn chuyển dòng");
  const guard = onGuardChange.mock.calls.at(-1)![0], leave = vi.fn();
  act(() => guard(leave)); expect(leave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Ở lại" })); expect(leave).not.toHaveBeenCalled();
  act(() => onGuardChange.mock.calls.at(-1)![0](leave));
  fireEvent.click(screen.getByRole("button", { name: "Bỏ thay đổi" }));
  expect(leave).toHaveBeenCalledTimes(1); expect(repository.write).not.toHaveBeenCalled();
});

it("hides maintenance actions and protected fields when canMaintain is false", async () => {
  await setup({ ...record(), canMaintain: false });
  for (const name of ["Thông tin", "Công việc", "Ngân hàng"]) {
    tab(name); expect(panel().queryByRole("button", { name: "Chỉnh sửa" })).toBeNull();
  }
  expect(screen.queryByRole("button", { name: "Ngừng làm việc" })).toBeNull();
  expect(panel().getByRole("alert").textContent).toContain("không có quyền");
});

it.each(["Employed", "Left"] as const)("opens the existing %s status confirmation from the Công việc footer", async (status) => {
  await setup({ ...record(), status, lastWorkingDay: status === "Left" ? "2026-10-29" : null });
  // Owner decision 11/11/2026: the state action sits in the footer of Thông tin and Công việc (like Suppliers), not Ngân hàng.
  tab("Ngân hàng");
  expect(panel().queryByRole("button", { name: /Ngừng làm việc|Cho làm việc lại/ })).toBeNull();
  tab("Công việc"); fireEvent.click(panel().getByRole("button", { name: status === "Employed" ? "Ngừng làm việc" : "Cho làm việc lại" }));
  expect(screen.getByRole("dialog", { name: status === "Employed" ? "Nghỉ việc?" : "Cho làm việc lại?" })).toBeTruthy();
  expect(repository.write).not.toHaveBeenCalled();
});

it("replaces the clicked Chỉnh sửa button instead of mutating it into the submit button", async () => {
  // Real browsers run a button's default action AFTER the click handlers: if React turned this very <button> into the
  // submit "Lưu" button, the form would be submitted at once and the edit saved and closed without the user typing.
  await setup();
  const editButton = panel().getByRole("button", { name: "Chỉnh sửa" });
  fireEvent.click(editButton);
  const saveButton = panel().getByRole("button", { name: "Lưu" });
  expect(editButton.isConnected).toBe(false);
  expect(saveButton).not.toBe(editButton);
  expect(repository.write).not.toHaveBeenCalled();
});

it("offers Ngừng làm việc in the footer of the Thông tin tab as well as the Công việc tab", async () => {
  await setup();
  expect(panel().getByRole("button", { name: "Ngừng làm việc" })).toBeTruthy();
  tab("Công việc");
  expect(panel().getByRole("button", { name: "Ngừng làm việc" })).toBeTruthy();
});

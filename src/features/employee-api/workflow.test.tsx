// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { EmployeeApiEditor } from "./employee-screen";
import { employeeDetailFixture, workingZoneId } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
const fixture = () => employeeViewSchema.parse(employeeDetailFixture());
const props = () => ({ record: fixture(), zones: [{ id: workingZoneId, code: "V01", name: "Vùng Đông", statusId: 101 }], jobTypes: [{ id: "9429f1c0-b70f-42d6-9a9f-1c6a1e608c22", name: "Thu hoạch" }, { id: "20d6d85a-9acd-4ae2-935f-a72525a9c833", name: "Treo giống" }], lookupsReady: true, onClose: vi.fn(), onAdopt: vi.fn(), onSaved: vi.fn() });
beforeEach(() => vi.clearAllMocks()); afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("employee API editor lifecycle", () => {
  it("names the missing bank fields, describes the existing rule and focuses the first error without writing", async () => {
    render(<EmployeeApiEditor {...props()} record={null} />);
    fireEvent.change(screen.getByLabelText("Họ và tên *"), { target: { value: "QA employee" } });
    fireEvent.change(screen.getByLabelText("Loại nhân viên *"), { target: { value: "SeasonalWorker" } });
    fireEvent.change(screen.getByLabelText("Số điện thoại", { exact: true }), { target: { value: "0920000001" } });
    fireEvent.change(screen.getByLabelText("Ngân hàng", { exact: true }), { target: { value: "QA Bank" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    expect(screen.getByText("Số tài khoản: Vui lòng kiểm tra lại thông tin đã nhập.")).toBeTruthy();
    expect(screen.getByText("Chủ tài khoản: Vui lòng kiểm tra lại thông tin đã nhập.")).toBeTruthy();
    const accountNumber = screen.getByLabelText("Số tài khoản", { exact: true });
    expect(accountNumber.getAttribute("aria-invalid")).toBe("true");
    expect(accountNumber.getAttribute("aria-describedby")).toContain("employee-api-bank-help");
    await waitFor(() => expect(document.activeElement).toBe(accountNumber));
    expect(repository.write).not.toHaveBeenCalled();
  });
  it("shows the linked account read-only without a picker or unlink action", () => {
    render(<EmployeeApiEditor {...props()} />);
    expect(screen.getByText(/@fixture.an/)).toBeTruthy();
    expect(screen.getByText(/Nguyễn An/)).toBeTruthy();
    expect(screen.getByText(/Hoạt động/)).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: /Tài khoản/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Bỏ liên kết|Tải lại tài khoản/ })).toBeNull();
    expect(repository.read).not.toHaveBeenCalled();
    expect(repository.write).not.toHaveBeenCalled();
  });
  it("shows an absent account without offering linking", () => {
    render(<EmployeeApiEditor {...props()} record={{ ...fixture(), account: null }} />);
    expect(screen.getByText("Chưa có tài khoản")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: /Tài khoản/ })).toBeNull();
  });
  it("keeps a profile without maintenance permission read-only", () => {
    render(<EmployeeApiEditor {...props()} record={{ ...fixture(), canMaintain: false }} />);
    expect((screen.getByRole("button", { name: "Nghỉ việc" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Lưu hồ sơ" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(screen.getByRole("button", { name: "Lưu hồ sơ" }).closest("form")!);
    expect(repository.write).not.toHaveBeenCalled();
  });
  it("does not silently save or discard drafts to start an employment transition", async () => {
    render(<EmployeeApiEditor {...props()} />);
    fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp" } });
    fireEvent.click(screen.getByRole("button", { name: "Nghỉ việc" })); expect(screen.queryByRole("dialog", { name: "Nghỉ việc?" })).toBeNull(); expect(repository.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Hủy thay đổi" })); fireEvent.click(screen.getByRole("button", { name: "Nghỉ việc" }));
    expect(screen.getByRole("dialog", { name: "Nghỉ việc?" })).toBeTruthy(); expect(repository.write).not.toHaveBeenCalled();
  });
  it("confirms employment with lastWorkingDay and no obsolete follow-up", async () => {
    const callbacks = props(), next = { employee: { ...fixture(), status: "Left" as const, lastWorkingDay: "2026-10-29" } };
    repository.write.mockResolvedValue({ status: "success", data: next }); render(<EmployeeApiEditor {...callbacks} />);
    fireEvent.click(screen.getByRole("button", { name: "Nghỉ việc" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận nghỉ việc" }));
    await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledWith(next.employee, next));
    expect(repository.write).toHaveBeenCalledTimes(1); expect(repository.write.mock.calls[0][0]).toBe("end-employment");
    expect(repository.write.mock.calls[0][1]).toEqual({ rowVersion: fixture().rowVersion, lastWorkingDay: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
  });
  it("resumes a Left employee through the resume action", async () => {
    const callbacks = props(), next = { employee: fixture() };
    repository.write.mockResolvedValue({ status: "success", data: next });
    render(<EmployeeApiEditor {...callbacks} record={{ ...fixture(), status: "Left", lastWorkingDay: "2026-10-21" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Cho làm việc lại" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận cho làm việc lại" }));
    await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledWith(next.employee, next));
    expect(repository.write.mock.calls[0][0]).toBe("resume");
    expect(repository.write.mock.calls[0][1]).toEqual({ rowVersion: fixture().rowVersion });
  });
  it("requires an employee type on create and permits an absent phone", async () => {
    repository.write.mockResolvedValue({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...props()} record={null} />);
    fireEvent.change(screen.getByLabelText("Họ và tên *"), { target: { value: "Người mới" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Vùng Đông/ }));
    // Exercise schema validation too; browsers also enforce the required select.
    fireEvent.submit(screen.getByRole("button", { name: "Lưu hồ sơ" }).closest("form")!);
    expect(repository.write).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Loại nhân viên *").getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(screen.getByLabelText("Loại nhân viên *"), { target: { value: "Staff" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0][0]).toBe("create");
    expect(repository.write.mock.calls[0][1]).toMatchObject({ employeeType: "Staff", phoneNumber: null, jobTypeIds: [], workingZoneIds: [workingZoneId] });
    expect(repository.write.mock.calls[0][1]).not.toHaveProperty("accountId");
    expect(repository.write.mock.calls[0][1]).not.toHaveProperty("account");
    expect(repository.write.mock.calls[0][1]).not.toHaveProperty("ownerApproved");
    expect(repository.write.mock.calls[0][1]).not.toHaveProperty("rowVersion");
  });
  it("preserves the existing job types during an unrelated edit", async () => {
    const record = { ...fixture(), jobTypes: [{ id: "9429f1c0-b70f-42d6-9a9f-1c6a1e608c22", name: "Thu hoạch", status: "In Use" }] };
    repository.write.mockResolvedValue({ status: "success", data: record });
    render(<EmployeeApiEditor {...props()} record={record} />);
    expect((screen.getByRole("checkbox", { name: "Thu hoạch" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByLabelText("Áp dụng từ ngày *")).toBeNull();
    fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Giữ nguyên loại việc" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0][1]).toMatchObject({ jobTypeIds: [record.jobTypes[0].id], rowVersion: record.rowVersion });
    expect(repository.write.mock.calls[0][1]).not.toHaveProperty("employeeTypeFrom");
  });
  it("requires an effective date only when changing the employee type", async () => {
    repository.write.mockResolvedValue({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...props()} record={{ ...fixture(), employeeType: "SeasonalWorker" }} />);
    fireEvent.change(screen.getByLabelText("Loại nhân viên", { exact: true }), { target: { value: "Staff" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    expect(repository.write).not.toHaveBeenCalled();
    const date = screen.getByLabelText("Áp dụng từ ngày *");
    fireEvent.change(date, { target: { value: "01/11/2026" } });
    fireEvent.blur(date);
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0][1]).toMatchObject({ employeeType: "Staff", employeeTypeFrom: "2026-11-01" });
  });
  it("replaces job types with the explicitly selected list", async () => {
    const record = { ...fixture(), jobTypes: [{ id: "9429f1c0-b70f-42d6-9a9f-1c6a1e608c22", name: "Thu hoạch", status: "In Use" }] };
    repository.write.mockResolvedValue({ status: "success", data: record });
    render(<EmployeeApiEditor {...props()} record={record} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Thu hoạch" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Treo giống" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0][1].jobTypeIds).toEqual(["20d6d85a-9acd-4ae2-935f-a72525a9c833"]);
  });
  it("retains a conflict draft and only uses the explicitly reviewed rowVersion on the next save", async () => {
    const latest = { ...fixture(), notes: "Người khác sửa", rowVersion: "AQID" };
    repository.write.mockResolvedValueOnce({ status: "error", code: "MSG06", httpStatus: 409, uncertain: false }).mockResolvedValueOnce({ status: "success", data: latest }); repository.read.mockResolvedValue({ status: "success", data: latest });
    render(<EmployeeApiEditor {...props()} />); fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp của tôi" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" })); fireEvent.click(await screen.findByRole("button", { name: "Tải hồ sơ mới để đối chiếu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đã đối chiếu, giữ bản nháp để sửa tiếp" }));
    expect(repository.write).toHaveBeenCalledTimes(1); expect((screen.getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Bản nháp của tôi");
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" })); await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(2)); expect(repository.write.mock.calls[1][1].rowVersion).toBe("AQID");
  });
  it("never repeats an uncertain write, including after a successful comparison read", async () => {
    repository.write.mockResolvedValue({ status: "error", httpStatus: 401, uncertain: true }); repository.read.mockResolvedValue({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...props()} />); fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    fireEvent.click(await screen.findByRole("button", { name: "Tải hồ sơ mới để đối chiếu" })); await screen.findByText("Hồ sơ hiện tại trên hệ thống");
    expect(screen.queryByRole("button", { name: "Đã đối chiếu, giữ bản nháp để sửa tiếp" })).toBeNull(); expect((screen.getByRole("button", { name: "Lưu hồ sơ" }) as HTMLButtonElement).disabled).toBe(true); expect(repository.write).toHaveBeenCalledTimes(1);
  });
  it("blocks incomplete bank details and stopped working zones until the user fixes them", async () => {
    const callbacks = props(); callbacks.zones[0].statusId = 102; render(<EmployeeApiEditor {...callbacks} />);
    fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await screen.findByText("Vùng làm việc: Bỏ chọn vùng đã ngừng hoặc chưa có trong danh mục trước khi lưu."); expect(repository.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: /đã ngừng/ })); expect(screen.queryByRole("checkbox", { name: /Vùng Đông/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Số tài khoản", { exact: true }), { target: { value: "" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await screen.findByRole("alert"); expect(repository.write).not.toHaveBeenCalled(); expect(screen.getByLabelText("Số tài khoản", { exact: true }).getAttribute("aria-invalid")).toBe("true");
  });
  it("does not publish a save result after the editor unmounts", async () => {
    const callbacks = props(); let finish!: (result: unknown) => void; repository.write.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const view = render(<EmployeeApiEditor {...callbacks} />); fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    view.unmount(); finish({ status: "success", data: fixture() }); await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1)); expect(callbacks.onSaved).not.toHaveBeenCalled();
  });
  it("opens the linked employee for comparison only after a click and keeps the current draft", async () => {
    repository.write.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG03", uncertain: false, employeeProblem: { kind: "duplicate-employee", existingEmployeeId: fixture().id } }); repository.read.mockResolvedValue({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...props()} />); fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Nháp không mất" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    const button = await screen.findByRole("button", { name: "Đối chiếu hồ sơ hiện có" }); expect(repository.read).not.toHaveBeenCalled(); fireEvent.click(button); await screen.findByText("Hồ sơ hiện tại trên hệ thống"); expect((screen.getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Nháp không mất");
  });
  it("asks before discarding a draft and leaves the form intact on continue", () => {
    const callbacks = props(); render(<EmployeeApiEditor {...callbacks} />); fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Nháp" } }); fireEvent.click(screen.getByRole("button", { name: "Đóng hồ sơ" }));
    expect(callbacks.onClose).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: "Tiếp tục sửa" })); expect((screen.getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Nháp");
  });
  it("adopts reviewed data without reporting that another save took place", async () => {
    const callbacks = props(), latest = { ...fixture(), rowVersion: "AQID" };
    repository.write.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG06", uncertain: false }); repository.read.mockResolvedValue({ status: "success", data: latest });
    render(<EmployeeApiEditor {...callbacks} />); fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Nháp" } }); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    fireEvent.click(await screen.findByRole("button", { name: "Tải hồ sơ mới để đối chiếu" })); fireEvent.click(await screen.findByRole("button", { name: "Dùng dữ liệu đã lưu" }));
    expect(callbacks.onAdopt).toHaveBeenCalledWith(latest); expect(callbacks.onSaved).not.toHaveBeenCalled(); expect(repository.write).toHaveBeenCalledTimes(1);
  });
  it("does not submit twice while an employment request is pending", async () => {
    let finish!: (result: unknown) => void; repository.write.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<EmployeeApiEditor {...props()} />); fireEvent.click(screen.getByRole("button", { name: "Nghỉ việc" }));
    const dialog = screen.getByRole("dialog", { name: "Nghỉ việc?" }), button = within(dialog).getByRole("button", { name: "Xác nhận nghỉ việc" });
    fireEvent.submit(button.closest("form")!); fireEvent.submit(button.closest("form")!); expect(repository.write).toHaveBeenCalledTimes(1);
    finish({ status: "error", httpStatus: 409, code: "MSG11", uncertain: false }); await screen.findByText(/Bản ghi đang được sử dụng/);
  });
});

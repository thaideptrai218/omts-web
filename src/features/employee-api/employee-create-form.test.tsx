// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { EmployeeApiEditor } from "./employee-editor";
import { employeeDetailFixture, workingZoneId } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";

const fixture = () => employeeViewSchema.parse(employeeDetailFixture());
const jobId = "9429f1c0-b70f-42d6-9a9f-1c6a1e608c22";
const props = () => ({ zones: [{ id: workingZoneId, code: "V01", name: "Vùng Đông", statusId: 101 }], jobTypes: [{ id: jobId, name: "Thu hoạch" }], lookupsReady: true, onClose: vi.fn(), onAdopt: vi.fn(), onSaved: vi.fn() });
const toggle = (name: RegExp) => screen.getByRole("button", { name });
const expanded = (name: RegExp) => toggle(name).getAttribute("aria-expanded");
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
function fillRequired() {
  type("Họ và tên *", "Người mới");
  type("Loại nhân viên *", "Staff");
  fireEvent.click(screen.getByRole("checkbox", { name: /Vùng Đông/ }));
}
const save = () => fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("create employee dialog: groups", () => {
  it("opens basic info and work only, with Bỏ qua and Lưu in the footer and no unsupported fields", () => {
    render(<EmployeeApiEditor {...props()} />);
    expect(expanded(/Thông tin cơ bản/)).toBe("true");
    expect(expanded(/^Công việc/)).toBe("true");
    for (const name of [/Thông tin cá nhân/, /Thông tin ngân hàng/, /Tài khoản đăng nhập/]) expect(expanded(name)).toBe("false");
    expect(screen.getByRole("button", { name: "Bỏ qua" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lưu" })).toBeTruthy();
    for (const absent of [/Lương/, /Bảo hiểm/, /Phòng ban/, /Email/]) expect(screen.queryByLabelText(absent)).toBeNull();
    // New profile fields live in the groups that fit them: code, gender and start date are visible, CCCD sits in the collapsed personal group.
    expect((screen.getByLabelText("Mã nhân viên") as HTMLInputElement).placeholder).toBe("Tự động");
    expect(screen.getByText("Để trống để hệ thống tự sinh.")).toBeTruthy();
    expect(screen.getByLabelText("Giới tính")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ngày bắt đầu làm việc/ })).toBeTruthy();
  });
  it("keeps typed values while a group is collapsed and expanded again", () => {
    render(<EmployeeApiEditor {...props()} />);
    type("Họ và tên *", "Giữ nguyên tên");
    fireEvent.click(toggle(/Thông tin cá nhân/));
    expect(expanded(/Thông tin cá nhân/)).toBe("true");
    type("Địa chỉ", "12 Lê Lợi");
    fireEvent.click(toggle(/Thông tin cá nhân/));
    fireEvent.click(toggle(/Thông tin cơ bản/));
    expect(expanded(/Thông tin cơ bản/)).toBe("false");
    fireEvent.click(toggle(/Thông tin cá nhân/));
    fireEvent.click(toggle(/Thông tin cơ bản/));
    expect((screen.getByLabelText("Họ và tên *") as HTMLInputElement).value).toBe("Giữ nguyên tên");
    expect((screen.getByLabelText("Địa chỉ") as HTMLInputElement).value).toBe("12 Lê Lợi");
  });
  it("opens a collapsed group holding an error, marks it 'Có lỗi' and focuses the first invalid field", async () => {
    render(<EmployeeApiEditor {...props()} />);
    fireEvent.click(toggle(/Thông tin ngân hàng/));
    type("Ngân hàng", "QA Bank");
    fireEvent.click(toggle(/Thông tin ngân hàng/));
    fillRequired();
    expect(expanded(/Thông tin ngân hàng/)).toBe("false");
    save();
    expect(expanded(/Thông tin ngân hàng/)).toBe("true");
    expect(toggle(/Thông tin ngân hàng.*Có lỗi/).getAttribute("aria-expanded")).toBe("true");
    const number = screen.getByLabelText("Số tài khoản", { exact: true });
    expect(number.getAttribute("aria-invalid")).toBe("true");
    expect(number.getAttribute("aria-describedby")).toContain("employee-create-bank-help");
    await waitFor(() => expect(document.activeElement).toBe(number));
    expect(repository.write).not.toHaveBeenCalled();
  });
  it("opens the group from a server rejection and keeps every typed value", async () => {
    repository.write.mockResolvedValue({ status: "error", code: "MSG01", httpStatus: 400, uncertain: false, employeeProblem: { kind: "invalid-fields", fields: ["Bank account"] } });
    render(<EmployeeApiEditor {...props()} />);
    fillRequired();
    save();
    await waitFor(() => expect(toggle(/Thông tin ngân hàng.*Có lỗi/).getAttribute("aria-expanded")).toBe("true"));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Ngân hàng", { exact: true })));
    expect((screen.getByLabelText("Họ và tên *") as HTMLInputElement).value).toBe("Người mới");
  });
});

describe("create employee dialog: validation and save", () => {
  it("requires name, employee type and a zone, marks them invalid and focuses the first", async () => {
    render(<EmployeeApiEditor {...props()} />);
    save();
    const name = screen.getByLabelText("Họ và tên *");
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Loại nhân viên *").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Chọn ít nhất một vùng làm việc.")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Họ và tên");
    await waitFor(() => expect(document.activeElement).toBe(name));
    expect(repository.write).not.toHaveBeenCalled();
  });
  it("rejects an invalid phone number", () => {
    render(<EmployeeApiEditor {...props()} />);
    fillRequired();
    type("Số điện thoại", "12345");
    // The picker blocks future days, so a birthday error comes from a server rejection; here only the phone is checked.
    save();
    expect(screen.getByLabelText("Số điện thoại", { exact: true }).getAttribute("aria-invalid")).toBe("true");
    expect(repository.write).not.toHaveBeenCalled();
  });
  it("saves a minimal profile without phone or account and reports it", async () => {
    const callbacks = props();
    repository.write.mockResolvedValue({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...callbacks} />);
    fillRequired();
    fireEvent.click(screen.getByRole("checkbox", { name: "Thu hoạch" }));
    save();
    await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledWith(fixture()));
    expect(repository.write).toHaveBeenCalledTimes(1);
    const [action, body] = repository.write.mock.calls[0];
    expect(action).toBe("create");
    expect(body).toMatchObject({ fullName: "Người mới", phoneNumber: null, employeeType: "Staff", jobTypeIds: [jobId], workingZoneIds: [workingZoneId], bankAccount: null });
    for (const key of ["account", "rowVersion", "ownerApproved", "accountId"]) expect(body).not.toHaveProperty(key);
  });
  it("shows a pending state on Lưu and does not submit twice", async () => {
    let finish!: (result: unknown) => void;
    repository.write.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<EmployeeApiEditor {...props()} />);
    fillRequired();
    save();
    const button = await screen.findByRole("button", { name: "Đang xử lý..." });
    expect(button.getAttribute("aria-busy")).toBe("true");
    fireEvent.submit(button.closest("form")!);
    expect(repository.write).toHaveBeenCalledTimes(1);
    finish({ status: "success", data: fixture() });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Đang xử lý..." })).toBeNull());
  });
  it("offers the existing profile for comparison after a duplicate phone, only after a click, keeping the draft", async () => {
    repository.write.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG03", uncertain: false, employeeProblem: { kind: "duplicate-employee", existingEmployeeId: fixture().id } });
    repository.read.mockResolvedValue({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...props()} />);
    fillRequired();
    type("Số điện thoại", "0912345678");
    save();
    const compare = await screen.findByRole("button", { name: "Đối chiếu hồ sơ hiện có" });
    expect(repository.read).not.toHaveBeenCalled();
    fireEvent.click(compare);
    await screen.findByText("Hồ sơ hiện tại trên hệ thống");
    expect(repository.read).toHaveBeenCalledWith("detail", { id: fixture().id }, employeeViewSchema);
    expect((screen.getByLabelText("Họ và tên *") as HTMLInputElement).value).toBe("Người mới");
  });
  it("never repeats an uncertain write", async () => {
    repository.write.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: true });
    render(<EmployeeApiEditor {...props()} />);
    fillRequired();
    save();
    await screen.findByRole("button", { name: "Tải hồ sơ mới để đối chiếu" });
    expect((screen.getByRole("button", { name: "Lưu" }) as HTMLButtonElement).disabled).toBe(true);
    expect(repository.write).toHaveBeenCalledTimes(1);
  });
});

describe("create employee dialog: Bỏ qua", () => {
  it("closes at once when nothing was typed", () => {
    const callbacks = props();
    render(<EmployeeApiEditor {...callbacks} />);
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  });
  it("asks before discarding a draft, then discards without saving", () => {
    const callbacks = props();
    render(<EmployeeApiEditor {...callbacks} />);
    type("Họ và tên *", "Nháp");
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    expect(callbacks.onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục nhập" }));
    expect((screen.getByLabelText("Họ và tên *") as HTMLInputElement).value).toBe("Nháp");
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    fireEvent.click(screen.getByRole("button", { name: "Bỏ bản nháp" }));
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(repository.write).not.toHaveBeenCalled();
  });
});

describe("create employee dialog: birthday picker", () => {
  it("picks the birthday with the kit date picker and sends it as yyyy-mm-dd", async () => {
    repository.write.mockResolvedValue({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...props()} />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /^Ngày sinh: / }));
    fireEvent.click(document.querySelector<HTMLButtonElement>("button.rdp-day_button:not([disabled])")!);
    save();
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0][1].birthday).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
  });
});

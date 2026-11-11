// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { EmployeeApiEditor } from "./employee-editor";
import { employeeCreateReceiptSchema } from "./employee-create-contract";
import { employeeDetailFixture, workingZoneId } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";

const fixture = () => employeeViewSchema.parse(employeeDetailFixture());
const password = "Tmp-Pass-Once-7391";
const receipt = () => ({ employee: fixture(), temporaryPassword: password, temporaryPasswordExpiresAt: "2026-11-12T12:00:00+07:00", accountMessageCode: "MSG-ACCOUNT-23" as const });
const props = () => ({ zones: [{ id: workingZoneId, code: "V01", name: "Vùng Đông", statusId: 101 }], jobTypes: [], lookupsReady: true, onClose: vi.fn(), onAdopt: vi.fn(), onSaved: vi.fn() });
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
const save = () => fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
const accountSwitch = () => screen.getByRole("switch", { name: "Tạo tài khoản đăng nhập khi lưu" });
function fillProfile(phone = "0912345678") {
  type("Họ và tên *", "Người mới");
  type("Loại nhân viên *", "Staff");
  if (phone) type("Số điện thoại", phone);
  fireEvent.click(screen.getByRole("checkbox", { name: /Vùng Đông/ }));
}
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("create employee dialog: login account", () => {
  it("is off by default, hides the inputs and sends no account", async () => {
    repository.write.mockResolvedValue({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...props()} />);
    expect(screen.getByRole("button", { name: /Tài khoản đăng nhập/ }).getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /Tài khoản đăng nhập/ }));
    expect((accountSwitch() as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByLabelText("Tên đăng nhập *")).toBeNull();
    fillProfile();
    save();
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0][1]).not.toHaveProperty("account");
  });
  it("turning it on requires a username and a phone number and opens the group", async () => {
    render(<EmployeeApiEditor {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tài khoản đăng nhập/ }));
    fireEvent.click(accountSwitch());
    fillProfile("");
    save();
    expect(screen.getByLabelText("Tên đăng nhập *").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Số điện thoại", { exact: true }).getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("button", { name: /Tài khoản đăng nhập.*Có lỗi/ })).toBeTruthy();
    expect(repository.write).not.toHaveBeenCalled();
    // The account has no email: the group offers a username only.
    expect(screen.queryByLabelText(/Email/)).toBeNull();
  });
  it("sends the username, shows the one-time password, then clears it on acknowledgement", async () => {
    const callbacks = props();
    repository.write.mockResolvedValue({ status: "success", data: receipt() });
    render(<EmployeeApiEditor {...callbacks} />);
    fireEvent.click(screen.getByRole("button", { name: /Tài khoản đăng nhập/ }));
    fireEvent.click(accountSwitch());
    type("Tên đăng nhập *", "  nhanvien.moi ");
    fillProfile();
    save();
    const dialog = await screen.findByRole("dialog", { name: "Đã cấp tài khoản đăng nhập" });
    expect(within(dialog).getByLabelText("Mật khẩu tạm").textContent).toBe(password);
    expect(repository.write.mock.calls[0][1]).toMatchObject({ account: { username: "nhanvien.moi" }, phoneNumber: "0912345678" });
    expect(repository.write.mock.calls[0][2]).toBe(employeeCreateReceiptSchema);
    expect(callbacks.onSaved).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Thêm nhân viên" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Đã bàn giao, đóng" }));
    expect(callbacks.onSaved).toHaveBeenCalledTimes(1);
    expect(callbacks.onSaved).toHaveBeenCalledWith(fixture());
    expect(document.body.textContent).not.toContain(password);
    expect(callbacks.onSaved.mock.calls[0]).toHaveLength(1);
  });
  it("omits the account when the switch is turned off again but keeps what was typed", async () => {
    repository.write.mockResolvedValue({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tài khoản đăng nhập/ }));
    fireEvent.click(accountSwitch());
    type("Tên đăng nhập *", "giu.lai");
    fireEvent.click(accountSwitch());
    fireEvent.click(accountSwitch());
    expect((screen.getByLabelText("Tên đăng nhập *") as HTMLInputElement).value).toBe("giu.lai");
    fireEvent.click(accountSwitch());
    fillProfile();
    save();
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0][1]).not.toHaveProperty("account");
  });
  it("names a taken username next to the field and does not retry", async () => {
    repository.write.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-ACCOUNT-09", uncertain: false });
    render(<EmployeeApiEditor {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tài khoản đăng nhập/ }));
    fireEvent.click(accountSwitch());
    type("Tên đăng nhập *", "da.co");
    fillProfile();
    fireEvent.click(screen.getByRole("button", { name: /Tài khoản đăng nhập/ }));
    save();
    await waitFor(() => expect(screen.getByRole("button", { name: /Tài khoản đăng nhập.*Có lỗi/ }).getAttribute("aria-expanded")).toBe("true"));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Tên đăng nhập *")));
    expect(screen.getAllByText(/Tên đăng nhập hoặc số điện thoại đã được sử dụng/).length).toBeGreaterThan(0);
    expect((screen.getByLabelText("Họ và tên *") as HTMLInputElement).value).toBe("Người mới");
    expect(repository.write).toHaveBeenCalledTimes(1);
  });
});

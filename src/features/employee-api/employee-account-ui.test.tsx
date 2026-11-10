// @vitest-environment jsdom
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema, type Employee } from "./contracts";
import { EmployeeAccountTab } from "./employee-account-tab";
import { employeeAccountError } from "./employee-account-error";

vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children, title }: { children: ReactNode; title: string }) => <div role="dialog" aria-label={title}>{children}</div> }));
const fetchMock = vi.fn();
const secret = "Synthetic-Only-Temp!91";
const saved = () => employeeViewSchema.parse(employeeDetailFixture());
const withoutAccount = (): Employee => ({ ...saved(), account: null, hasStaffAccount: false });
function Harness() {
  const [employee, setEmployee] = useState(withoutAccount);
  return <EmployeeAccountTab employee={employee} onSaved={setEmployee} />;
}
function openAndFill() {
  fireEvent.click(screen.getByRole("button", { name: "Cấp tài khoản đăng nhập" }));
  fireEvent.change(screen.getByLabelText("Tên tài khoản *"), { target: { value: "fixture.an" } });
}
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("employee account handover", () => {
  it("shows one-time credentials, copies them and destroys the dialog on acknowledgement without transmitting a secret", async () => {
    const clipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboard } });
    fetchMock.mockResolvedValue(Response.json({ status: "success", data: { employee: saved(), temporaryPassword: secret, temporaryPasswordExpiresAt: "2026-11-11T12:00:00+07:00" } }));
    const local = vi.spyOn(Storage.prototype, "setItem");
    render(<Harness />); openAndFill();
    fireEvent.change(screen.getByLabelText("Email (không bắt buộc)"), { target: { value: "staff@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Cấp tài khoản" }));
    expect(await screen.findByText(secret)).toBeTruthy();
    expect(screen.getByText(/sẽ không được hiển thị lại/)).toBeTruthy();
    expect(screen.getByText("Hết hạn")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sao chép mật khẩu tạm" }));
    await waitFor(() => expect(clipboard).toHaveBeenCalledWith(secret));
    fireEvent.click(screen.getByRole("button", { name: "Đã bàn giao, đóng" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.textContent).not.toContain(secret);
    expect(screen.getByText("@fixture.an")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cấp tài khoản đăng nhập" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/operations/employees?");
    expect(JSON.parse(request.body)).toEqual({ action: "issue-account", id: saved().id, body: { username: "fixture.an", email: "staff@example.test" } });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(secret);
    expect(local).not.toHaveBeenCalled();
  });
  it("omits empty email, prevents double-submit and never replays an uncertain write", async () => {
    let finish!: (value: Response) => void;
    fetchMock.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<Harness />); openAndFill();
    const submit = screen.getByRole("button", { name: "Cấp tài khoản" }).closest("form")!;
    fireEvent.submit(submit); fireEvent.submit(submit);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).body).toEqual({ username: "fixture.an" });
    finish(Response.json({ status: "unavailable" }, { status: 503 }));
    await screen.findByText(/Chưa xác định được kết quả/);
    fireEvent.submit(submit);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: "Cấp tài khoản" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("retains entered values after a known failure and uses safe Vietnamese copy", async () => {
    fetchMock.mockResolvedValue(Response.json({ status: "error", code: "MSG-ACCOUNT-09", message: secret }, { status: 409 }));
    render(<Harness />); openAndFill();
    fireEvent.click(screen.getByRole("button", { name: "Cấp tài khoản" }));
    await screen.findByText(/đã được sử dụng/);
    expect((screen.getByLabelText("Tên tài khoản *") as HTMLInputElement).value).toBe("fixture.an");
    expect(document.body.textContent).not.toContain(secret);
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("requests a fresh detail read after closing an uncertain issuance", async () => {
    const refresh = vi.fn(), onSaved = vi.fn();
    fetchMock.mockResolvedValue(Response.json({ status: "unavailable" }, { status: 503 }));
    render(<EmployeeAccountTab employee={withoutAccount()} onSaved={onSaved} onRefresh={refresh} />);
    openAndFill();
    fireEvent.click(screen.getByRole("button", { name: "Cấp tài khoản" }));
    await screen.findByText(/Chưa xác định được kết quả/);
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("focuses invalid email before sending and has no account action for Left or inaccessible employees", () => {
    const view = render(<EmployeeAccountTab employee={withoutAccount()} onSaved={vi.fn()} />);
    openAndFill();
    fireEvent.change(screen.getByLabelText("Email (không bắt buộc)"), { target: { value: "invalid" } });
    fireEvent.click(screen.getByRole("button", { name: "Cấp tài khoản" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Email (không bắt buộc)"));
    expect(fetchMock).not.toHaveBeenCalled();
    view.unmount();
    const left = render(<EmployeeAccountTab employee={{ ...withoutAccount(), status: "Left" }} onSaved={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Cấp tài khoản đăng nhập" })).toBeNull();
    left.unmount();
    render(<EmployeeAccountTab employee={{ ...withoutAccount(), canMaintain: false }} onSaved={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Cấp tài khoản đăng nhập" })).toBeNull();
  });
  it.each([
    ["MSG-GEN-01", 400, /Kiểm tra tên tài khoản, email/],
    ["MSG-GEN-09", 409, /đã có tài khoản hoặc đã nghỉ việc/],
    ["MSG06", 409, /Hồ sơ đã thay đổi/],
    [undefined, 403, /Chỉ Chủ hợp tác xã/],
    ["MSG-GEN-08", 400, /Chỉ Chủ hợp tác xã/],
    [undefined, 401, /Phiên đăng nhập/],
    [undefined, 404, /Không tìm thấy/],
  ])("maps %s / %s defensively", (code, httpStatus, message) => {
    expect(employeeAccountError({ status: "error", code, httpStatus, uncertain: false })).toMatch(message);
  });
});

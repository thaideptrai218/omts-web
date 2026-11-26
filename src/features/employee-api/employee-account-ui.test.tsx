// @vitest-environment jsdom
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema, type Employee } from "./contracts";
import { EmployeeAccountTab } from "./employee-account-tab";
import { employeeAccountError } from "./employee-account-error";

vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children, title }: { children: ReactNode; title: string }) => <div role="dialog" aria-label={title}>{children}</div> }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: async () => ({ status: "success", data: [] }) }));
const fetchMock = vi.fn();
const secret = "Synthetic-Only-Temp!91";
const saved = () => employeeViewSchema.parse(employeeDetailFixture());
const withoutAccount = (): Employee => ({ ...saved(), account: null, hasStaffAccount: false });
const created = () => Response.json({ status: "success", data: { account: { id: saved().account!.id, username: "nguyen.van.an", displayName: "Nguyễn Văn An" }, temporaryPassword: secret, temporaryPasswordExpiresAt: "2026-11-11T12:00:00+07:00" } });
const open = () => fireEvent.click(screen.getByRole("button", { name: "Cấp tài khoản" }));
const dialog = () => within(screen.getByRole("dialog", { name: "Tạo tài khoản người dùng" }));
const submit = () => fireEvent.submit(dialog().getByRole("button", { name: "Lưu" }).closest("form")!);
function Harness({ onAccountChanged, onRefresh }: { onAccountChanged?(): void; onRefresh?(): void }) {
  const [employee, setEmployee] = useState(withoutAccount);
  return <EmployeeAccountTab employee={employee} onSaved={setEmployee} onAccountChanged={onAccountChanged} onRefresh={onRefresh} />;
}
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("employee account tab: Cấp tài khoản opens the shared create form", () => {
  it("fills the form from the employee, posts them as the linked employee, shows the password once and tells the list to refresh", async () => {
    const clipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboard } });
    fetchMock.mockResolvedValue(created());
    const local = vi.spyOn(Storage.prototype, "setItem"), changed = vi.fn(), refresh = vi.fn();
    render(<Harness onAccountChanged={changed} onRefresh={refresh} />); open();
    expect((dialog().getByLabelText("Tên hiển thị *") as HTMLInputElement).value).toBe("Nguyễn Văn An");
    expect((dialog().getByLabelText("Điện thoại *") as HTMLInputElement).value).toBe("0900000000");
    expect((dialog().getByLabelText("Tên đăng nhập *") as HTMLInputElement).value).toBe("nguyen.van.an");
    expect(dialog().getByText(/Hệ thống tạo mật khẩu tạm, hiện một lần sau khi lưu/)).toBeTruthy();
    expect(dialog().queryByLabelText(/Mật khẩu/)).toBeNull();
    submit();
    expect(await screen.findByText(secret)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sao chép mật khẩu tạm" }));
    await waitFor(() => expect(clipboard).toHaveBeenCalledWith(secret));
    fireEvent.click(screen.getByRole("button", { name: "Đã bàn giao, đóng" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.textContent).not.toContain(secret);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/accounts");
    expect(JSON.parse(request.body)).toEqual({ displayName: "Nguyễn Văn An", username: "nguyen.van.an", phoneNumber: "0900000000", email: null, employeeId: saved().id, grants: [], note: null });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(secret);
    expect(local).not.toHaveBeenCalled();
  });
  it("sends a chosen role together with the employee", async () => {
    fetchMock.mockResolvedValue(created());
    render(<Harness />); open();
    fireEvent.change(dialog().getByLabelText("Vai trò của dòng 1"), { target: { value: "ACCOUNTANT" } });
    submit();
    await screen.findByText(secret);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).grants).toEqual([{ zoneId: null, role: "ACCOUNTANT" }]);
  });
  it("prevents a double submit and never replays an uncertain write", async () => {
    let finish!: (value: Response) => void;
    fetchMock.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<Harness />); open();
    const form = dialog().getByRole("button", { name: "Lưu" }).closest("form")!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finish(Response.json({ status: "unavailable" }, { status: 503 }));
    await screen.findByText(/Chưa biết tài khoản đã được tạo chưa/);
    fireEvent.submit(form);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((dialog().getByRole("button", { name: "Lưu" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("keeps what was typed after a known failure and uses safe Vietnamese copy", async () => {
    fetchMock.mockResolvedValue(Response.json({ status: "rejected", code: "MSG-ACCOUNT-09", message: secret }, { status: 409 }));
    render(<Harness />); open(); submit();
    await screen.findByText(/đã có người dùng/);
    expect((dialog().getByLabelText("Tên đăng nhập *") as HTMLInputElement).value).toBe("nguyen.van.an");
    expect(document.body.textContent).not.toContain(secret);
    fireEvent.click(dialog().getByRole("button", { name: "Hủy" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("asks for the phone when the profile has none, without sending anything", () => {
    render(<EmployeeAccountTab employee={{ ...withoutAccount(), phoneNumber: "" }} onSaved={vi.fn()} />); open();
    submit();
    expect(screen.getByRole("alert").textContent).toMatch(/10 chữ số/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("says a seasonal worker has no login account and offers no way to create or link one", () => {
    render(<EmployeeAccountTab employee={{ ...withoutAccount(), employeeType: "SeasonalWorker" }} onSaved={vi.fn()} />);
    expect(screen.getByText(/Không có tài khoản đăng nhập/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cấp tài khoản" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Liên kết tài khoản có sẵn" })).toBeNull();
  });
  it("has no account action for a Left or inaccessible employee", () => {
    const left = render(<EmployeeAccountTab employee={{ ...withoutAccount(), status: "Left" }} onSaved={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Cấp tài khoản" })).toBeNull();
    left.unmount();
    render(<EmployeeAccountTab employee={{ ...withoutAccount(), canMaintain: false }} onSaved={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Cấp tài khoản" })).toBeNull();
  });
  it.each([
    ["MSG-GEN-01", 400, /kiểm tra tên đăng nhập và số điện thoại/],
    ["MSG-GEN-09", 409, /đã có tài khoản hoặc nhân viên đã nghỉ việc/],
    ["MSG06", 409, /Hồ sơ đã thay đổi/],
    [undefined, 403, /Chỉ Chủ hợp tác xã/],
    ["MSG-GEN-08", 400, /Chỉ Chủ hợp tác xã/],
    [undefined, 401, /Phiên đăng nhập/],
    [undefined, 404, /Không tìm thấy/],
  ])("maps %s / %s defensively", (code, httpStatus, message) => {
    expect(employeeAccountError({ status: "error", code, httpStatus, uncertain: false })).toMatch(message);
  });
});

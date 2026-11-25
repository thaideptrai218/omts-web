// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AccountLoginActions } from "./account-login-actions";

vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children, title }: { children: ReactNode; title: string }) => <div role="dialog" aria-label={title}>{children}</div> }));
const fetchMock = vi.fn();
const secret = "Synthetic-Reset-Temp!42";
const accountId = "33333333-3333-4333-8333-333333333333";
const account = { id: accountId, username: "fixture.an", displayName: "Nguyễn An" };
const record = (status: string) => ({ ...account, phoneNumber: "0912345678", email: null, status, employeeId: null, rowVersion: "rv2", pairs: [] });
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("login actions: copy username, reset password, lock", () => {
  it("copies the username and never shows a password before a reset", async () => {
    const clipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboard } });
    render(<AccountLoginActions account={account} status="Active" onStatusChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Sao chép tên đăng nhập" }));
    await waitFor(() => expect(clipboard).toHaveBeenCalledWith("fixture.an"));
    expect(screen.getByText("Đã sao chép tên đăng nhập.")).toBeTruthy();
    expect(screen.queryByLabelText("Mật khẩu tạm")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks for confirmation, then shows the new temporary password once with a copy button", async () => {
    const clipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboard } });
    fetchMock.mockResolvedValue(Response.json({ status: "success", data: { account, temporaryPassword: secret, temporaryPasswordExpiresAt: "2026-11-23T12:00:00+07:00" } }));
    render(<AccountLoginActions account={account} status="Active" onStatusChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog", { name: "Đặt lại mật khẩu?" })).getByRole("button", { name: "Đặt lại mật khẩu" }));
    expect(await screen.findByText(secret)).toBeTruthy();
    expect(String(fetchMock.mock.calls[0][0])).toContain(`/api/accounts/${accountId}/reset-password`);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ confirmed: true });
    fireEvent.click(screen.getByRole("button", { name: "Sao chép mật khẩu tạm" }));
    await waitFor(() => expect(clipboard).toHaveBeenCalledWith(secret));
    fireEvent.click(screen.getByRole("button", { name: "Đã bàn giao, đóng" }));
    expect(document.body.textContent).not.toContain(secret);
  });

  it("blocks the password reset of a locked login and offers to unlock it", () => {
    render(<AccountLoginActions account={account} status="Locked" onStatusChanged={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Đặt lại mật khẩu" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Mở khóa tài khoản" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Khóa tài khoản" })).toBeNull();
  });

  it("needs a reason to lock, sends it, and hands the saved account back", async () => {
    fetchMock.mockResolvedValue(Response.json({ status: "success", data: record("Locked") }));
    const changed = vi.fn();
    render(<AccountLoginActions account={account} status="Active" onStatusChanged={changed} />);
    fireEvent.click(screen.getByRole("button", { name: "Khóa tài khoản" }));
    const dialog = screen.getByRole("dialog", { name: "Khóa tài khoản?" });
    expect((within(dialog).getByRole("button", { name: "Khóa tài khoản" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText("Lý do khóa *"), { target: { value: "Nghỉ việc" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Khóa tài khoản" }));
    await screen.findByText("Đã khóa tài khoản.");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ action: "lock", id: accountId, body: { reason: "Nghỉ việc" } });
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ id: accountId, status: "Locked" }));
  });
});

// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { employeeDetailFixture } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
import { EmployeeAccountTab } from "./employee-account-tab";

vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children, title }: { children: ReactNode; title: string }) => <div role="dialog" aria-label={title}>{children}</div> }));
const fetchMock = vi.fn();
const secret = "Synthetic-Reset-Temp!42";
const employee = () => employeeViewSchema.parse(employeeDetailFixture());
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("employee account: copy username and reset password", () => {
  it("offers nothing to reset for a viewer who is not the Owner", () => {
    render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Đặt lại mật khẩu" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sao chép tên tài khoản" })).toBeNull();
  });
  it("copies the username and never shows a password before a reset", async () => {
    const clipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboard } });
    render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} canReset />);
    fireEvent.click(screen.getByRole("button", { name: "Sao chép tên tài khoản" }));
    await waitFor(() => expect(clipboard).toHaveBeenCalledWith("fixture.an"));
    expect(screen.getByText(/Mật khẩu chỉ hiện lúc này; bấm Đặt lại/)).toBeTruthy();
    expect(screen.queryByLabelText("Mật khẩu tạm")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("asks for confirmation, then shows the new temporary password once with a copy button", async () => {
    const clipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboard } });
    const accountId = employee().account!.id;
    fetchMock.mockResolvedValue(Response.json({ status: "success", data: { account: { id: accountId, username: "fixture.an", displayName: "Nguyễn An" }, temporaryPassword: secret, temporaryPasswordExpiresAt: "2026-11-23T12:00:00+07:00" } }));
    render(<EmployeeAccountTab employee={employee()} onSaved={vi.fn()} canReset />);
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    expect(fetchMock).not.toHaveBeenCalled();
    const confirm = screen.getByRole("dialog", { name: "Đặt lại mật khẩu?" });
    fireEvent.click(within(confirm).getByRole("button", { name: "Đặt lại mật khẩu" }));
    expect(await screen.findByText(secret)).toBeTruthy();
    expect(String(fetchMock.mock.calls[0][0])).toContain(`/api/accounts/${accountId}/reset-password`);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ confirmed: true });
    fireEvent.click(screen.getByRole("button", { name: "Sao chép mật khẩu tạm" }));
    await waitFor(() => expect(clipboard).toHaveBeenCalledWith(secret));
    fireEvent.click(screen.getByRole("button", { name: "Đã bàn giao, đóng" }));
    expect(document.body.textContent).not.toContain(secret);
  });
  it("blocks the reset of a locked account", () => {
    const locked = { ...employee(), account: { ...employee().account!, status: "Locked" as const } };
    render(<EmployeeAccountTab employee={locked} onSaved={vi.fn()} canReset />);
    expect((screen.getByRole("button", { name: "Đặt lại mật khẩu" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

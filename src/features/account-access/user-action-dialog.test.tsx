// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { UserActionDialog } from "./user-action-dialog";

afterEach(cleanup);
const props = { title: "Khóa tài khoản?", body: "Người dùng sẽ bị đăng xuất.", confirmLabel: "Khóa tài khoản", pendingLabel: "Đang khóa...", onClose: vi.fn() };

describe("account action dialog", () => {
  it("marks the reason required and says why the confirm button is disabled", () => {
    render(<UserActionDialog {...props} reasonLabel="Lý do khóa" onConfirm={vi.fn()} />);
    const confirm = screen.getByRole("button", { name: "Khóa tài khoản" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(document.getElementById(confirm.getAttribute("aria-describedby")!)?.textContent).toMatch(/Nhập lý do/);
    expect((screen.getByLabelText("Lý do khóa *") as HTMLTextAreaElement).required).toBe(true);
    fireEvent.change(screen.getByLabelText("Lý do khóa *"), { target: { value: "  Nghỉ việc " } });
    expect(confirm.disabled).toBe(false);
    expect(screen.queryByText(/Nhập lý do để bấm/)).toBeNull();
  });
  it("stays visible with a pending button until the action settles", async () => {
    let finish!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((done) => { finish = done; }));
    render(<UserActionDialog {...props} reasonLabel="Lý do khóa" onConfirm={onConfirm} />);
    fireEvent.change(screen.getByLabelText("Lý do khóa *"), { target: { value: "Nghỉ việc" } });
    fireEvent.click(screen.getByRole("button", { name: "Khóa tài khoản" }));
    expect(onConfirm).toHaveBeenCalledWith("Nghỉ việc");
    const pending = screen.getByRole("button", { name: "Đang khóa..." }) as HTMLButtonElement;
    expect(pending.disabled).toBe(true);
    expect(screen.getByRole("dialog")).toBeTruthy();
    await act(async () => { finish(); });
    expect(screen.getByRole("button", { name: "Khóa tài khoản" })).toBeTruthy();
  });
  it("needs no reason for a plain confirmation", () => {
    const onConfirm = vi.fn(async () => undefined);
    render(<UserActionDialog {...props} title="Đặt lại mật khẩu?" confirmLabel="Đặt lại mật khẩu" onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const execute = vi.hoisted(() => vi.fn());
vi.mock("./repository", () => ({ createVerificationRepository: () => ({ execute }) }));
import { VerificationPanel } from "./verification-panel";
const challenge = (phase: "code" | "verified" = "code") => ({ id: "122bb318-a72e-49aa-a8d7-a6169f889007", purpose: "contact", phase, channel: "Email", maskedTarget: "q***@example.test", expiresAt: new Date(Date.now() + 300_000).toISOString(), nextResendAt: new Date(Date.now() + 60_000).toISOString(), sendsLeft: 2 });
beforeEach(() => execute.mockReset()); afterEach(() => cleanup());
describe("G2 OTP panel", () => {
  it("clears current password after sending and keeps OTP local to the verify request", async () => {
    execute.mockResolvedValueOnce({ status: "empty" }).mockResolvedValueOnce({ status: "success", flow: challenge() }).mockResolvedValueOnce({ status: "error", code: "MSG16", uncertain: false }); render(<VerificationPanel purpose="contact" />);
    await screen.findByRole("button", { name: "Gửi mã xác minh" }); fireEvent.change(screen.getByRole("textbox", { name: "Email cần xác minh" }), { target: { value: "qa@example.test" } }); fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/), { target: { value: "Private123" } }); fireEvent.click(screen.getByRole("button", { name: "Gửi mã xác minh" }));
    const otp = await screen.findByRole("textbox", { name: "Mã xác minh gồm 6 chữ số" }); fireEvent.change(otp, { target: { value: "123456" } }); fireEvent.click(screen.getByRole("button", { name: "Xác minh mã" })); await screen.findByRole("alert"); expect((otp as HTMLInputElement).value).toBe(""); expect(execute.mock.calls.at(-1)?.[0]).toMatchObject({ op: "verify", code: "123456" });
  });
  it("returns verified contact to the profile without calling complete", async () => {
    execute.mockResolvedValueOnce({ status: "success", flow: challenge() }).mockResolvedValueOnce({ status: "success", flow: challenge("verified") }); const ready = vi.fn(); render(<VerificationPanel purpose="contact" onReady={ready} />);
    fireEvent.change(await screen.findByRole("textbox", { name: "Mã xác minh gồm 6 chữ số" }), { target: { value: "123456" } }); fireEvent.click(screen.getByRole("button", { name: "Xác minh mã" })); await waitFor(() => expect(ready).toHaveBeenCalled()); expect(execute.mock.calls.some(([input]) => input.op === "complete")).toBe(false);
  });
  it("does not unlock an ambiguous write after a manual status read", async () => {
    execute.mockResolvedValueOnce({ status: "success", flow: challenge() }).mockResolvedValueOnce({ status: "error", uncertain: true }).mockResolvedValueOnce({ status: "success", flow: challenge("verified") }); render(<VerificationPanel purpose="contact" />);
    fireEvent.change(await screen.findByRole("textbox", { name: "Mã xác minh gồm 6 chữ số" }), { target: { value: "123456" } }); fireEvent.click(screen.getByRole("button", { name: "Xác minh mã" })); fireEvent.click(await screen.findByRole("button", { name: "Kiểm tra trạng thái lượt xác minh" }));
    await screen.findByText(/Đã xác minh · Hết hạn/); expect(screen.queryByRole("button", { name: "Dùng liên hệ đã xác minh" })).toBeNull(); expect(execute).toHaveBeenCalledTimes(3);
  });
  it("does not deliver late verification to a closed editor", async () => {
    let finish!: (result: unknown) => void; execute.mockResolvedValueOnce({ status: "success", flow: challenge() }).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })); const ready = vi.fn(), panel = render(<VerificationPanel purpose="contact" onReady={ready} />);
    fireEvent.change(await screen.findByRole("textbox", { name: "Mã xác minh gồm 6 chữ số" }), { target: { value: "123456" } }); fireEvent.click(screen.getByRole("button", { name: "Xác minh mã" })); panel.unmount(); finish({ status: "success", flow: challenge("verified") }); await Promise.resolve(); await Promise.resolve(); expect(ready).not.toHaveBeenCalled();
  });
});

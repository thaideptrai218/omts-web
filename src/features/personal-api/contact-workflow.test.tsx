// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { VerificationView } from "@/features/verification-api/contracts";
const mocks = vi.hoisted(() => ({ saveProfile: vi.fn(), profile: vi.fn(), execute: vi.fn() }));
vi.mock("./repository", () => ({ createPersonalRepository: () => mocks }));
vi.mock("@/features/verification-api/repository", () => ({ createVerificationRepository: () => mocks }));
vi.mock("@/features/verification-api/verification-panel", () => ({ verificationError: () => "Lỗi liên hệ cần xác minh lại.", VerificationPanel: ({ onReady }: { onReady(flow: VerificationView): void }) => <button onClick={() => onReady(flow())}>Hoàn tất OTP</button> }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { PersonalApiEditor } from "./profile-screen";
import { personalFixture } from "./fixtures";
function flow(): VerificationView { return { id: "122bb318-a72e-49aa-a8d7-a6169f889007", purpose: "contact", phase: "verified", channel: "Email", maskedTarget: "n***@example.test", expiresAt: new Date(Date.now() + 600_000).toISOString(), nextResendAt: null, sendsLeft: 2 }; }
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
function choose() { click("Đổi email"); click("Hoàn tất OTP"); }
beforeEach(() => vi.clearAllMocks()); afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("approved G2 profile partial saves", () => {
  it("OTP alone changes no data; explicit Save consumes only the pending contact", async () => {
    mocks.execute.mockResolvedValue({ status: "completed", profile: { ...personalFixture(), email: "new@example.test" } }); render(<PersonalApiEditor initial={personalFixture()} />); choose();
    expect(mocks.execute).not.toHaveBeenCalled(); expect(mocks.saveProfile).not.toHaveBeenCalled(); expect(screen.getByText(/Đã xác minh, chờ Lưu thay đổi/)).toBeTruthy();
    click("Lưu thay đổi"); await screen.findByText("Đã lưu thông tin liên hệ."); expect(mocks.execute).toHaveBeenCalledWith({ op: "complete", purpose: "contact", id: flow().id }); expect(mocks.saveProfile).not.toHaveBeenCalled();
  });
  it("reports saved name and retains the failed contact draft; re-verification does not repeat the name write", async () => {
    const named = { ...personalFixture(), displayName: "Tên QA mới", rowVersion: "after-name" }; mocks.saveProfile.mockResolvedValue({ status: "success", data: named }); mocks.execute.mockResolvedValueOnce({ status: "error", code: "MSG16", uncertain: false }).mockResolvedValueOnce({ status: "completed", profile: { ...named, email: "new@example.test", rowVersion: "after-contact" } });
    render(<PersonalApiEditor initial={personalFixture()} />); fireEvent.change(screen.getByRole("textbox", { name: "Tên hiển thị" }), { target: { value: named.displayName } }); choose(); click("Lưu thay đổi");
    await screen.findByText(/Tên hiển thị đã được lưu. Phần liên hệ chưa được xác nhận/); expect(screen.getByText(/n\*\*\*@example.test.*Cần xác minh lại/)).toBeTruthy(); expect((screen.getByRole("textbox", { name: "Tên hiển thị" }) as HTMLInputElement).value).toBe(named.displayName);
    choose(); click("Lưu thay đổi"); await screen.findByText("Đã lưu thông tin liên hệ."); expect(mocks.saveProfile).toHaveBeenCalledTimes(1); expect(mocks.execute).toHaveBeenCalledTimes(2);
  });
  it("does not consume contact proof if the name write conflicts", async () => {
    mocks.saveProfile.mockResolvedValue({ status: "error", code: "MSG06", httpStatus: 409 }); render(<PersonalApiEditor initial={personalFixture()} />); choose(); fireEvent.change(screen.getByRole("textbox", { name: "Tên hiển thị" }), { target: { value: "Tên nháp" } }); click("Lưu thay đổi");
    await screen.findByText(/Bản ghi đã thay đổi/); expect(mocks.execute).not.toHaveBeenCalled(); expect(screen.getByText(/chờ Lưu thay đổi/)).toBeTruthy();
  });
  it("cancel before Save discards proof without confirming contact or changing saved metadata", async () => {
    mocks.execute.mockResolvedValue({ status: "cancelled" }); render(<PersonalApiEditor initial={personalFixture()} />); choose(); click("Hủy thay đổi"); click("Bỏ thay đổi");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull()); expect(mocks.execute).toHaveBeenCalledWith({ op: "cancel", purpose: "contact", id: flow().id }); expect(mocks.saveProfile).not.toHaveBeenCalled();
  });
  it("keeps an uncertain contact write blocked after reading the saved profile", async () => {
    mocks.execute.mockResolvedValue({ status: "error", uncertain: true }); mocks.profile.mockResolvedValue({ status: "success", data: personalFixture() }); render(<PersonalApiEditor initial={personalFixture()} />); choose(); click("Lưu thay đổi"); await screen.findByText(/Lỗi liên hệ/); click("Tải hồ sơ mới để đối chiếu"); await screen.findByText(/Tên đã lưu:/);
    expect((screen.getByRole("button", { name: "Lưu thay đổi" }) as HTMLButtonElement).disabled).toBe(true); expect(mocks.execute).toHaveBeenCalledTimes(1);
  });
  it("stops the second endpoint if the editor unmounts after the name response", async () => {
    let finish!: (value: unknown) => void; mocks.saveProfile.mockReturnValue(new Promise((resolve) => { finish = resolve; })); const editor = render(<PersonalApiEditor initial={personalFixture()} />); choose(); fireEvent.change(screen.getByRole("textbox", { name: "Tên hiển thị" }), { target: { value: "Tên nháp" } }); click("Lưu thay đổi"); editor.unmount(); finish({ status: "success", data: { ...personalFixture(), displayName: "Tên nháp" } }); await Promise.resolve(); await Promise.resolve(); expect(mocks.execute).not.toHaveBeenCalled();
  });
});

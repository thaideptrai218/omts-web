// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { VerificationDialog } from "./verification-dialog";
import { createMockVerificationRepository } from "../repositories/mock-verification-repository";
import { createVerificationService } from "../services/verification-service";
import type { VerificationChallenge, VerifyCodeResult } from "../domain/verification-types";
vi.mock("./verification-dialog-shell", () => ({
  VerificationDialogShell: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div role="dialog">{children}</div> : null,
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function setup() {
  const service = createVerificationService(createMockVerificationRepository({ latencyMs: 0 }));
  const challenge: VerificationChallenge = {
    requestId: "request-a", purpose: "email-change", recipient: { channel: "email", maskedValue: "a***@omts.test" },
    expiresAtMs: Date.now() + 300000, resendAvailableAtMs: Date.now() - 1000, sendsRemaining: 2,
  };
  let resolve!: (result: VerifyCodeResult) => void;
  const promise = new Promise<VerifyCodeResult>((done) => { resolve = done; });
  const verify = vi.spyOn(service, "verify").mockReturnValue(promise);
  const resend = vi.spyOn(service, "resend");
  const props = { challenge, service, onChallengeChange: vi.fn(), onVerified: vi.fn(), onOpenChange: vi.fn(), open: true };
  const view = render(<VerificationDialog {...props} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "123456" } });
  return { ...view, props, verify, resend, resolve };
}
it("ignores verification completed after closing the dialog", async () => {
  const view = setup(); fireEvent.click(screen.getByRole("button", { name: "Xác minh" }));
  await waitFor(() => expect(view.verify).toHaveBeenCalledOnce());
  view.rerender(<VerificationDialog {...view.props} open={false} />);
  await act(async () => view.resolve({ status: "verified", token: "old-fixture-proof" }));
  expect(view.props.onVerified).not.toHaveBeenCalled();
});
it("blocks resend during verification", async () => {
  const view = setup(); fireEvent.click(screen.getByRole("button", { name: "Xác minh" }));
  await waitFor(() => expect(view.verify).toHaveBeenCalledOnce());
  expect((screen.getByRole("button", { name: "Gửi lại mã" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Gửi lại mã" }));
  expect(view.resend).not.toHaveBeenCalled();
  await act(async () => view.resolve({ status: "rejected", reason: "invalid-or-expired", attemptsRemaining: 4 }));
  expect((screen.getByRole("button", { name: "Gửi lại mã" }) as HTMLButtonElement).disabled).toBe(false);
});
it("does not hand off a second verify synchronously", async () => {
  const view = setup();
  view.verify.mockImplementation(() => {
    if (view.verify.mock.calls.length === 1) fireEvent.submit(screen.getByRole("button", { name: "Xác minh" }).closest("form")!);
    return Promise.resolve({ status: "rejected", reason: "invalid-or-expired", attemptsRemaining: 4 });
  });
  fireEvent.click(screen.getByRole("button", { name: "Xác minh" }));
  await screen.findByText(/Còn 4 lần nhập/);
  expect(view.verify).toHaveBeenCalledOnce();
});

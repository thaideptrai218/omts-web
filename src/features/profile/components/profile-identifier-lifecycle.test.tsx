// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProfileIdentifierDialog } from "./profile-identifier-dialog";
import { createMockPersonalProfileEnvironment } from "../repositories/mock-personal-profile-environment";
import type { StartProfileIdentifierChangeResult } from "../domain/personal-profile";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, onOpenChange, open }: { children: React.ReactNode; onOpenChange(open: boolean): void; open: boolean }) =>
    open ? <div role="dialog"><button onClick={() => onOpenChange(false)}>Đóng</button>{children}</div> : null,
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function setup() {
  const service = createMockPersonalProfileEnvironment({ latencyMs: 0 }).profileService;
  let resolve!: (result: StartProfileIdentifierChangeResult) => void;
  const promise = new Promise<StartProfileIdentifierChangeResult>((done) => { resolve = done; });
  const start = vi.spyOn(service, "startIdentifierChange").mockReturnValue(promise);
  const onStarted = vi.fn();
  const onOpenChange = vi.fn();
  const props = { currentValue: null, kind: "email" as const, onOpenChange, onStarted, open: true, service };
  const view = render(<ProfileIdentifierDialog {...props} />);
  fireEvent.change(screen.getByRole("textbox", { name: /Email mới/ }), { target: { value: "new@omts.test" } });
  return { ...view, props, resolve, start, onStarted, onOpenChange };
}
function submit() { fireEvent.submit(screen.getByRole("button", { name: "Gửi mã xác minh" }).closest("form")!); }

it("does not send after unmount during candidate validation", async () => {
  const view = setup(); submit(); view.unmount();
  await act(async () => {});
  expect(view.start).not.toHaveBeenCalled();
});
it("does not publish expiry from a closed identifier form", async () => {
  const expiry = vi.spyOn(sessionExpiryChannel, "publish");
  const view = setup(); submit(); await waitFor(() => expect(view.start).toHaveBeenCalledOnce());
  view.rerender(<ProfileIdentifierDialog {...view.props} open={false} />);
  await act(async () => view.resolve({ status: "session-expired", message: { code: "MSG19" } }));
  expect(expiry).not.toHaveBeenCalled();
});
it("does not reopen verification from an older opening", async () => {
  const view = setup(); submit(); await waitFor(() => expect(view.start).toHaveBeenCalledOnce());
  view.rerender(<ProfileIdentifierDialog {...view.props} open={false} />);
  view.rerender(<ProfileIdentifierDialog {...view.props} />);
  await act(async () => view.resolve({ status: "verification-started", challenge: {
    requestId: "old-request", purpose: "email-change", recipient: { channel: "email", maskedValue: "n***@omts.test" },
    expiresAtMs: Date.now() + 300000, resendAvailableAtMs: Date.now() + 60000, sendsRemaining: 2,
  } }));
  expect(view.onStarted).not.toHaveBeenCalled();
  expect((screen.getByRole("textbox", { name: /Email mới/ }) as HTMLInputElement).value).toBe("");
});

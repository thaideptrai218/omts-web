// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ChangePasswordDialog } from "./change-password-dialog";
import type { CurrentPasswordChangeResult } from "../domain/change-password";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify }) }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, onOpenChange, open, dismissible = true }: { children: React.ReactNode; onOpenChange(open: boolean): void; open: boolean; dismissible?: boolean }) =>
    open ? <div role="dialog"><button onClick={() => onOpenChange(false)}>Escape fixture</button>{dismissible && <button onClick={() => onOpenChange(false)}>Đóng</button>}{children}</div> : null,
}));
afterEach(() => { cleanup(); notify.mockClear(); vi.restoreAllMocks(); });
function setup() {
  let resolve!: (result: CurrentPasswordChangeResult) => void;
  const promise = new Promise<CurrentPasswordChangeResult>((done) => { resolve = done; });
  const service = { changeWithCurrentPassword: vi.fn().mockReturnValue(promise) };
  const onOpenChange = vi.fn();
  const props = { open: true, service, onOpenChange };
  const view = render(<ChangePasswordDialog {...props} />);
  for (const label of [/Mật khẩu hiện tại/, /^Mật khẩu mới/, /Nhập lại mật khẩu mới/]) {
    fireEvent.change(screen.getByLabelText(label, { selector: "input" }), { target: { value: ["Demo", "1234"].join("") } });
  }
  return { ...view, props, service, resolve, onOpenChange };
}
function submit() { fireEvent.submit(screen.getByRole("button", { name: "Đổi mật khẩu" }).closest("form")!); }
it("does not send a password command after unmount during validation", async () => {
  const view = setup(); submit(); view.unmount(); await act(async () => {});
  expect(view.service.changeWithCurrentPassword).not.toHaveBeenCalled();
});
it("clears password fields on close and ignores an older success", async () => {
  const view = setup(); submit(); await waitFor(() => expect(view.service.changeWithCurrentPassword).toHaveBeenCalledOnce());
  view.rerender(<ChangePasswordDialog {...view.props} open={false} />);
  view.rerender(<ChangePasswordDialog {...view.props} />);
  await act(async () => view.resolve({ status: "changed", message: { code: "MSG18" } }));
  expect(view.onOpenChange).not.toHaveBeenCalled(); expect(notify).not.toHaveBeenCalled();
  expect((screen.getByLabelText(/Mật khẩu hiện tại/, { selector: "input" }) as HTMLInputElement).value).toBe("");
});
it("ignores a stale password session-expired response", async () => {
  const expiry = vi.spyOn(sessionExpiryChannel, "publish");
  const view = setup(); submit(); await waitFor(() => expect(view.service.changeWithCurrentPassword).toHaveBeenCalledOnce()); view.unmount();
  await act(async () => view.resolve({ status: "rejected", reason: "session-expired", message: { code: "MSG19" } }));
  expect(expiry).not.toHaveBeenCalled();
});
it("blocks Escape as soon as the password command is handed off", async () => {
  const view = setup();
  view.service.changeWithCurrentPassword.mockImplementation(() => {
    fireEvent.click(screen.getByRole("button", { name: "Escape fixture" }));
    return Promise.resolve({ status: "changed", message: { code: "MSG18" } });
  });
  submit(); await waitFor(() => expect(notify).toHaveBeenCalledOnce());
  expect(view.onOpenChange.mock.calls).toEqual([[false]]);
});

it("shows a connection failure without clearing inputs and allows a manual retry", async () => {
  const view = setup();
  view.service.changeWithCurrentPassword.mockRejectedValueOnce(new Error("Fixture connection failure"));
  submit(); await screen.findByRole("alert");
  expect((screen.getByLabelText(/Mật khẩu hiện tại/, { selector: "input" }) as HTMLInputElement).value).toBe(["Demo", "1234"].join(""));
  expect(screen.queryByText("Fixture connection failure")).toBeNull();
  view.service.changeWithCurrentPassword.mockResolvedValueOnce({ status: "changed", message: { code: "MSG18" } });
  submit(); await waitFor(() => expect(notify).toHaveBeenCalledOnce());
  expect(view.service.changeWithCurrentPassword).toHaveBeenCalledTimes(2);
});

it("keeps a current-password rejection on its field and unlocks dismissal", async () => {
  const view = setup(); submit(); await waitFor(() => expect(view.service.changeWithCurrentPassword).toHaveBeenCalledOnce());
  await act(async () => view.resolve({ status: "rejected", reason: "invalid-current-password", message: { code: "MSG17" } }));
  expect(screen.getByLabelText(/Mật khẩu hiện tại/, { selector: "input" }).getAttribute("aria-invalid")).toBe("true");
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Mật khẩu hiện tại/, { selector: "input" })));
  expect(notify).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  expect(view.onOpenChange).toHaveBeenCalledWith(false);
});

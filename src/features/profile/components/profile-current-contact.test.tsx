// @vitest-environment jsdom
import { useState, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProfileEditor } from "./profile-editor";
import { createMockPersonalProfileEnvironment } from "../repositories/mock-personal-profile-environment";
import { getMockPersonalProfile } from "../mocks/personal-profile-fixtures";
import type { PersonalProfile, StartProfileIdentifierChangeResult } from "../domain/personal-profile";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify: vi.fn() }) }));
vi.mock("@/features/auth/state/auth-provider", () => ({ useAuth: () => ({ updateDisplayName: vi.fn() }) }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open, title, onOpenChange }: { children: ReactNode; open: boolean; title: string; onOpenChange(open: boolean): void }) =>
    open ? <div role="dialog" aria-label={title}><button onClick={() => onOpenChange(false)}>Đóng</button>{children}</div> : null,
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function setup(unverified = true) {
  const initial = getMockPersonalProfile("account-owner-demo")!;
  const profile = { ...initial, email: { value: "existing@omts.test", isVerified: !unverified }, phone: { value: "0912345678", isVerified: !unverified } };
  const environment = createMockPersonalProfileEnvironment({ initialProfile: profile, latencyMs: 0, verification: { latencyMs: 0 } });
  const start = vi.spyOn(environment.profileService, "startIdentifierChange");
  function Host() {
    const [current, setCurrent] = useState<PersonalProfile>(profile);
    return <ProfileEditor {...environment} profile={current} onProfileChange={setCurrent} />;
  }
  return { ...render(<Host />), ...environment, profile, start };
}
it.each(["email", "phone"] as const)("verifies an existing %s and applies it only on Save", async (kind) => {
  const view = setup(); const label = kind === "email" ? "email" : "số điện thoại";
  fireEvent.click(screen.getByRole("button", { name: `Xác minh ${label}` }));
  await screen.findByRole("dialog", { name: `Xác minh ${label}` });
  expect(view.start).toHaveBeenCalledWith({ kind, value: view.profile[kind].value, intent: "verify-current" });
  fireEvent.change(screen.getByRole("textbox", { name: /Mã xác minh/ }), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "Xác minh" }));
  await screen.findByText("Đã xác minh, chờ lưu");
  expect(await view.profileService.load()).toMatchObject({ profile: { [kind]: { isVerified: false } } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() => expect(screen.queryByText("Đã xác minh, chờ lưu")).toBeNull());
  expect(screen.queryByRole("button", { name: `Xác minh ${label}` })).toBeNull();
  expect(await view.profileService.load()).toMatchObject({ profile: { [kind]: { value: view.profile[kind].value, isVerified: true } } });
});
it("does not offer verification for contacts already verified", () => {
  setup(false);
  expect(screen.queryByRole("button", { name: /^Xác minh/ })).toBeNull();
  expect(screen.getByRole("button", { name: "Thay đổi email" })).toBeTruthy();
});
it("retains the existing contact after delivery failure and allows manual retry", async () => {
  const view = setup();
  view.start.mockResolvedValueOnce({ status: "delivery-failed", message: { code: "MSG04" } });
  fireEvent.click(screen.getByRole("button", { name: "Xác minh email" }));
  await screen.findByRole("alert");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(await view.profileService.load()).toMatchObject({ profile: { email: view.profile.email } });
  fireEvent.click(screen.getByRole("button", { name: "Xác minh email" }));
  await screen.findByRole("dialog", { name: "Xác minh email" });
});
it("ignores expiry from sending a code after leaving the profile", async () => {
  const expiry = vi.spyOn(sessionExpiryChannel, "publish");
  const view = setup(); let finish!: (result: StartProfileIdentifierChangeResult) => void;
  view.start.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "Xác minh email" })); view.unmount();
  await act(async () => finish({ status: "session-expired", message: { code: "MSG19" } }));
  expect(expiry).not.toHaveBeenCalled();
});

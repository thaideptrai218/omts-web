// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProfileEditor } from "./profile-editor";
import { createMockPersonalProfileEnvironment } from "../repositories/mock-personal-profile-environment";
import { getMockPersonalProfile } from "../mocks/personal-profile-fixtures";
import type { SavePersonalProfileResult } from "../domain/personal-profile";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

const { notify, updateDisplayName } = vi.hoisted(() => ({ notify: vi.fn(), updateDisplayName: vi.fn() }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify }) }));
vi.mock("@/features/auth/state/auth-provider", () => ({ useAuth: () => ({ updateDisplayName }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });
function setup() {
  const profile = getMockPersonalProfile("account-owner-demo")!;
  const environment = createMockPersonalProfileEnvironment({ initialProfile: profile, latencyMs: 0 });
  let resolve!: (result: SavePersonalProfileResult) => void;
  const promise = new Promise<SavePersonalProfileResult>((done) => { resolve = done; });
  const save = vi.spyOn(environment.profileService, "save").mockReturnValue(promise);
  const onProfileChange = vi.fn();
  const view = render(<ProfileEditor {...environment} profile={profile} onProfileChange={onProfileChange} />);
  fireEvent.change(screen.getByRole("textbox", { name: /Tên hiển thị/ }), { target: { value: "Tên mới" } });
  return { ...view, save, resolve, onProfileChange, profile };
}
function submit() { fireEvent.submit(screen.getByRole("button", { name: "Lưu thay đổi" }).closest("form")!); }
it("does not save after leaving the profile during validation", async () => {
  const view = setup(); submit(); view.unmount(); await act(async () => {});
  expect(view.save).not.toHaveBeenCalled();
});
it("does not update sidebar or toast from an unmounted save", async () => {
  const view = setup(); submit(); await waitFor(() => expect(view.save).toHaveBeenCalledOnce()); view.unmount();
  await act(async () => view.resolve({ status: "saved", profile: { ...view.profile, displayName: "Tên mới" }, message: { code: "MSG10", params: { object_name: "Hồ sơ cá nhân" } } }));
  expect(view.onProfileChange).not.toHaveBeenCalled(); expect(updateDisplayName).not.toHaveBeenCalled(); expect(notify).not.toHaveBeenCalled();
});
it("does not expire another view from a stale save", async () => {
  const expiry = vi.spyOn(sessionExpiryChannel, "publish");
  const view = setup(); submit(); await waitFor(() => expect(view.save).toHaveBeenCalledOnce()); view.unmount();
  await act(async () => view.resolve({ status: "session-expired", message: { code: "MSG19" } }));
  expect(expiry).not.toHaveBeenCalled();
});
it("disables contact changes while saving and restores them after an error", async () => {
  const view = setup(); submit(); await waitFor(() => expect(view.save).toHaveBeenCalledOnce());
  expect((screen.getByRole("button", { name: "Thay đổi email" }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => view.resolve({ status: "invalid-change", field: "displayName", message: { code: "MSG01" } }));
  expect((screen.getByRole("button", { name: "Thay đổi email" }) as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByRole("textbox", { name: /Tên hiển thị/ }) as HTMLInputElement).value).toBe("Tên mới");
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: /Tên hiển thị/ })));
});

it("discards a personal-data draft without sending it", () => {
  const view = setup();
  fireEvent.click(screen.getByRole("button", { name: "Hủy thay đổi" }));
  expect((screen.getByRole("textbox", { name: /Tên hiển thị/ }) as HTMLInputElement).value).toBe(view.profile.displayName);
  expect(view.save).not.toHaveBeenCalled();
  expect((screen.getByRole("button", { name: "Lưu thay đổi" }) as HTMLButtonElement).disabled).toBe(true);
});

it("keeps an overlong name visible and does not submit it", async () => {
  const view = setup(); const name = "a".repeat(201);
  fireEvent.change(screen.getByRole("textbox", { name: /Tên hiển thị/ }), { target: { value: name } });
  submit(); await screen.findByText(/không quá 200/);
  expect(view.save).not.toHaveBeenCalled();
  expect((screen.getByRole("textbox", { name: /Tên hiển thị/ }) as HTMLInputElement).value).toBe(name);
});

it("rejects a save response belonging to another account", async () => {
  const view = setup(); submit(); await waitFor(() => expect(view.save).toHaveBeenCalledOnce());
  await act(async () => view.resolve({ status: "saved", profile: { ...view.profile, accountId: "another-account" }, message: { code: "MSG10", params: { object_name: "Hồ sơ cá nhân" } } }));
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(view.onProfileChange).not.toHaveBeenCalled(); expect(updateDisplayName).not.toHaveBeenCalled();
});

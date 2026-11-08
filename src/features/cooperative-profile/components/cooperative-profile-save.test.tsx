// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CooperativeProfileEditor } from "./cooperative-profile-editor";
import { cooperativeProfileService } from "../services/cooperative-profile-service.instance";
import type { CooperativeProfile, SaveCooperativeProfileResult } from "../domain/cooperative-profile";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";
const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify }) }));
vi.mock("../services/cooperative-profile-service.instance", () => ({ cooperativeProfileService: { save: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });
const profile: CooperativeProfile = {
  cooperativeName: "HTX kiểm thử", businessActivities: ["Nuôi trồng thủy sản"], email: null, legalRepresentative: "Nguyễn An", officeAddress: "Quảng Ninh", phone: "0912345678",
  receivingBankAccount: { bankId: "vcb", accountNumber: "0123456789", accountHolder: "HTX" }, recordVersion: "v1", status: "completed", taxId: "5701234567", website: null,
};
async function setup() {
  let resolve!: (result: SaveCooperativeProfileResult) => void;
  const promise = new Promise<SaveCooperativeProfileResult>((done) => { resolve = done; });
  vi.mocked(cooperativeProfileService.save).mockReturnValue(promise);
  const onProfileChange = vi.fn();
  const view = render(<CooperativeProfileEditor banks={[{ id: "vcb", name: "VCB", shortName: "VCB" }]} profile={profile} onProfileChange={onProfileChange} onReload={vi.fn()} />);
  fireEvent.submit(screen.getByRole("button", { name: "Kiểm tra trước khi lưu" }).closest("form")!);
  await screen.findByRole("button", { name: "Xác nhận và lưu" });
  return { ...view, resolve, onProfileChange };
}
it("ignores a saved cooperative profile after leaving the editor", async () => {
  const view = await setup(); fireEvent.click(screen.getByRole("button", { name: "Xác nhận và lưu" }));
  await waitFor(() => expect(cooperativeProfileService.save).toHaveBeenCalledOnce()); view.unmount();
  await act(async () => view.resolve({ status: "saved", profile, publicProjection: { cooperativeName: profile.cooperativeName, officeAddress: profile.officeAddress }, message: { code: "MSG10", params: { object_name: "Hồ sơ HTX" } } }));
  expect(view.onProfileChange).not.toHaveBeenCalled(); expect(notify).not.toHaveBeenCalled();
});
it("ignores stale expiry from a cooperative save", async () => {
  const expiry = vi.spyOn(sessionExpiryChannel, "publish");
  const view = await setup(); fireEvent.click(screen.getByRole("button", { name: "Xác nhận và lưu" })); view.unmount();
  await act(async () => view.resolve({ status: "session-expired", message: { code: "MSG19" } }));
  expect(expiry).not.toHaveBeenCalled();
});
it("sends only one cooperative save at the synchronous service handoff", async () => {
  const view = await setup();
  vi.mocked(cooperativeProfileService.save).mockImplementation(() => {
    if (vi.mocked(cooperativeProfileService.save).mock.calls.length === 1) fireEvent.click(screen.getByRole("button", { name: "Xác nhận và lưu" }));
    return Promise.resolve({ status: "saved", profile, publicProjection: { cooperativeName: profile.cooperativeName, officeAddress: profile.officeAddress }, message: { code: "MSG10", params: { object_name: "Hồ sơ HTX" } } });
  });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận và lưu" }));
  await waitFor(() => expect(view.onProfileChange).toHaveBeenCalled());
  expect(cooperativeProfileService.save).toHaveBeenCalledOnce();
});

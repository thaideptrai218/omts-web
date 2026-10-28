// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CooperativeProfileExperience } from "./cooperative-profile-experience";
import { cooperativeProfileService } from "../services/cooperative-profile-service.instance";
import type { LoadCooperativeProfileResult } from "../domain/cooperative-profile";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

const auth = vi.hoisted(() => ({ accountId: "owner-a", canManage: true }));
vi.mock("@/features/auth/state/auth-provider", () => ({ useAuth: () => ({ state: { status: "authenticated", account: { accountId: auth.accountId } } }) }));
vi.mock("@/features/access/lib/has-effective-permission", () => ({ hasEffectivePermission: () => auth.canManage }));
vi.mock("../services/cooperative-profile-service.instance", () => ({ cooperativeProfileService: { load: vi.fn() } }));
vi.mock("./cooperative-profile-editor", () => ({ CooperativeProfileEditor: ({ profile }: { profile: { cooperativeName: string } }) => <h2>{profile.cooperativeName}</h2> }));
const loaded = (name: string): LoadCooperativeProfileResult => ({ status: "loaded", banks: [], profile: {
  cooperativeName: name, businessActivities: [], email: null, legalRepresentative: "", officeAddress: "", phone: "", receivingBankAccount: { bankId: "", accountNumber: "", accountHolder: "" }, recordVersion: "v1", status: "preliminary", taxId: "", website: null,
} });
function pending() {
  let resolve!: (result: LoadCooperativeProfileResult) => void;
  const promise = new Promise<LoadCooperativeProfileResult>((done) => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => { auth.accountId = "owner-a"; auth.canManage = true; vi.mocked(cooperativeProfileService.load).mockReset(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("reloads into a separate workspace when the signed-in account changes", async () => {
  const next = pending(); vi.mocked(cooperativeProfileService.load).mockResolvedValueOnce(loaded("HTX A")).mockReturnValueOnce(next.promise);
  const view = render(<CooperativeProfileExperience />); await screen.findByRole("heading", { name: "HTX A" });
  auth.accountId = "owner-b"; view.rerender(<CooperativeProfileExperience />);
  expect(screen.queryByRole("heading", { name: "HTX A" })).toBeNull();
  await act(async () => next.resolve(loaded("HTX B")));
  expect(screen.getByRole("heading", { name: "HTX B" })).toBeTruthy();
});
it("ignores a retry expiry after permission has been removed", async () => {
  const next = pending(); const expiry = vi.spyOn(sessionExpiryChannel, "publish");
  vi.mocked(cooperativeProfileService.load).mockRejectedValueOnce(new Error("Fixture unavailable")).mockReturnValueOnce(next.promise);
  const view = render(<CooperativeProfileExperience />);
  fireEvent.click(await screen.findByRole("button", { name: "Tải lại" }));
  auth.canManage = false; view.rerender(<CooperativeProfileExperience />);
  await act(async () => next.resolve({ status: "session-expired", message: { code: "MSG19" } }));
  expect(expiry).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: "Không có quyền quản lý hồ sơ HTX" })).toBeTruthy();
});
it("shows permission denied on a forbidden load", async () => {
  vi.mocked(cooperativeProfileService.load).mockResolvedValue({ status: "forbidden", message: { code: "MSG02" } });
  render(<CooperativeProfileExperience />);
  await screen.findByRole("heading", { name: "Không có quyền quản lý hồ sơ HTX" });
  expect(screen.queryByRole("button", { name: "Tải lại" })).toBeNull();
});

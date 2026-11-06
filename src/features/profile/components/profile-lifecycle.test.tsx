// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProfileExperience } from "./profile-experience";
import { getPersonalProfileEnvironment } from "../services/personal-profile-service.instance";
import { createMockPersonalProfileEnvironment } from "../repositories/mock-personal-profile-environment";
import { getMockPersonalProfile } from "../mocks/personal-profile-fixtures";
import type { LoadPersonalProfileResult } from "../domain/personal-profile";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

const auth = vi.hoisted(() => ({ accountId: "account-a" }));
vi.mock("@/features/auth/state/auth-provider", () => ({
  useAuth: () => ({
    state: { status: "authenticated", account: { accountId: auth.accountId } },
  }),
}));
vi.mock("../services/personal-profile-service.instance", () => ({
  getPersonalProfileEnvironment: vi.fn(),
}));
vi.mock(
  "@/features/account-security/services/account-security-service.instance",
  () => ({ getAccountSecurityService: () => ({}) }),
);
vi.mock("./profile-overview", () => ({
  ProfileOverview: ({ profile }: { profile: { displayName: string } }) => (
    <h1>{profile.displayName}</h1>
  ),
}));

function deferred() {
  let resolve!: (result: LoadPersonalProfileResult) => void;
  const promise = new Promise<LoadPersonalProfileResult>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}

function environment(accountId: string, displayName: string) {
  const profile = {
    ...getMockPersonalProfile("account-owner-demo")!,
    accountId,
    displayName,
  };
  const result = createMockPersonalProfileEnvironment({
    initialProfile: profile,
    latencyMs: 0,
  });
  const load = vi
    .spyOn(result.profileService, "load")
    .mockResolvedValue({ status: "loaded", profile });
  return { ...result, profile, load };
}

let first: ReturnType<typeof environment>;
let second: ReturnType<typeof environment>;
beforeEach(() => {
  auth.accountId = "account-a";
  first = environment("account-a", "Hồ sơ A");
  second = environment("account-b", "Hồ sơ B");
  vi.mocked(getPersonalProfileEnvironment).mockImplementation((id) =>
    id === "account-a" ? first : second,
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("hides account A immediately while account B's profile is loading", async () => {
  const pending = deferred();
  second.load.mockReturnValueOnce(pending.promise);
  const view = render(<ProfileExperience />);
  await screen.findByRole("heading", { name: "Hồ sơ A" });
  auth.accountId = "account-b";
  view.rerender(<ProfileExperience />);
  expect(screen.queryByRole("heading", { name: "Hồ sơ A" })).toBeNull();
  expect(screen.getByRole("status")).toBeTruthy();
  await act(async () =>
    pending.resolve({ status: "loaded", profile: second.profile }),
  );
  expect(screen.getByRole("heading", { name: "Hồ sơ B" })).toBeTruthy();
});

it("does not render a profile returned for another account", async () => {
  first.load.mockResolvedValueOnce({
    status: "loaded",
    profile: second.profile,
  });
  render(<ProfileExperience />);
  await screen.findByRole("heading", { name: "Chưa tải được hồ sơ" });
  expect(screen.queryByRole("heading", { name: "Hồ sơ B" })).toBeNull();
});

it("discards a retry response from A after switching to B", async () => {
  const pending = deferred();
  first.load
    .mockRejectedValueOnce(new Error("Fixture unavailable"))
    .mockReturnValueOnce(pending.promise);
  const view = render(<ProfileExperience />);
  fireEvent.click(await screen.findByRole("button", { name: "Tải lại" }));
  auth.accountId = "account-b";
  view.rerender(<ProfileExperience />);
  await screen.findByRole("heading", { name: "Hồ sơ B" });
  await act(async () =>
    pending.resolve({ status: "loaded", profile: first.profile }),
  );
  expect(screen.getByRole("heading", { name: "Hồ sơ B" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Hồ sơ A" })).toBeNull();
});

it("retries a failed load in the same account and recovers normally", async () => {
  first.load.mockRejectedValueOnce(new Error("Fixture unavailable"));
  render(<ProfileExperience />);
  fireEvent.click(await screen.findByRole("button", { name: "Tải lại" }));
  await screen.findByRole("heading", { name: "Hồ sơ A" });
  expect(first.load).toHaveBeenCalledTimes(2);
});

it("does not expire B's session when A's obsolete retry reports expiry", async () => {
  const pending = deferred();
  const publish = vi.spyOn(sessionExpiryChannel, "publish");
  first.load
    .mockRejectedValueOnce(new Error("Fixture unavailable"))
    .mockReturnValueOnce(pending.promise);
  const view = render(<ProfileExperience />);
  fireEvent.click(await screen.findByRole("button", { name: "Tải lại" }));
  auth.accountId = "account-b";
  view.rerender(<ProfileExperience />);
  await screen.findByRole("heading", { name: "Hồ sơ B" });
  await act(async () =>
    pending.resolve({ status: "session-expired", message: { code: "MSG19" } }),
  );
  expect(publish).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: "Hồ sơ B" })).toBeTruthy();
});

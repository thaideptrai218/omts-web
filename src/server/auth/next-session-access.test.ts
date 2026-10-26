import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ resolve: vi.fn(), application: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ Cookie: "fixture-cookie" }) }));
vi.mock("next/navigation", () => ({ redirect: (target: string) => { throw new Error(`REDIRECT:${target}`); } }));
vi.mock("./session-gateway.instance", () => ({ getSessionGateway: () => mocks }));
import { requireApplicationPage, requireOnboardingPage } from "./next-session-access";
import { newSession } from "./__tests__/session-fixture";
import { ResolvedServerSession } from "./server-session-resolver";

describe("Next session access routing", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [{ status: "unauthenticated", clearCookie: false }, "/login"],
    [{ status: "unauthenticated", clearCookie: true }, "/session/recover"],
    [{ status: "onboarding-required", phase: "password-change-required" }, "/onboarding/password"],
    [{ status: "onboarding-required", phase: "contact-verification-required" }, "/onboarding/contact"],
  ])("routes application failure %# without rendering data", async (result, destination) => {
    mocks.application.mockResolvedValue(result);
    await expect(requireApplicationPage()).rejects.toThrow(`REDIRECT:${destination}`);
    expect(mocks.application).toHaveBeenCalledWith("fixture-cookie");
  });

  it("keeps an infrastructure failure renderable as a retry state", async () => {
    mocks.application.mockResolvedValue({ status: "session-unavailable" });
    await expect(requireApplicationPage()).resolves.toEqual({ status: "session-unavailable" });
  });

  it.each([
    ["password-change-required", "contact-verification-required", "/onboarding/password"],
    ["contact-verification-required", "password-change-required", "/onboarding/contact"],
    ["application", "password-change-required", "/dashboard"],
  ] as const)("restores actual phase %s instead of requested %s", async (actual, requested, destination) => {
    mocks.resolve.mockResolvedValue({ status: "resolved", session: new ResolvedServerSession({
      ...newSession({ phase: actual }), schemaVersion: 1, createdAtMs: 1, revision: "fixture",
    }, "test-token") });
    await expect(requireOnboardingPage(requested)).rejects.toThrow(`REDIRECT:${destination}`);
  });

  it("does not expose the capability when the onboarding phase matches", async () => {
    mocks.resolve.mockResolvedValue({ status: "resolved", session: new ResolvedServerSession({
      ...newSession({ phase: "password-change-required" }), schemaVersion: 1, createdAtMs: 1, revision: "fixture",
    }, "test-token") });
    await expect(requireOnboardingPage("password-change-required")).resolves.toEqual({ status: "ready" });
  });
});

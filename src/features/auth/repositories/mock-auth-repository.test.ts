import { describe, expect, it } from "vitest";
import { createMockAuthRepository } from "@/features/auth/repositories/mock-auth-repository";

const demoPassword = "demo123";

async function loginAs(identifier: string, password = demoPassword) {
  const repository = createMockAuthRepository({ latencyMs: 0 });
  const result = await repository.login({ identifier, password });
  return { repository, result };
}

describe("mock auth repository", () => {
  it.each(["owner", "0900000000", "owner@omts.test"])(
    "grants application access for verified identifier %s",
    async (identifier) => {
      const { repository, result } = await loginAs(identifier);

      expect(result).toMatchObject({ status: "access-granted" });
      await expect(repository.getSession()).resolves.toMatchObject({
        status: "authenticated",
      });
    },
  );

  it("grants access to the already-verified Staff review account", async () => {
    const { result } = await loginAs("staff-verified");

    expect(result).toMatchObject({
      session: {
        account: {
          username: "staff-verified",
        },
      },
      status: "access-granted",
    });
  });

  it.each([
    ["account-blocked", "MSG13"],
    ["temp-password-expired", "MSG68"],
    ["temporarily-locked", "MSG69"],
  ] as const)("returns %s as %s without a session", async (identifier, code) => {
    const { repository, result } = await loginAs(identifier);

    expect(result).toEqual({ message: { code }, status: "rejected" });
    await expect(repository.getSession()).resolves.toEqual({ status: "anonymous" });
  });

  it("starts Staff onboarding at temporary-password change", async () => {
    const { repository, result } = await loginAs("staff-first-login");

    expect(result).toEqual({
      availableContactChannels: ["email", "phone"],
      checklist: {
        contactVerified: false,
        passwordChanged: false,
      },
      nextStep: "change-temporary-password",
      status: "staff-onboarding-required",
    });
    await expect(repository.getSession()).resolves.toEqual({ status: "anonymous" });
  });

  it("moves Staff to contact verification only after changing the temporary password", async () => {
    const { repository } = await loginAs("staff-first-login");

    await expect(
      repository.changeTemporaryPassword({
        currentPassword: demoPassword,
        newPassword: "newpass8",
      }),
    ).resolves.toEqual({ message: { code: "MSG18" }, status: "changed" });

    await expect(
      repository.login({
        identifier: "staff-first-login",
        password: "newpass8",
      }),
    ).resolves.toMatchObject({
      checklist: { passwordChanged: true },
      nextStep: "verify-contact",
      status: "staff-onboarding-required",
    });
  });

  it("rejects a wrong temporary password without advancing onboarding", async () => {
    const { repository } = await loginAs("staff-first-login");

    await expect(
      repository.changeTemporaryPassword({
        currentPassword: "wrong-password",
        newPassword: "newpass8",
      }),
    ).resolves.toEqual({
      message: { code: "MSG17" },
      reason: "invalid-current-password",
      status: "rejected",
    });

    await expect(
      repository.login({
        identifier: "staff-first-login",
        password: demoPassword,
      }),
    ).resolves.toMatchObject({
      checklist: { passwordChanged: false },
      nextStep: "change-temporary-password",
    });
  });

  it("requires an active onboarding context to change a temporary password", async () => {
    const repository = createMockAuthRepository({ latencyMs: 0 });

    await expect(
      repository.changeTemporaryPassword({
        currentPassword: demoPassword,
        newPassword: "newpass8",
      }),
    ).resolves.toEqual({
      message: { code: "MSG19" },
      reason: "session-expired",
      status: "rejected",
    });
  });

  it("continues Staff onboarding at contact verification after password change", async () => {
    const { repository, result } = await loginAs(
      "staff-needs-contact-verification",
    );

    expect(result).toEqual({
      availableContactChannels: ["email"],
      checklist: {
        contactVerified: false,
        passwordChanged: true,
      },
      nextStep: "verify-contact",
      status: "staff-onboarding-required",
    });
    await expect(repository.getSession()).resolves.toEqual({ status: "anonymous" });
  });

  it("returns the phone-verification gate before application access", async () => {
    const { repository, result } = await loginAs("trader-needs-phone");

    expect(result).toEqual({
      message: { code: "MSG67" },
      status: "phone-verification-required",
    });
    await expect(repository.getSession()).resolves.toEqual({ status: "anonymous" });
  });

  it.each([
    ["unknown-account", demoPassword],
    ["owner", "wrong-password"],
  ])("returns generic MSG12 for %s", async (identifier, password) => {
    const { result } = await loginAs(identifier, password);

    expect(result).toEqual({
      message: { code: "MSG12" },
      status: "rejected",
    });
  });

  it("clears the mock session on logout", async () => {
    const { repository } = await loginAs("owner");

    await repository.logout();

    await expect(repository.getSession()).resolves.toEqual({ status: "anonymous" });
  });
});

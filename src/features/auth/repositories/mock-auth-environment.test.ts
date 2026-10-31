import { describe, expect, it } from "vitest";
import { createMockAuthEnvironment } from "@/features/auth/repositories/mock-auth-environment";

async function preparePasswordChangedStaff() {
  const environment = createMockAuthEnvironment({
    authLatencyMs: 0,
    verification: { latencyMs: 0 },
  });
  const login = await environment.authRepository.login({
    identifier: "staff-first-login",
    password: "demo123",
  });
  expect(login).toMatchObject({ nextStep: "change-temporary-password" });

  await environment.authRepository.changeTemporaryPassword({
    currentPassword: "demo123",
    newPassword: "newpass8",
  });

  return environment;
}

describe("mock auth environment", () => {
  it("upgrades Staff to an application session after one verified contact", async () => {
    const environment = await preparePasswordChangedStaff();
    const start = await environment.authRepository.startStaffContactVerification(
      "email",
    );
    expect(start.status).toBe("started");
    if (start.status !== "started") return;

    const verified = await environment.verificationService.verify({
      code: "123456",
      requestId: start.challenge.requestId,
    });
    expect(verified.status).toBe("verified");
    if (verified.status !== "verified") return;

    await expect(
      environment.authRepository.completeStaffOnboarding({
        verificationToken: verified.token,
      }),
    ).resolves.toMatchObject({ status: "access-granted" });
    await expect(environment.authRepository.getSession()).resolves.toMatchObject({
      status: "authenticated",
    });

    await environment.authRepository.logout();
    await expect(
      environment.authRepository.login({
        identifier: "staff-first-login",
        password: "newpass8",
      }),
    ).resolves.toMatchObject({ status: "access-granted" });
  });

  it("rejects an unknown verification proof without granting access", async () => {
    const environment = await preparePasswordChangedStaff();

    await expect(
      environment.authRepository.completeStaffOnboarding({
        verificationToken: "unknown-proof",
      }),
    ).resolves.toEqual({ message: { code: "MSG16" }, status: "rejected" });
    await expect(environment.authRepository.getSession()).resolves.toEqual({
      status: "anonymous",
    });
  });

  it("does not start contact verification before password change", async () => {
    const environment = createMockAuthEnvironment({
      authLatencyMs: 0,
      verification: { latencyMs: 0 },
    });
    await environment.authRepository.login({
      identifier: "staff-first-login",
      password: "demo123",
    });

    await expect(
      environment.authRepository.startStaffContactVerification("email"),
    ).resolves.toEqual({ message: { code: "MSG19" }, status: "rejected" });
  });
});

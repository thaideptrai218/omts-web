import { describe, expect, it } from "vitest";
import { createMockAccountSecurityRepository } from "@/features/account-security/repositories/mock-account-security-repository";

const validChange = {
  currentPassword: "temporary1",
  newPassword: "newpass8",
} as const;

describe("mock account security repository", () => {
  it("changes the in-memory password without returning either password", async () => {
    const repository = createMockAccountSecurityRepository({ latencyMs: 0 });

    const result = await repository.changeWithCurrentPassword(validChange);

    expect(result).toEqual({ message: { code: "MSG18" }, status: "changed" });
    expect(JSON.stringify(result)).not.toContain(validChange.currentPassword);
    expect(JSON.stringify(result)).not.toContain(validChange.newPassword);

    await expect(
      repository.changeWithCurrentPassword(validChange),
    ).resolves.toMatchObject({
      message: { code: "MSG17" },
      reason: "invalid-current-password",
      status: "rejected",
    });
    await expect(
      repository.changeWithCurrentPassword({
        currentPassword: validChange.newPassword,
        newPassword: "another9",
      }),
    ).resolves.toMatchObject({ status: "changed" });
  });

  it("rejects a wrong current password with MSG17", async () => {
    const repository = createMockAccountSecurityRepository({ latencyMs: 0 });

    await expect(
      repository.changeWithCurrentPassword({
        ...validChange,
        currentPassword: "wrong-password",
      }),
    ).resolves.toEqual({
      message: { code: "MSG17" },
      reason: "invalid-current-password",
      status: "rejected",
    });
  });

  it("rechecks the password policy at the repository boundary", async () => {
    const repository = createMockAccountSecurityRepository({ latencyMs: 0 });

    await expect(
      repository.changeWithCurrentPassword({
        ...validChange,
        newPassword: "letters-only",
      }),
    ).resolves.toEqual({
      message: { code: "MSG01" },
      reason: "invalid-new-password",
      status: "rejected",
    });
  });

  it("checks the session before password evidence", async () => {
    const repository = createMockAccountSecurityRepository({
      latencyMs: 0,
      sessionState: () => "expired",
    });

    await expect(
      repository.changeWithCurrentPassword({
        currentPassword: "wrong-password",
        newPassword: "newpass8",
      }),
    ).resolves.toEqual({
      message: { code: "MSG19" },
      reason: "session-expired",
      status: "rejected",
    });
  });
});

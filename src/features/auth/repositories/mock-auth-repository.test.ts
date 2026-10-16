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

  it.each([
    ["account-blocked", "MSG13"],
    ["temp-password-expired", "MSG68"],
    ["temporarily-locked", "MSG69"],
  ] as const)("returns %s as %s without a session", async (identifier, code) => {
    const { repository, result } = await loginAs(identifier);

    expect(result).toEqual({ message: { code }, status: "rejected" });
    await expect(repository.getSession()).resolves.toEqual({ status: "anonymous" });
  });

  it("returns the password-change gate before application access", async () => {
    const { repository, result } = await loginAs("staff-first-login");

    expect(result).toEqual({ status: "password-change-required" });
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

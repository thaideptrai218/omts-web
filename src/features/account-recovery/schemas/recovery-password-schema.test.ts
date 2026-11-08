import { describe, expect, it } from "vitest";

import { recoveryPasswordSchema } from "@/features/account-recovery/schemas/recovery-password-schema";

function getIssues(values: {
  confirmPassword: string;
  newPassword: string;
}) {
  const result = recoveryPasswordSchema.safeParse(values);
  return result.success ? [] : result.error.issues;
}

describe("recovery password schema", () => {
  it("accepts matching values that satisfy the shared password policy", () => {
    expect(
      recoveryPasswordSchema.safeParse({
        confirmPassword: "MậtKhẩu1",
        newPassword: "MậtKhẩu1",
      }).success,
    ).toBe(true);
  });

  it("does not require the forgotten current password", () => {
    const result = recoveryPasswordSchema.safeParse({
      confirmPassword: "Matkhau1",
      newPassword: "Matkhau1",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).not.toHaveProperty("currentPassword");
  });

  it.each([
    ["Mk1", "Mật khẩu mới phải có ít nhất 8 ký tự."],
    ["12345678", "Mật khẩu mới phải có ít nhất một chữ cái."],
    ["matkhauabc", "Mật khẩu mới phải có ít nhất một chữ số."],
  ])("reports the failed shared rule for %s", (newPassword, message) => {
    expect(
      getIssues({ confirmPassword: newPassword, newPassword }),
    ).toContainEqual(
      expect.objectContaining({ message, path: ["newPassword"] }),
    );
  });

  it("puts a mismatch error on the confirmation field", () => {
    expect(
      getIssues({
        confirmPassword: "Matkhau2",
        newPassword: "Matkhau1",
      }),
    ).toContainEqual(
      expect.objectContaining({
        message: "Mật khẩu nhập lại chưa khớp.",
        path: ["confirmPassword"],
      }),
    );
  });

  it("does not trim or transform password values", () => {
    const values = {
      confirmPassword: " MậtKhẩu1",
      newPassword: " MậtKhẩu1",
    };

    expect(recoveryPasswordSchema.parse(values)).toEqual(values);
  });
});

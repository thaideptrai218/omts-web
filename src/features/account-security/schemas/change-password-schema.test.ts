import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  currentPasswordChangeSchema,
} from "@/features/account-security/schemas/change-password-schema";

function getMessagesByPath(
  values: Readonly<{ confirmPassword: string; newPassword: string }>,
  path: "confirmPassword" | "newPassword",
) {
  const result = changePasswordSchema.safeParse(values);

  if (result.success) return [];

  return result.error.issues
    .filter((issue) => issue.path[0] === path)
    .map((issue) => issue.message);
}

describe("change password schema", () => {
  it("accepts a matching password that satisfies the SRS policy", () => {
    expect(
      changePasswordSchema.safeParse({
        confirmPassword: "Matkhau1",
        newPassword: "Matkhau1",
      }).success,
    ).toBe(true);
  });

  it.each([
    ["Mk1", "Mật khẩu mới phải có ít nhất 8 ký tự."],
    ["12345678", "Mật khẩu mới phải có ít nhất một chữ cái."],
    ["matkhauabc", "Mật khẩu mới phải có ít nhất một chữ số."],
  ])("reports the failed rule for %s", (newPassword, expectedMessage) => {
    expect(
      getMessagesByPath(
        { confirmPassword: newPassword, newPassword },
        "newPassword",
      ),
    ).toContain(expectedMessage);
  });

  it("reports confirmation mismatch on the confirmation field", () => {
    expect(
      getMessagesByPath(
        { confirmPassword: "Matkhau2", newPassword: "Matkhau1" },
        "confirmPassword",
      ),
    ).toEqual(["Mật khẩu nhập lại chưa khớp."]);
  });

  it("reports empty fields without adding misleading rule errors", () => {
    const values = { confirmPassword: "", newPassword: "" };

    expect(getMessagesByPath(values, "newPassword")).toEqual([
      "Hãy nhập mật khẩu mới.",
    ]);
    expect(getMessagesByPath(values, "confirmPassword")).toEqual([
      "Hãy nhập lại mật khẩu mới.",
    ]);
  });

  it("requires the current password for the current-password proof form", () => {
    const result = currentPasswordChangeSchema.safeParse({
      confirmPassword: "Matkhau1",
      currentPassword: "",
      newPassword: "Matkhau1",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        message: "Hãy nhập mật khẩu hiện tại.",
        path: ["currentPassword"],
      }),
    );
  });

  it("accepts current, new and confirmation passwords without transforming them", () => {
    const values = {
      confirmPassword: " MậtKhẩu1",
      currentPassword: " temporary password ",
      newPassword: " MậtKhẩu1",
    };

    expect(currentPasswordChangeSchema.parse(values)).toEqual(values);
  });
});

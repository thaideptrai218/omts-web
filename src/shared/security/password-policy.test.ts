import { describe, expect, it } from "vitest";
import {
  getPasswordRuleState,
  passwordPolicy,
  satisfiesPasswordPolicy,
} from "@/shared/security/password-policy";

describe("password policy", () => {
  it("keeps the confirmed SRS rules explicit", () => {
    expect(passwordPolicy).toEqual({
      minimumLength: 8,
      requiresDigit: true,
      requiresLetter: true,
    });
  });

  it("accepts Vietnamese letters as letters", () => {
    expect(getPasswordRuleState("MậtKhẩu1")).toEqual({
      hasDigit: true,
      hasLetter: true,
      hasMinimumLength: true,
    });
  });

  it("counts a Unicode code point once when checking minimum length", () => {
    expect("Abcde1😀".length).toBe(8);
    expect(getPasswordRuleState("Abcde1😀").hasMinimumLength).toBe(false);
  });

  it.each([
    ["Matkhau1", true],
    ["Mk1", false],
    ["12345678", false],
    ["matkhauabc", false],
  ])("evaluates %s as %s", (password, expected) => {
    expect(satisfiesPasswordPolicy(password)).toBe(expected);
  });
});

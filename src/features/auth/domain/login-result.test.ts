import { describe, expect, it } from "vitest";
import type {
  AuthenticatedSession,
  LoginResult,
} from "@/features/auth/domain/auth-types";
import { grantsApplicationAccess } from "@/features/auth/domain/login-result";

const authenticatedSession: AuthenticatedSession = {
  account: {
    access: { permissions: [] },
    accountId: "account-test",
    displayName: "Tài khoản kiểm thử",
    username: "test-user",
  },
  status: "authenticated",
};

const outcomes = [
  {
    grantsAccess: false,
    label: "rejected credentials",
    result: {
      message: { code: "MSG12" },
      status: "rejected",
    },
  },
  {
    grantsAccess: false,
    label: "required password change",
    result: { status: "password-change-required" },
  },
  {
    grantsAccess: false,
    label: "required phone verification",
    result: {
      message: { code: "MSG67" },
      status: "phone-verification-required",
    },
  },
  {
    grantsAccess: true,
    label: "completed login gates",
    result: {
      session: authenticatedSession,
      status: "access-granted",
    },
  },
] as const satisfies readonly {
  grantsAccess: boolean;
  label: string;
  result: LoginResult;
}[];

describe("grantsApplicationAccess", () => {
  it.each(outcomes)("returns $grantsAccess for $label", ({ grantsAccess, result }) => {
    expect(grantsApplicationAccess(result)).toBe(grantsAccess);
  });
});

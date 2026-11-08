import { describe, expect, it } from "vitest";
import type {
  AuthenticatedSession,
  LoginResult,
} from "@/features/auth/domain/auth-types";
import {
  grantsApplicationAccess,
  requiresPostLoginGate,
} from "@/features/auth/domain/login-result";

const authenticatedSession: AuthenticatedSession = {
  account: {
    access: { permissions: [] },
    accountId: "account-test",
    displayName: "Tài khoản kiểm thử",
    organizationName: "HTX kiểm thử",
    primaryRoleLabel: "Vai trò kiểm thử",
    scopeLabel: "Phạm vi kiểm thử",
    username: "test-user",
  },
  status: "authenticated",
};

const outcomes = [
  {
    grantsAccess: false,
    requiresGate: false,
    label: "rejected credentials",
    result: {
      message: { code: "MSG12" },
      status: "rejected",
    },
  },
  {
    grantsAccess: false,
    requiresGate: true,
    label: "staff onboarding starts with temporary-password change",
    result: {
      availableContactChannels: ["email", "phone"],
      checklist: {
        contactVerified: false,
        passwordChanged: false,
      },
      nextStep: "change-temporary-password",
      status: "staff-onboarding-required",
    },
  },
  {
    grantsAccess: false,
    requiresGate: true,
    label: "staff onboarding continues with contact verification",
    result: {
      availableContactChannels: ["email"],
      checklist: {
        contactVerified: false,
        passwordChanged: true,
      },
      nextStep: "verify-contact",
      status: "staff-onboarding-required",
    },
  },
  {
    grantsAccess: false,
    requiresGate: true,
    label: "required phone verification",
    result: {
      message: { code: "MSG67" },
      status: "phone-verification-required",
    },
  },
  {
    grantsAccess: true,
    requiresGate: false,
    label: "completed login gates",
    result: {
      session: authenticatedSession,
      status: "access-granted",
    },
  },
] as const satisfies readonly {
  grantsAccess: boolean;
  label: string;
  requiresGate: boolean;
  result: LoginResult;
}[];

describe("grantsApplicationAccess", () => {
  it.each(outcomes)("returns $grantsAccess for $label", ({ grantsAccess, result }) => {
    expect(grantsApplicationAccess(result)).toBe(grantsAccess);
  });
});

describe("requiresPostLoginGate", () => {
  it.each(outcomes)("returns $requiresGate for $label", ({ requiresGate, result }) => {
    expect(requiresPostLoginGate(result)).toBe(requiresGate);
  });
});

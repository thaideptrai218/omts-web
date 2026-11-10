import type { LoginResult } from "@/features/auth/domain/auth-types";
import {
  createMockStaffIdentity,
  mockIdentities,
} from "@/shared/mocks/mock-identities";

/*
 * Demo fixtures of the mock auth backend: canned sessions per demo identifier,
 * and the shared demo password.
 * Moved verbatim from mock-auth-repository.ts; values must stay identical.
 */

export const demoPassword = "Demo@1234";

const demoSession = {
  account: {
    access: {
      permissions: [
        { key: "farming.zones.view", scope: { kind: "all-zones" } },
        { key: "farming.rafts.view", scope: { kind: "all-zones" } },
        { key: "workforce.assign", scope: { kind: "all-zones" } },
        { key: "purchase.receipts.view", scope: { kind: "all-zones" } },
        { key: "farming.zones.manage", scope: { kind: "all-zones" } },
        {
          key: "access.accounts.manage",
          scope: { kind: "all-zones" },
        },
        {
          key: "access.roles.manage",
          scope: { kind: "all-zones" },
        },
        {
          key: "cooperative.profile.manage",
          scope: { kind: "all-zones" },
        },
        {
          key: "cooperative.employees.manage",
          scope: { kind: "all-zones" },
        },
        {
          key: "workspace.overview.view",
          scope: { kind: "all-zones" },
        },
      ],
    },
    ...mockIdentities.owner,
  },
  status: "authenticated",
} as const;

const systemAdminSession = {
  account: {
    access: {
      permissions: [
        {
          key: "workspace.overview.view",
          scope: { kind: "global" },
        },
        {
          key: "platform.cooperative.provision",
          scope: { kind: "global" },
        },
      ],
    },
    ...mockIdentities.systemAdmin,
  },
  status: "authenticated",
} as const;

const traderSession = {
  account: {
    access: {
      permissions: [
        {
          key: "workspace.overview.view",
          scope: { kind: "global" },
        },
      ],
    },
    ...mockIdentities.trader,
  },
  status: "authenticated",
} as const;

export function createStaffSession(username: string) {
  return {
    account: {
      access: {
        permissions: [
          ...(username === "staff-verified" ? [{ key: "workforce.assign" as const, scope: { kind: "zones" as const, zoneIds: ["zone-east"] } }] : []),
          {
            key: "workspace.overview.view",
            scope: { kind: "zones", zoneIds: ["zone-east"] },
          },
        ],
      },
      ...createMockStaffIdentity(username),
    },
    status: "authenticated",
  } as const;
}

const accessGrantedResult = {
  session: demoSession,
  status: "access-granted",
} as const satisfies LoginResult;

export const loginResultsByIdentifier: ReadonlyMap<string, LoginResult> =
  new Map<string, LoginResult>([
    ["0900000000", accessGrantedResult],
    [
      "account-blocked",
      { message: { code: "MSG13" }, status: "rejected" },
    ],
    ["owner@omts.test", accessGrantedResult],
    ["owner", accessGrantedResult],
    [
      "trader",
      { session: traderSession, status: "access-granted" },
    ],
    [
      "sysadmin",
      { session: systemAdminSession, status: "access-granted" },
    ],
    [
      "staff-verified",
      {
        session: createStaffSession("staff-verified"),
        status: "access-granted",
      },
    ],
    [
      "temp-password-expired",
      { message: { code: "MSG68" }, status: "rejected" },
    ],
    [
      "temporarily-locked",
      { message: { code: "MSG69" }, status: "rejected" },
    ],
    [
      "trader-needs-phone",
      {
        message: { code: "MSG67" },
        status: "phone-verification-required",
      },
    ],
  ]);

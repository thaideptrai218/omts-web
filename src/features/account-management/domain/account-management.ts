import type { AppMessage } from "@/shared/messages/message-catalog";
import type { FeatureCatalogItem, RolePermission } from "@/features/role-management/domain/role-management";

export type ManagedAccountStatus = "active" | "locked";
export type AccessGrantStatus = "effective" | "revoked";

export type FarmingZoneOption = Readonly<{
  id: string;
  label: string;
  status: "discontinued" | "in-use";
}>;

export type AssignableRole = Readonly<{
  id: string;
  name: string;
  permissions: readonly RolePermission[];
  status: "discontinued" | "in-use";
}>;

export type AccessGrant = Readonly<{
  effectiveFrom: string;
  effectiveTo: string | null;
  grantedBy: string;
  id: string;
  revocationReason: string | null;
  revokedAt: string | null;
  roleId: string;
  status: AccessGrantStatus;
  zoneId: string | null;
}>;

export type ManagedAccount = Readonly<{
  accountType: "cooperative-owner" | "internal" | "system-administrator";
  displayName: string;
  email: string;
  grants: readonly AccessGrant[];
  id: string;
  phone: string;
  phoneVerified: boolean;
  recordVersion: string;
  status: ManagedAccountStatus;
  username: string;
}>;

export type AccountManagementWorkspace = Readonly<{
  accounts: readonly ManagedAccount[];
  featureCatalog: readonly FeatureCatalogItem[];
  roles: readonly AssignableRole[];
  zones: readonly FarmingZoneOption[];
}>;

export type GrantDraft = Readonly<{
  effectiveFrom: string;
  effectiveTo: string;
  key: string;
  roleId: string;
  zoneId: string;
}>;

export type SaveAccountInput = Readonly<{
  displayName: string;
  email: string;
  id: string | null;
  newGrants: readonly GrantDraft[];
  phone: string;
  recordVersion: string | null;
  username: string;
}>;

export type EffectivePermissionRow = Readonly<{
  actionKeys: readonly string[];
  featureCode: string;
  featureLabel: string;
}>;

export type EffectivePermissionZone = Readonly<{
  permissions: readonly EffectivePermissionRow[];
  roleNames: readonly string[];
  zoneId: string;
  zoneLabel: string;
}>;

export type OneTimeTemporaryCredential = Readonly<{
  accountIdentifier: string;
  expiresAt: string;
  temporaryPassword: string;
}>;

type ForbiddenResult = Readonly<{
  message: AppMessage & { code: "MSG02" };
  status: "forbidden";
}>;

type SessionExpiredResult = Readonly<{
  message: AppMessage & { code: "MSG19" };
  status: "session-expired";
}>;

export type LoadAccountWorkspaceResult =
  | Readonly<{ status: "loaded"; workspace: AccountManagementWorkspace }>
  | ForbiddenResult
  | SessionExpiredResult;

export type SaveAccountResult =
  | Readonly<{
      account: ManagedAccount;
      credential?: OneTimeTemporaryCredential;
      status: "saved";
    }>
  | Readonly<{
      field: "displayName" | "email" | "grants" | "phone" | "username";
      message: AppMessage & { code: "MSG01" };
      status: "invalid-input";
    }>
  | Readonly<{
      existingAccountId: string;
      field: "phone" | "username";
      message: AppMessage & { code: "MSG03" };
      status: "duplicate";
    }>
  | ForbiddenResult
  | SessionExpiredResult;

export type AccountAction = "lock" | "unlock";

export type ChangeAccountStatusInput = Readonly<{
  accountId: string;
  action: AccountAction;
  confirmed: boolean;
  reason: string;
}>;

export type ChangeAccountStatusResult =
  | Readonly<{ account: ManagedAccount; status: "changed" }>
  | Readonly<{
      field: "reason";
      message: AppMessage & { code: "MSG01" };
      status: "invalid-input";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG09" };
      status: "confirmation-required";
    }>
  | ForbiddenResult
  | SessionExpiredResult;

export type RevokeGrantInput = Readonly<{
  accountId: string;
  confirmed: boolean;
  grantId: string;
  reason: string;
}>;

export type RevokeGrantResult =
  | Readonly<{ account: ManagedAccount; status: "revoked" }>
  | Readonly<{
      field: "reason";
      message: AppMessage & { code: "MSG01" };
      status: "invalid-input";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG09" };
      status: "confirmation-required";
    }>
  | ForbiddenResult
  | SessionExpiredResult;

export type ResetPasswordResult =
  | Readonly<{
      credential: OneTimeTemporaryCredential;
      status: "reset";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG09" };
      status: "confirmation-required";
    }>
  | ForbiddenResult
  | SessionExpiredResult;

export type ResetPasswordInput = Readonly<{
  accountId: string;
  confirmed: boolean;
}>;

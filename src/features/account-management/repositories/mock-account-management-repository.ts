import type {
  AccessGrant,
  AssignableRole,
  ChangeAccountStatusInput,
  ChangeAccountStatusResult,
  FarmingZoneOption,
  ManagedAccount,
  ResetPasswordInput,
  ResetPasswordResult,
  RevokeGrantInput,
  RevokeGrantResult,
  SaveAccountInput,
  SaveAccountResult,
} from "@/features/account-management/domain/account-management";
import { mockIdentities } from "@/shared/mocks/mock-identities";
import type { FeatureCatalogItem } from "@/features/role-management/domain/role-management";
import type { AccountManagementRepository } from "@/features/account-management/repositories/account-management-repository";
import { accountEditorSchema } from "@/features/account-management/schemas/account-editor-schema";
import type { PersonalProfile } from "@/features/profile/domain/personal-profile";
import {
  confirmationRequiredResult,
  forbiddenResult,
  isManageableAccount,
  missingReasonResult,
  revokeGrantInHistory,
} from "@/features/account-management/repositories/mock-account-lifecycle-results";
import {
  findDuplicateContact,
  findInvalidGrants,
  toInvalidFieldResult,
} from "@/features/account-management/repositories/mock-account-save-validation";
import {
  cloneAccount,
  cloneAccountWorkspace,
  createDeliveryReceipt,
  createUniqueUsername,
  wait,
} from "@/features/account-management/repositories/mock-account-store-helpers";

type MockOptions = Readonly<{
  getZones?: () => readonly FarmingZoneOption[];
  getRoles?: () => readonly AssignableRole[];
  featureCatalog: readonly FeatureCatalogItem[];
  initialAccounts: readonly ManagedAccount[];
  isAuthorized?: boolean;
  isSessionExpired?: boolean;
  latencyMs?: number;
  roles: readonly AssignableRole[];
  zones: readonly FarmingZoneOption[];
}>;

/** Mock-only hooks used by tests and other mock repositories (profile, employee linking). */
type MockAccountRepositoryExtensions = Readonly<{
  snapshotAccounts(): readonly ManagedAccount[];
  recordMockVerifiedContact(accountId: string, channel: "email" | "sms", value: string): void;
  recordMockProfile(profile: PersonalProfile): void;
  mockCredentialVersion(accountId: string): number;
}>;

/** In-memory account store used by tests and mock mode. */
export function createMockAccountManagementRepository({
  getRoles,
  getZones,
  featureCatalog,
  initialAccounts,
  isAuthorized = true,
  isSessionExpired = false,
  latencyMs = 350,
  roles: initialRoles,
  zones: initialZones,
}: MockOptions): AccountManagementRepository & MockAccountRepositoryExtensions & Readonly<{
  createLinkedAccount<T>(input: Omit<SaveAccountInput, "id" | "recordVersion">,
    beforePublish: (account: ManagedAccount) => T | undefined): Promise<SaveAccountResult | T>;
}> {
  let roles = initialRoles;
  let zones = initialZones;
  const credentialVersions = new Map<string, number>();
  let accounts = initialAccounts.map(cloneAccount);
  let nextAccountNumber = accounts.length + 1;
  let nextGrantNumber = 1;
  let nextVersion = accounts.length + 1;

  async function prepareRequest() {
    if (latencyMs > 0) await wait(latencyMs);
    if (isSessionExpired) {
      return { message: { code: "MSG19" }, status: "session-expired" } as const;
    }
    if (!isAuthorized) {
      return { message: { code: "MSG02" }, status: "forbidden" } as const;
    }
    roles = getRoles?.() ?? roles;
    zones = getZones?.() ?? zones;
  }

  function findAccount(accountId: string) {
    return accounts.find((account) => account.id === accountId);
  }

  function replaceAccount(account: ManagedAccount) {
    accounts = accounts.map((item) => (item.id === account.id ? account : item));
  }

  const repository = {
    snapshotAccounts: () => accounts.map(cloneAccount),
    mockCredentialVersion: (accountId) => credentialVersions.get(accountId) ?? 0,
    recordMockVerifiedContact(accountId, channel, value) {
      const current = accounts.find((account) => account.id === accountId);
      if (!current || (channel === "email" ? current.email : current.phone) !== value) return;
      replaceAccount({ ...current, emailVerified: channel === "email" ? true : current.emailVerified,
        phoneVerified: channel === "sms" ? true : current.phoneVerified, recordVersion: `account-v${++nextVersion}` });
    },
    recordMockProfile(profile) {
      const current = accounts.find((account) => account.id === profile.accountId);
      if (!current) return;
      replaceAccount({ ...current, displayName: profile.displayName, email: profile.email?.value ?? "",
        emailVerified: profile.email?.isVerified ?? false, phone: profile.phone?.value ?? current.phone,
        phoneVerified: profile.phone?.isVerified ?? false, recordVersion: `account-v${++nextVersion}` });
    },
    async load() {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      return {
        status: "loaded",
        workspace: cloneAccountWorkspace({ accounts, featureCatalog, roles, zones }),
      };
    },

    async save<T = never>(input: SaveAccountInput, beforePublish?: (account: ManagedAccount) => T | undefined): Promise<SaveAccountResult | T> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;

      const parsed = accountEditorSchema.safeParse(input);
      if (!parsed.success) {
        return toInvalidFieldResult(parsed.error.issues[0]?.path[0]);
      }

      const current = input.id ? findAccount(input.id) : undefined;
      if (current && current.accountType !== "internal") {
        return forbiddenResult();
      }

      const duplicate = findDuplicateContact(parsed.data, input.id, accounts);
      if (duplicate) return duplicate;

      const invalidGrants = findInvalidGrants({ accounts, current, input, roles, zones });
      if (invalidGrants) return invalidGrants;

      const addedGrants: readonly AccessGrant[] = input.newGrants.map((grant) => ({
        effectiveFrom: grant.effectiveFrom,
        effectiveTo: grant.effectiveTo || null,
        grantedBy: mockIdentities.owner.displayName,
        id: `grant-${nextGrantNumber++}`,
        revocationReason: null,
        revokedAt: null,
        roleId: grant.roleId,
        status: "effective",
        zoneId: grant.zoneId === "all-zones" ? null : grant.zoneId,
      }));

      nextVersion += 1;
      const username = current?.username ?? createUniqueUsername(parsed.data.fullName, accounts);
      const saved: ManagedAccount = current
        ? {
            ...current,
            credentialDeliveryChannel: parsed.data.deliveryChannel,
            displayName: parsed.data.fullName,
            email: parsed.data.email,
            emailVerified:
              current.email === parsed.data.email ? current.emailVerified : false,
            grants: [...current.grants, ...addedGrants],
            phone: parsed.data.phone,
            phoneVerified:
              current.phone === parsed.data.phone ? current.phoneVerified : false,
            recordVersion: `account-v${nextVersion}`,
            username,
          }
        : {
            accountType: "internal",
            credentialDeliveryChannel: parsed.data.deliveryChannel,
            displayName: parsed.data.fullName,
            email: parsed.data.email,
            emailVerified: false,
            grants: addedGrants,
            id: `account-${nextAccountNumber++}`,
            phone: parsed.data.phone,
            phoneVerified: false,
            recordVersion: `account-v${nextVersion}`,
            status: "active",
            username,
          };

      // No await between this check/link and publication: one mock commit turn.
      if (!current && beforePublish) {
        const rejection = beforePublish(cloneAccount(saved));
        if (rejection !== undefined) return rejection;
      }
      if (current) replaceAccount(saved);
      else accounts = [...accounts, saved];

      return {
        account: cloneAccount(saved),
        delivery: current ? undefined : createDeliveryReceipt(saved),
        status: "saved",
      };
    },

    async changeStatus(
      input: ChangeAccountStatusInput,
    ): Promise<ChangeAccountStatusResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      const account = findAccount(input.accountId);
      if (!isManageableAccount(account)) return forbiddenResult();
      if (!input.reason.trim()) return missingReasonResult();
      if (!input.confirmed) {
        return confirmationRequiredResult(
          input.action === "lock" ? "khóa tài khoản" : "mở khóa tài khoản",
        );
      }
      const changed = {
        ...account,
        recordVersion: `account-v${++nextVersion}`,
        status: input.action === "lock" ? "locked" : "active",
      } as const;
      replaceAccount(changed);
      return { account: cloneAccount(changed), status: "changed" };
    },

    async revokeGrant(input: RevokeGrantInput): Promise<RevokeGrantResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      const account = findAccount(input.accountId);
      if (!isManageableAccount(account)) return forbiddenResult();
      if (!input.reason.trim()) return missingReasonResult();
      const grant = account.grants.find(
        (item) => item.id === input.grantId && item.status === "effective",
      );
      // Unknown or already revoked grant is reported as invalid input on the reason field.
      if (!grant) return missingReasonResult();
      if (!input.confirmed) {
        return confirmationRequiredResult("thu hồi quyền truy cập này");
      }
      const changed = revokeGrantInHistory(
        account,
        grant.id,
        input.reason.trim(),
        `account-v${++nextVersion}`,
      );
      replaceAccount(changed);
      return { account: cloneAccount(changed), status: "revoked" };
    },

    async resetPassword(
      input: ResetPasswordInput,
    ): Promise<ResetPasswordResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      const account = findAccount(input.accountId);
      if (!isManageableAccount(account)) return forbiddenResult();
      if (!input.confirmed) {
        return confirmationRequiredResult("đặt lại mật khẩu tài khoản");
      }
      credentialVersions.set(account.id, (credentialVersions.get(account.id) ?? 0) + 1);
      return {
        delivery: createDeliveryReceipt(account),
        status: "reset",
      };
    },
  } satisfies AccountManagementRepository & MockAccountRepositoryExtensions;
  return { ...repository,
    createLinkedAccount<T>(input: Omit<SaveAccountInput, "id" | "recordVersion">, beforePublish: (account: ManagedAccount) => T | undefined) {
      return repository.save({ ...input, id: null, recordVersion: null }, beforePublish);
    },
  };
}

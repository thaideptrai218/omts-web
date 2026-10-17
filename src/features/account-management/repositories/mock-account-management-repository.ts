import type {
  AccessGrant,
  AccountManagementWorkspace,
  AssignableRole,
  ChangeAccountStatusInput,
  ChangeAccountStatusResult,
  FarmingZoneOption,
  ManagedAccount,
  OneTimeTemporaryCredential,
  ResetPasswordInput,
  ResetPasswordResult,
  RevokeGrantInput,
  RevokeGrantResult,
  SaveAccountInput,
  SaveAccountResult,
} from "@/features/account-management/domain/account-management";
import type { FeatureCatalogItem } from "@/features/role-management/domain/role-management";
import type { AccountManagementRepository } from "@/features/account-management/repositories/account-management-repository";
import { accountEditorSchema } from "@/features/account-management/schemas/account-editor-schema";

type MockOptions = Readonly<{
  featureCatalog: readonly FeatureCatalogItem[];
  initialAccounts: readonly ManagedAccount[];
  isAuthorized?: boolean;
  isSessionExpired?: boolean;
  latencyMs?: number;
  roles: readonly AssignableRole[];
  zones: readonly FarmingZoneOption[];
}>;

const temporaryPasswordCharacters =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cloneAccount(account: ManagedAccount): ManagedAccount {
  return { ...account, grants: account.grants.map((grant) => ({ ...grant })) };
}

function generateTemporaryPassword(): string {
  const values = new Uint32Array(10);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => temporaryPasswordCharacters[value % temporaryPasswordCharacters.length],
  ).join("");
}

function createCredential(username: string): OneTimeTemporaryCredential {
  return {
    accountIdentifier: username,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    temporaryPassword: generateTemporaryPassword(),
  };
}

export function createMockAccountManagementRepository({
  featureCatalog,
  initialAccounts,
  isAuthorized = true,
  isSessionExpired = false,
  latencyMs = 350,
  roles,
  zones,
}: MockOptions): AccountManagementRepository {
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
  }

  function findAccount(accountId: string) {
    return accounts.find((account) => account.id === accountId);
  }

  function replaceAccount(account: ManagedAccount) {
    accounts = accounts.map((item) => (item.id === account.id ? account : item));
  }

  function workspace(): AccountManagementWorkspace {
    return {
      accounts: accounts.map(cloneAccount),
      featureCatalog: featureCatalog.map((feature) => ({
        ...feature,
        supportedActions: [...feature.supportedActions],
      })),
      roles: roles.map((role) => ({
        ...role,
        permissions: role.permissions.map((permission) => ({
          ...permission,
          actionKeys: [...permission.actionKeys],
        })),
      })),
      zones: zones.map((zone) => ({ ...zone })),
    };
  }

  return {
    async load() {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      return { status: "loaded", workspace: workspace() };
    },

    async save(input: SaveAccountInput): Promise<SaveAccountResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;

      const parsed = accountEditorSchema.safeParse(input);
      if (!parsed.success) {
        const field = parsed.error.issues[0]?.path[0];
        return {
          field:
            field === "displayName" || field === "email" || field === "phone" || field === "username"
              ? field
              : "displayName",
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }

      const current = input.id ? findAccount(input.id) : undefined;
      if (current && current.accountType !== "internal") {
        return { message: { code: "MSG02" }, status: "forbidden" };
      }

      const duplicateUsername = accounts.find(
        (account) =>
          account.id !== input.id &&
          account.username.localeCompare(parsed.data.username, "vi", { sensitivity: "base" }) === 0,
      );
      if (duplicateUsername) {
        return {
          existingAccountId: duplicateUsername.id,
          field: "username",
          message: { code: "MSG03", params: { object_name: "Tên đăng nhập" } },
          status: "duplicate",
        };
      }

      const duplicatePhone = accounts.find(
        (account) => account.id !== input.id && account.phone === parsed.data.phone,
      );
      if (duplicatePhone) {
        return {
          existingAccountId: duplicatePhone.id,
          field: "phone",
          message: { code: "MSG03", params: { object_name: "Số điện thoại" } },
          status: "duplicate",
        };
      }

      const effectiveGrantKeys = new Set(
        current?.grants
          .filter((grant) => grant.status === "effective")
          .map((grant) => `${grant.zoneId ?? "all-zones"}:${grant.roleId}`) ?? [],
      );

      for (const grant of input.newGrants) {
        const role = roles.find((item) => item.id === grant.roleId);
        const zone =
          grant.zoneId === "all-zones"
            ? undefined
            : zones.find((item) => item.id === grant.zoneId);
        const key = `${grant.zoneId}:${grant.roleId}`;
        const invalidDates =
          !grant.effectiveFrom ||
          (grant.effectiveTo.length > 0 && grant.effectiveTo < grant.effectiveFrom);

        if (
          !role ||
          role.status !== "in-use" ||
          (grant.zoneId !== "all-zones" && (!zone || zone.status !== "in-use")) ||
          effectiveGrantKeys.has(key) ||
          invalidDates
        ) {
          return {
            field: "grants",
            message: { code: "MSG01" },
            status: "invalid-input",
          };
        }
        effectiveGrantKeys.add(key);
      }

      if (effectiveGrantKeys.size === 0) {
        return {
          field: "grants",
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }

      const addedGrants: readonly AccessGrant[] = input.newGrants.map((grant) => ({
        effectiveFrom: grant.effectiveFrom,
        effectiveTo: grant.effectiveTo || null,
        grantedBy: "Chủ HTX Trung Nam",
        id: `grant-${nextGrantNumber++}`,
        revocationReason: null,
        revokedAt: null,
        roleId: grant.roleId,
        status: "effective",
        zoneId: grant.zoneId === "all-zones" ? null : grant.zoneId,
      }));

      nextVersion += 1;
      const saved: ManagedAccount = current
        ? {
            ...current,
            displayName: parsed.data.displayName,
            email: parsed.data.email,
            grants: [...current.grants, ...addedGrants],
            phone: parsed.data.phone,
            phoneVerified:
              current.phone === parsed.data.phone ? current.phoneVerified : false,
            recordVersion: `account-v${nextVersion}`,
            username: parsed.data.username,
          }
        : {
            accountType: "internal",
            displayName: parsed.data.displayName,
            email: parsed.data.email,
            grants: addedGrants,
            id: `account-${nextAccountNumber++}`,
            phone: parsed.data.phone,
            phoneVerified: false,
            recordVersion: `account-v${nextVersion}`,
            status: "active",
            username: parsed.data.username,
          };

      if (current) replaceAccount(saved);
      else accounts = [...accounts, saved];

      return {
        account: cloneAccount(saved),
        credential: current ? undefined : createCredential(saved.username),
        status: "saved",
      };
    },

    async changeStatus(
      input: ChangeAccountStatusInput,
    ): Promise<ChangeAccountStatusResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      const account = findAccount(input.accountId);
      if (!account || account.accountType !== "internal") {
        return { message: { code: "MSG02" }, status: "forbidden" };
      }
      if (!input.reason.trim()) {
        return {
          field: "reason",
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }
      if (!input.confirmed) {
        return {
          message: {
            code: "MSG09",
            params: {
              action: input.action === "lock" ? "khóa tài khoản" : "mở khóa tài khoản",
            },
          },
          status: "confirmation-required",
        };
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
      if (!account || account.accountType !== "internal") {
        return { message: { code: "MSG02" }, status: "forbidden" };
      }
      if (!input.reason.trim()) {
        return {
          field: "reason",
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }
      const grant = account.grants.find(
        (item) => item.id === input.grantId && item.status === "effective",
      );
      if (!grant) {
        return {
          field: "reason",
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }
      if (!input.confirmed) {
        return {
          message: {
            code: "MSG09",
            params: { action: "thu hồi quyền truy cập này" },
          },
          status: "confirmation-required",
        };
      }
      const revokedAt = new Date().toISOString();
      const changed: ManagedAccount = {
        ...account,
        grants: account.grants.map((item) =>
          item.id === grant.id
            ? {
                ...item,
                effectiveTo: revokedAt.slice(0, 10),
                revocationReason: input.reason.trim(),
                revokedAt,
                status: "revoked",
              }
            : item,
        ),
        recordVersion: `account-v${++nextVersion}`,
      };
      replaceAccount(changed);
      return { account: cloneAccount(changed), status: "revoked" };
    },

    async resetPassword(
      input: ResetPasswordInput,
    ): Promise<ResetPasswordResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      const account = findAccount(input.accountId);
      if (!account || account.accountType !== "internal") {
        return { message: { code: "MSG02" }, status: "forbidden" };
      }
      if (!input.confirmed) {
        return {
          message: {
            code: "MSG09",
            params: { action: "đặt lại mật khẩu tài khoản" },
          },
          status: "confirmation-required",
        };
      }
      return {
        credential: createCredential(account.username),
        status: "reset",
      };
    },
  };
}

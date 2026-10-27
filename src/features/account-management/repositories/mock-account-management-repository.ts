import type {
  AccessGrant,
  AccountManagementWorkspace,
  AssignableRole,
  ChangeAccountStatusInput,
  ChangeAccountStatusResult,
  CredentialDeliveryReceipt,
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

type MockOptions = Readonly<{
  getRoles?: () => readonly AssignableRole[];
  featureCatalog: readonly FeatureCatalogItem[];
  initialAccounts: readonly ManagedAccount[];
  isAuthorized?: boolean;
  isSessionExpired?: boolean;
  latencyMs?: number;
  roles: readonly AssignableRole[];
  zones: readonly FarmingZoneOption[];
}>;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cloneAccount(account: ManagedAccount): ManagedAccount {
  return { ...account, grants: account.grants.map((grant) => ({ ...grant })) };
}

function usernameBase(fullName: string): string {
  const normalized = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");

  return normalized || "staff";
}

function createUniqueUsername(
  fullName: string,
  accounts: readonly ManagedAccount[],
): string {
  const base = usernameBase(fullName);

  for (let suffix = accounts.length + 1; suffix < accounts.length + 10_001; suffix += 1) {
    const candidate = `${base}.${String(suffix).padStart(4, "0")}`;
    const exists = accounts.some(
      (account) => account.username.toLowerCase() === candidate.toLowerCase(),
    );
    if (!exists) return candidate;
  }

  throw new Error("Unable to generate a unique mock username.");
}

function maskRecipient(channel: "email" | "phone", value: string): string {
  if (channel === "email") {
    const [localPart, domain] = value.split("@");
    return localPart && domain ? `${localPart.slice(0, 2)}***@${domain}` : "***";
  }

  const digits = value.replace(/\D/g, "");
  return digits.length > 4 ? `••••••${digits.slice(-4)}` : "••••";
}

function createDeliveryReceipt(account: ManagedAccount): CredentialDeliveryReceipt {
  const channel = account.credentialDeliveryChannel;
  const recipient = channel === "email" ? account.email : account.phone;

  return {
    channel,
    deliveryStatus: "sent",
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    maskedRecipient: maskRecipient(channel, recipient),
    username: account.username,
  };
}

export function createMockAccountManagementRepository({
  getRoles,
  featureCatalog,
  initialAccounts,
  isAuthorized = true,
  isSessionExpired = false,
  latencyMs = 350,
  roles: initialRoles,
  zones,
}: MockOptions): AccountManagementRepository & Readonly<{
  snapshotAccounts(): readonly ManagedAccount[];
  recordMockVerifiedContact(accountId: string, channel: "email" | "sms", value: string): void;
  recordMockProfile(profile: PersonalProfile): void;
  mockCredentialVersion(accountId: string): number;
}> {
  let roles = initialRoles;
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
            field === "deliveryChannel" ||
            field === "email" ||
            field === "fullName" ||
            field === "phone"
              ? field
              : "fullName",
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }

      const current = input.id ? findAccount(input.id) : undefined;
      if (current && current.accountType !== "internal") {
        return { message: { code: "MSG02" }, status: "forbidden" };
      }

      const duplicateEmail = parsed.data.email
        ? accounts.find(
            (account) =>
              account.id !== input.id &&
              account.email.localeCompare(parsed.data.email, "en", {
                sensitivity: "base",
              }) === 0,
          )
        : undefined;
      if (duplicateEmail) {
        return {
          existingAccountId: duplicateEmail.id,
          field: "email",
          message: { code: "MSG03", params: { object_name: "Email" } },
          status: "duplicate",
        };
      }

      const duplicatePhone = parsed.data.phone
        ? accounts.find(
            (account) =>
              account.id !== input.id && account.phone === parsed.data.phone,
          )
        : undefined;
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
      credentialVersions.set(account.id, (credentialVersions.get(account.id) ?? 0) + 1);
      return {
        delivery: createDeliveryReceipt(account),
        status: "reset",
      };
    },
  };
}

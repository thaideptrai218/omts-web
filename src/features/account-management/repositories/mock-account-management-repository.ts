import type {
  AssignableRole,
  FarmingZoneOption,
  ManagedAccount,
  SaveAccountInput,
  SaveAccountResult,
} from "@/features/account-management/domain/account-management";
import type { FeatureCatalogItem } from "@/features/role-management/domain/role-management";
import type { AccountManagementRepository } from "@/features/account-management/repositories/account-management-repository";
import { accountEditorSchema } from "@/features/account-management/schemas/account-editor-schema";
import type { PersonalProfile } from "@/features/profile/domain/personal-profile";
import { forbiddenResult } from "@/features/account-management/repositories/mock-account-lifecycle-results";
import { createMockAccountLifecycleMethods } from "@/features/account-management/repositories/mock-account-lifecycle-methods";
import {
  buildAddedGrants,
  buildSavedAccount,
} from "@/features/account-management/repositories/mock-account-save-builders";
import {
  findDuplicateContact,
  findInvalidGrants,
  toInvalidFieldResult,
} from "@/features/account-management/repositories/mock-account-save-validation";
import { createMockAccountStore } from "@/features/account-management/repositories/mock-account-store";
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
  const store = createMockAccountStore(initialAccounts);

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

  const repository = {
    snapshotAccounts: () => store.all().map(cloneAccount),
    mockCredentialVersion: (accountId) => credentialVersions.get(accountId) ?? 0,
    recordMockVerifiedContact(accountId, channel, value) {
      const current = store.find(accountId);
      if (!current || (channel === "email" ? current.email : current.phone) !== value) return;
      store.replace({ ...current, emailVerified: channel === "email" ? true : current.emailVerified,
        phoneVerified: channel === "sms" ? true : current.phoneVerified, recordVersion: store.nextRecordVersion() });
    },
    recordMockProfile(profile) {
      const current = store.find(profile.accountId);
      if (!current) return;
      store.replace({ ...current, displayName: profile.displayName, email: profile.email?.value ?? "",
        emailVerified: profile.email?.isVerified ?? false, phone: profile.phone?.value ?? current.phone,
        phoneVerified: profile.phone?.isVerified ?? false, recordVersion: store.nextRecordVersion() });
    },
    async load() {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      return {
        status: "loaded",
        workspace: cloneAccountWorkspace({ accounts: store.all(), featureCatalog, roles, zones }),
      };
    },

    async save<T = never>(input: SaveAccountInput, beforePublish?: (account: ManagedAccount) => T | undefined): Promise<SaveAccountResult | T> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;

      const parsed = accountEditorSchema.safeParse(input);
      if (!parsed.success) {
        return toInvalidFieldResult(parsed.error.issues[0]?.path[0]);
      }

      const current = input.id ? store.find(input.id) : undefined;
      if (current && current.accountType !== "internal") {
        return forbiddenResult();
      }

      const duplicate = findDuplicateContact(parsed.data, input.id, store.all());
      if (duplicate) return duplicate;

      const invalidGrants = findInvalidGrants({ accounts: store.all(), current, input, roles, zones });
      if (invalidGrants) return invalidGrants;

      // Counter order (grants, version, account id) matches the original single-closure store.
      const addedGrants = buildAddedGrants(input.newGrants, store.nextGrantId);
      const recordVersion = store.nextRecordVersion();
      const username = current?.username ?? createUniqueUsername(parsed.data.fullName, store.all());
      const saved = buildSavedAccount({
        addedGrants,
        current,
        data: parsed.data,
        nextAccountId: store.nextAccountId,
        recordVersion,
        username,
      });

      // No await between this check/link and publication: one mock commit turn.
      if (!current && beforePublish) {
        const rejection = beforePublish(cloneAccount(saved));
        if (rejection !== undefined) return rejection;
      }
      if (current) store.replace(saved);
      else store.append(saved);

      return {
        account: cloneAccount(saved),
        delivery: current ? undefined : createDeliveryReceipt(saved),
        status: "saved",
      };
    },

    ...createMockAccountLifecycleMethods({ credentialVersions, prepareRequest, store }),
  } satisfies AccountManagementRepository & MockAccountRepositoryExtensions;
  return { ...repository,
    createLinkedAccount<T>(input: Omit<SaveAccountInput, "id" | "recordVersion">, beforePublish: (account: ManagedAccount) => T | undefined) {
      return repository.save({ ...input, id: null, recordVersion: null }, beforePublish);
    },
  };
}

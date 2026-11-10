import type {
  ChangeAccountStatusInput,
  ChangeAccountStatusResult,
  ResetPasswordInput,
  ResetPasswordResult,
  RevokeGrantInput,
  RevokeGrantResult,
} from "@/features/account-management/domain/account-management";
import {
  confirmationRequiredResult,
  forbiddenResult,
  isManageableAccount,
  missingReasonResult,
  revokeGrantInHistory,
} from "@/features/account-management/repositories/mock-account-lifecycle-results";
import type {
  MockAccountPrepareRequest,
  MockAccountStore,
} from "@/features/account-management/repositories/mock-account-store";
import {
  cloneAccount,
  createDeliveryReceipt,
} from "@/features/account-management/repositories/mock-account-store-helpers";

/** Lock/unlock, grant revocation and password reset of the mock account repository. */
export function createMockAccountLifecycleMethods({
  credentialVersions,
  prepareRequest,
  store,
}: Readonly<{
  credentialVersions: Map<string, number>;
  prepareRequest: MockAccountPrepareRequest;
  store: MockAccountStore;
}>) {
  return {
    async changeStatus(
      input: ChangeAccountStatusInput,
    ): Promise<ChangeAccountStatusResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      const account = store.find(input.accountId);
      if (!isManageableAccount(account)) return forbiddenResult();
      if (!input.reason.trim()) return missingReasonResult();
      if (!input.confirmed) {
        return confirmationRequiredResult(
          input.action === "lock" ? "khóa tài khoản" : "mở khóa tài khoản",
        );
      }
      const changed = {
        ...account,
        recordVersion: store.nextRecordVersion(),
        status: input.action === "lock" ? "locked" : "active",
      } as const;
      store.replace(changed);
      return { account: cloneAccount(changed), status: "changed" };
    },

    async revokeGrant(input: RevokeGrantInput): Promise<RevokeGrantResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      const account = store.find(input.accountId);
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
        store.nextRecordVersion(),
      );
      store.replace(changed);
      return { account: cloneAccount(changed), status: "revoked" };
    },

    async resetPassword(
      input: ResetPasswordInput,
    ): Promise<ResetPasswordResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      const account = store.find(input.accountId);
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
  };
}

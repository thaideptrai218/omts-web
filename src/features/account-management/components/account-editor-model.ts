import type {
  AccountManagementWorkspace,
  ManagedAccount,
} from "@/features/account-management/domain/account-management";
import type { AccountEditorValues } from "@/features/account-management/schemas/account-editor-schema";

// Pure view-model helpers for the account editor (no React, no I/O).

export type AccountEditorStep = "edit" | "preview";

export type AccountEditorFeedback = Readonly<{
  text: string;
  tone: "danger" | "success";
}>;

export const accountInputStyles =
  "mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 text-text disabled:bg-surface-subtle disabled:text-text-muted";

export function initialAccountEditorValues(
  account?: ManagedAccount,
): AccountEditorValues {
  return {
    deliveryChannel: account?.credentialDeliveryChannel ?? "phone",
    email: account?.email ?? "",
    fullName: account?.displayName ?? "",
    phone: account?.phone ?? "",
  };
}

/** Vai trò Kế toán chỉ được cấp trên phạm vi tất cả vùng. */
export function findAccountantRoleIds(
  workspace: AccountManagementWorkspace,
): string[] {
  return workspace.roles
    .filter((role) => role.name === "Kế toán")
    .map((role) => role.id);
}

/** Vai trò Kế toán đang hiệu lực ở tài khoản khác thì không được cấp thêm. */
export function findUnavailableRoleIds(
  accountantRoleIds: readonly string[],
  workspace: AccountManagementWorkspace,
  accountId: string | undefined,
): string[] {
  return accountantRoleIds.filter((roleId) =>
    workspace.accounts.some(
      (candidate) =>
        candidate.id !== accountId &&
        candidate.grants.some(
          (grant) => grant.status === "effective" && grant.roleId === roleId,
        ),
    ),
  );
}

export function countEffectiveGrants(
  account: ManagedAccount | undefined,
  draftCount: number,
): number {
  return (
    (account?.grants.filter((grant) => grant.status === "effective").length ??
      0) + draftCount
  );
}

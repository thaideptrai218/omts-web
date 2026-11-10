import type { ManagedAccount } from "@/features/account-management/domain/account-management";

// Result builders shared by the mock lock/unlock, revoke and reset-password flows.

export function forbiddenResult() {
  return { message: { code: "MSG02" }, status: "forbidden" } as const;
}

export function missingReasonResult() {
  return {
    field: "reason",
    message: { code: "MSG01" },
    status: "invalid-input",
  } as const;
}

/** MSG09: thao tác cần người dùng xác nhận trước khi thực hiện. */
export function confirmationRequiredResult(action: string) {
  return {
    message: { code: "MSG09", params: { action } },
    status: "confirmation-required",
  } as const;
}

/** Chỉ tài khoản nội bộ mới được khóa, thu hồi quyền hoặc đặt lại mật khẩu tại đây. */
export function isManageableAccount(
  account: ManagedAccount | undefined,
): account is ManagedAccount {
  return Boolean(account) && account?.accountType === "internal";
}

/** Thu hồi một quyền nhưng giữ dòng quyền trong lịch sử, kèm lý do và thời điểm. */
export function revokeGrantInHistory(
  account: ManagedAccount,
  grantId: string,
  reason: string,
  recordVersion: string,
): ManagedAccount {
  const revokedAt = new Date().toISOString();
  return {
    ...account,
    grants: account.grants.map((item) =>
      item.id === grantId
        ? {
            ...item,
            effectiveTo: revokedAt.slice(0, 10),
            revocationReason: reason,
            revokedAt,
            status: "revoked",
          }
        : item,
    ),
    recordVersion,
  };
}

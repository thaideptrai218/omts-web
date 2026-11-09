import type {
  AssignableRole,
  FarmingZoneOption,
  ManagedAccount,
  SaveAccountInput,
  SaveAccountResult,
} from "@/features/account-management/domain/account-management";
import type { AccountEditorValues } from "@/features/account-management/schemas/account-editor-schema";

type InvalidInputResult = Extract<SaveAccountResult, { status: "invalid-input" }>;
type DuplicateResult = Extract<SaveAccountResult, { status: "duplicate" }>;

function invalidGrantsResult(): InvalidInputResult {
  return { field: "grants", message: { code: "MSG01" }, status: "invalid-input" };
}

/** Maps the first schema issue path to a form field; unknown paths fall back to fullName. */
export function toInvalidFieldResult(issuePath: PropertyKey | undefined): InvalidInputResult {
  return {
    field:
      issuePath === "deliveryChannel" ||
      issuePath === "email" ||
      issuePath === "fullName" ||
      issuePath === "phone"
        ? issuePath
        : "fullName",
    message: { code: "MSG01" },
    status: "invalid-input",
  };
}

/** Email (không phân biệt hoa thường) và số điện thoại phải duy nhất giữa các tài khoản khác. */
export function findDuplicateContact(
  values: AccountEditorValues,
  accountId: string | null,
  accounts: readonly ManagedAccount[],
): DuplicateResult | undefined {
  const duplicateEmail = values.email
    ? accounts.find(
        (account) =>
          account.id !== accountId &&
          account.email.localeCompare(values.email, "en", {
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

  const duplicatePhone = values.phone
    ? accounts.find(
        (account) => account.id !== accountId && account.phone === values.phone,
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

  return undefined;
}

/**
 * Kiểm tra các dòng quyền mới. Từ chối khi: vai trò/vùng không còn dùng, trùng cặp
 * vùng-vai trò đang hiệu lực, ngày hiệu lực sai, Kế toán chỉ được cấp cho "tất cả vùng",
 * hoặc Kế toán đã được giao cho tài khoản khác. Tài khoản phải còn ít nhất một quyền.
 */
export function findInvalidGrants({
  accounts,
  current,
  input,
  roles,
  zones,
}: Readonly<{
  accounts: readonly ManagedAccount[];
  current: ManagedAccount | undefined;
  input: SaveAccountInput;
  roles: readonly AssignableRole[];
  zones: readonly FarmingZoneOption[];
}>): InvalidInputResult | undefined {
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
    const isAccountant = role?.name === "Kế toán";
    const accountantAlreadyAssigned = isAccountant && accounts.some(
      (account) =>
        account.id !== input.id &&
        account.grants.some(
          (existing) =>
            existing.status === "effective" &&
            existing.roleId === grant.roleId,
        ),
    );

    if (
      !role ||
      role.status !== "in-use" ||
      (grant.zoneId !== "all-zones" && (!zone || zone.status !== "in-use")) ||
      effectiveGrantKeys.has(key) ||
      invalidDates ||
      (isAccountant && grant.zoneId !== "all-zones") ||
      accountantAlreadyAssigned
    ) {
      return invalidGrantsResult();
    }
    effectiveGrantKeys.add(key);
  }

  return effectiveGrantKeys.size === 0 ? invalidGrantsResult() : undefined;
}

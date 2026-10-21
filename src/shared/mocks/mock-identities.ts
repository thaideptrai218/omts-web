export type MockIdentity = Readonly<{
  accountId: string;
  displayName: string;
  organizationName: string | null;
  primaryRoleLabel: string;
  scopeLabel: string;
  username: string;
}>;

export const trungNamCooperativeName =
  "Hợp tác xã Nuôi trồng Thủy sản Trung Nam";

export const mockIdentities = {
  owner: {
    accountId: "account-owner-demo",
    displayName: "Lê Minh Hải",
    organizationName: trungNamCooperativeName,
    primaryRoleLabel: "Chủ hợp tác xã",
    scopeLabel: "Toàn hợp tác xã",
    username: "owner",
  },
  staff: {
    accountId: "account-staff-verified",
    displayName: "Nguyễn Văn An",
    organizationName: trungNamCooperativeName,
    primaryRoleLabel: "Quản lý vùng",
    scopeLabel: "Khu Đông",
    username: "staff-verified",
  },
  systemAdmin: {
    accountId: "account-system-admin-demo",
    displayName: "Trần Minh Quân",
    organizationName: null,
    primaryRoleLabel: "Quản trị viên hệ thống",
    scopeLabel: "Toàn hệ thống",
    username: "sysadmin",
  },
} as const satisfies Record<string, MockIdentity>;

export function createMockStaffIdentity(username: string): MockIdentity {
  return {
    ...mockIdentities.staff,
    accountId: `account-${username}`,
    username,
  };
}

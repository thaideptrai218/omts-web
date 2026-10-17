import type {
  FarmingZoneOption,
  ManagedAccount,
} from "@/features/account-management/domain/account-management";
import { mockRoles } from "@/features/role-management/mocks/role-management-fixtures";

export const mockFarmingZones = [
  { id: "zone-east", label: "Khu Đông", status: "in-use" },
  { id: "zone-south", label: "Khu Nam", status: "in-use" },
  { id: "zone-west", label: "Khu Tây (đã ngừng)", status: "discontinued" },
] as const satisfies readonly FarmingZoneOption[];

export const mockAssignableRoles = mockRoles.map((role) => ({
  id: role.id,
  name: role.name,
  permissions: role.permissions,
  status: role.status,
}));

export const mockManagedAccounts = [
  {
    accountType: "cooperative-owner",
    displayName: "Chủ HTX Trung Nam",
    email: "owner@omts.test",
    grants: [],
    id: "account-owner-demo",
    phone: "0900000000",
    phoneVerified: true,
    recordVersion: "account-v1",
    status: "active",
    username: "owner",
  },
  {
    accountType: "internal",
    displayName: "Nguyễn Văn An",
    email: "an.nguyen@omts.test",
    grants: [
      {
        effectiveFrom: "2026-09-15",
        effectiveTo: null,
        grantedBy: "Chủ HTX Trung Nam",
        id: "grant-an-east-manager",
        revocationReason: null,
        revokedAt: null,
        roleId: "role-zone-manager",
        status: "effective",
        zoneId: "zone-east",
      },
      {
        effectiveFrom: "2026-08-01",
        effectiveTo: "2026-09-14",
        grantedBy: "Chủ HTX Trung Nam",
        id: "grant-an-old-accountant",
        revocationReason: "Chuyển phạm vi phụ trách",
        revokedAt: "2026-09-14T09:15:00.000Z",
        roleId: "role-accountant",
        status: "revoked",
        zoneId: "zone-south",
      },
    ],
    id: "account-nguyen-an",
    phone: "0901234567",
    phoneVerified: true,
    recordVersion: "account-v2",
    status: "active",
    username: "nguyen.an",
  },
  {
    accountType: "internal",
    displayName: "Trần Thị Bình",
    email: "",
    grants: [
      {
        effectiveFrom: "2026-10-01",
        effectiveTo: null,
        grantedBy: "Chủ HTX Trung Nam",
        id: "grant-binh-all-accountant",
        revocationReason: null,
        revokedAt: null,
        roleId: "role-accountant",
        status: "effective",
        zoneId: null,
      },
    ],
    id: "account-tran-binh",
    phone: "0902222333",
    phoneVerified: false,
    recordVersion: "account-v3",
    status: "locked",
    username: "tran.binh",
  },
  {
    accountType: "internal",
    displayName: "Phạm Quốc Cường",
    email: "cuong.pham@omts.test",
    grants: [
      {
        effectiveFrom: "2026-10-10",
        effectiveTo: null,
        grantedBy: "Chủ HTX Trung Nam",
        id: "grant-cuong-south-manager",
        revocationReason: null,
        revokedAt: null,
        roleId: "role-zone-manager",
        status: "effective",
        zoneId: "zone-south",
      },
    ],
    id: "account-pham-cuong",
    phone: "0936777888",
    phoneVerified: true,
    recordVersion: "account-v4",
    status: "active",
    username: "pham.cuong",
  },
] as const satisfies readonly ManagedAccount[];

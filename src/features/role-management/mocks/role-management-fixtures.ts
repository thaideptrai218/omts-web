import type {
  FeatureCatalogItem,
  RoleDetails,
} from "@/features/role-management/domain/role-management";

const createAction = { category: "create", key: "CREATE", label: "Tạo" } as const;
const viewAction = { category: "view", key: "VIEW", label: "Xem" } as const;
const editAction = { category: "edit", key: "EDIT", label: "Sửa" } as const;
const deleteAction = { category: "delete", key: "DELETE", label: "Xóa" } as const;

const zoneScope = {
  options: [
    { id: "OWN", label: "Chỉ bản ghi của mình" },
    { id: "ZONE", label: "Toàn bộ trong khu được gán" },
  ],
  requiredWhenGranted: true,
} as const;

export const mockFeatureCatalog = [
  {
    code: "EMPLOYEE",
    description: "Hồ sơ nhân sự dùng chung trong hợp tác xã.",
    groupLabel: "Nhân sự",
    label: "Hồ sơ nhân viên",
    supportedActions: [createAction, viewAction, editAction],
  },
  {
    code: "FARMING_ZONE",
    description: "Thông tin khu nuôi và hồ sơ liên quan.",
    groupLabel: "Vùng nuôi",
    label: "Khu nuôi",
    supportedActions: [createAction, viewAction, editAction],
  },
  {
    code: "RAFT",
    description: "Bè nuôi và bố trí dây nuôi trong khu được gán.",
    groupLabel: "Vùng nuôi",
    label: "Bè nuôi",
    scope: zoneScope,
    supportedActions: [createAction, viewAction, editAction, deleteAction],
  },
  {
    code: "PAYMENT_RECEIPT",
    description: "Phiếu thu và dữ liệu đối soát trong phạm vi được cấp.",
    groupLabel: "Tài chính",
    label: "Phiếu thu",
    scope: zoneScope,
    supportedActions: [
      createAction,
      viewAction,
      editAction,
      { category: "other", key: "EXPORT", label: "Xuất dữ liệu" },
    ],
  },
] as const satisfies readonly FeatureCatalogItem[];

export const mockRoles = [
  {
    activeAccountCount: 2,
    activeZoneCount: 2,
    description: "Theo dõi và điều phối hoạt động tại các khu nuôi được phân công.",
    id: "role-zone-manager",
    impactAccounts: [
      {
        accountId: "account-nguyen-an",
        displayName: "Nguyễn Văn An",
        username: "nguyen.an",
        zoneLabels: ["Khu Đông"],
      },
      {
        accountId: "account-tran-binh",
        displayName: "Trần Thị Bình",
        username: "tran.binh",
        zoneLabels: ["Khu Đông", "Khu Nam"],
      },
    ],
    name: "Quản lý vùng",
    permissions: [
      { actionKeys: ["VIEW"], dataScopeId: null, featureCode: "EMPLOYEE" },
      {
        actionKeys: ["CREATE", "VIEW", "EDIT"],
        dataScopeId: null,
        featureCode: "FARMING_ZONE",
      },
      {
        actionKeys: ["CREATE", "VIEW", "EDIT"],
        dataScopeId: "ZONE",
        featureCode: "RAFT",
      },
      { actionKeys: ["VIEW"], dataScopeId: "ZONE", featureCode: "PAYMENT_RECEIPT" },
    ],
    recordVersion: "role-v1",
    status: "in-use",
  },
  {
    activeAccountCount: 0,
    activeZoneCount: 0,
    description: "Theo dõi chứng từ và xuất dữ liệu phục vụ đối soát.",
    id: "role-accountant",
    impactAccounts: [],
    name: "Kế toán",
    permissions: [
      { actionKeys: ["VIEW"], dataScopeId: null, featureCode: "EMPLOYEE" },
      { actionKeys: ["VIEW"], dataScopeId: null, featureCode: "FARMING_ZONE" },
      { actionKeys: ["VIEW"], dataScopeId: "ZONE", featureCode: "RAFT" },
      {
        actionKeys: ["CREATE", "VIEW", "EDIT", "EXPORT"],
        dataScopeId: "ZONE",
        featureCode: "PAYMENT_RECEIPT",
      },
    ],
    recordVersion: "role-v2",
    status: "in-use",
  },
  {
    activeAccountCount: 0,
    activeZoneCount: 0,
    description: "Vai trò lưu lại để tham khảo, không còn dùng khi cấp quyền mới.",
    id: "role-observer-old",
    impactAccounts: [],
    name: "Theo dõi cũ",
    permissions: [
      { actionKeys: ["VIEW"], dataScopeId: null, featureCode: "EMPLOYEE" },
      { actionKeys: ["VIEW"], dataScopeId: null, featureCode: "FARMING_ZONE" },
      { actionKeys: ["VIEW"], dataScopeId: "OWN", featureCode: "RAFT" },
      { actionKeys: [], dataScopeId: null, featureCode: "PAYMENT_RECEIPT" },
    ],
    recordVersion: "role-v3",
    status: "discontinued",
  },
] as const satisfies readonly RoleDetails[];

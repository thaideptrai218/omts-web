import { knownRoleNameLabel } from "@/shared/presentation/actor-label";
import type { ResourceKey } from "./resources";
import type { ApiRecord } from "./workspace-repository";

/** Labels, copy and value formatting for the generic directory/catalogue resource screens. */
export const inputClass = "mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 py-2";

export const directoryPresentation = {
  customers: {
    icon: "users",
    description: "Quản lý hồ sơ khách hàng, thông tin liên hệ và tài khoản thương lái liên kết.",
  },
  zones: { icon: "zone", description: "Tìm vùng nuôi và mở hồ sơ để xem vị trí, bè và thông tin chi tiết." },
  rafts: { icon: "raft", description: "Tra cứu bè trong vùng được cấp và mở hồ sơ làn, vị trí, giấy tờ." },
  suppliers: { icon: "users", description: "Tra cứu nhà cung cấp, liên hệ và trạng thái sử dụng." },
  "input-items": { icon: "document", description: "Tra cứu vật tư, nhóm và đơn vị tính trước khi lập chứng từ." },
  accounts: { icon: "account", description: "Xem tài khoản nội bộ, tình trạng và hồ sơ liên quan." },
  roles: { icon: "roles", description: "Đối chiếu vai trò và quyền hiện hành của hệ thống." },
} as const;

export const directoryActions: Partial<Record<ResourceKey, { create: string; open: string }>> = {
  customers: { create: "Thêm khách hàng", open: "Mở khách hàng" },
  suppliers: { create: "Thêm nhà cung cấp", open: "Mở nhà cung cấp" },
  "input-items": { create: "Thêm vật tư", open: "Mở vật tư" },
};

export const itemGroupLabels: Record<string, string> = { Seed: "Giống", Material: "Vật tư", Other: "Khác" };

/** Display text for any API value: "—" when empty, Có/Không for booleans, names for arrays of objects. */
export function text(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "object")
    return Array.isArray(value)
      ? value
          .map((entry) =>
            typeof entry === "object" && entry
              ? String(entry.name ?? entry.roleName ?? entry.role ?? "")
              : String(entry),
          )
          .filter(Boolean)
          .join(", ") || "—"
      : "—";
  return String(value);
}

/** Status filter options per resource (status codes 30x accounts, 40x employees, 10x everything else). */
export function statusOptions(resource: ResourceKey): [string, string][] {
  if (resource === "accounts")
    return [
      ["301", "Hoạt động"],
      ["302", "Đã khóa"],
    ];
  if (resource === "employees")
    return [
      ["401", "Đang làm việc"],
      ["402", "Đã nghỉ việc"],
    ];
  return [
    ["101", "Đang dùng"],
    ["102", "Ngừng dùng"],
  ];
}

const statusTextLabels: Record<string, string> = {
  Active: "Hoạt động",
  Locked: "Đã khóa",
  InUse: "Đang dùng",
  "In Use": "Đang dùng",
  Discontinued: "Ngừng dùng",
};

/** Formats one list column of a row, translating status, supplier/item group and role names. */
export function resourceValueLabel(resource: ResourceKey, key: string, row: ApiRecord) {
  if (resource === "customers" && key === "hasTraderAccount" && row.hasTraderAccount === undefined)
    return row.traderAccount ? "Có" : "Không";
  if (key === "status") {
    const id = Number(row.statusId);
    if (id === 101) return "Đang dùng";
    if (id === 102) return "Ngừng dùng";
    if (id === 301) return "Hoạt động";
    if (id === 302) return "Đã khóa";
    const status = String(row.status ?? "");
    return statusTextLabels[status] ?? text(row.status);
  }
  if (key === "supplierType" || key === "group") return itemGroupLabels[String(row[key])] ?? text(row[key]);
  if (resource === "roles" && key === "name") return knownRoleNameLabel(String(row.name ?? ""));
  return text(row[key]);
}

export function resultTitleFor(resource: ResourceKey) {
  if (resource === "zones") return "Danh sách vùng nuôi";
  if (resource === "rafts") return "Danh sách bè nuôi";
  if (resource === "accounts") return "Danh sách nhân viên nội bộ";
  if (resource === "roles") return "Danh sách vai trò";
  if (resource === "customers") return "Danh sách khách hàng và thương lái";
  if (resource === "suppliers") return "Danh sách nhà cung cấp";
  return "Danh sách vật tư";
}

export function searchPlaceholderFor(resource: ResourceKey) {
  if (resource === "suppliers") return "Theo tên nhà cung cấp";
  if (resource === "input-items") return "Theo mã hoặc tên vật tư";
  if (resource === "rafts") return "Theo mã bè";
  return "Nhập từ khóa tìm kiếm";
}

/** Noun used in "N … · Trang x/y" under the list. */
export function countNounFor(resource: ResourceKey) {
  if (resource === "roles") return "vai trò";
  if (resource === "accounts") return "tài khoản";
  if (resource === "customers") return "khách hàng";
  if (resource === "suppliers") return "nhà cung cấp";
  if (resource === "input-items") return "vật tư";
  return "bản ghi";
}

import type { FunctionPermission } from "@/features/access/domain/function-permission";

/**
 * Cách nhìn của một tài khoản về menu và màn Tổng quan, suy từ MÃ QUYỀN đang giữ (không theo tên vai trò):
 * `owner` = Chủ HTX; `field` = nhân viên làm việc hiện trường (Quản lý vùng); `finance` = nhân viên làm tiền (Kế toán); `general` = còn lại.
 */
export type RoleProfile = "owner" | "field" | "finance" | "general";

const has = (permissions: readonly FunctionPermission[], code: string, actions: readonly string[]) =>
  permissions.some((item) => item.functionCode === code && actions.includes(item.action));

export function roleProfile(identity: Readonly<{ subjectType: string }>, permissions: readonly FunctionPermission[]): RoleProfile {
  if (identity.subjectType === "CooperativeOwner") return "owner";
  if (identity.subjectType !== "Staff") return "general";
  const write = ["Create", "Edit"];
  if (has(permissions, "CULTIVATION_CYCLES", write) || has(permissions, "HARVESTS", write) || has(permissions, "WATER_MEASUREMENTS", write)) return "field";
  if (has(permissions, "SUPPLIER_PAYMENTS", ["Create"]) || has(permissions, "CUSTOMER_PAYMENTS", write)) return "finance";
  return "general";
}

/** Nhóm menu được đưa lên đầu cho từng vai trò; nhóm còn lại giữ thứ tự gốc. Chủ HTX và nhân viên khác giữ nguyên. */
const FIRST_GROUPS: Readonly<Record<RoleProfile, readonly string[]>> = {
  owner: [],
  general: [],
  field: ["Nuôi trồng", "Nhân sự", "Vật tư & Giống", "Mua hàng"],
  finance: ["Mua hàng", "Kinh doanh", "Báo cáo"],
};

/** Sắp lại nhóm menu theo vai trò; chỉ đổi thứ tự, không thêm hay bớt nhóm (quyền vẫn do từng mục quyết định). */
export function orderGroups<T extends { label: string }>(groups: readonly T[], profile: RoleProfile): T[] {
  const first = FIRST_GROUPS[profile];
  const rank = (group: T) => { const at = first.indexOf(group.label); return at < 0 ? first.length : at; };
  return groups.map((group, index) => ({ group, index })).sort((a, b) => rank(a.group) - rank(b.group) || a.index - b.index).map(({ group }) => group);
}

/** Kế toán thấy Sổ quỹ đầu tiên; các vai trò khác giữ Sổ quỹ ở cuối. */
export const cashBookFirst = (profile: RoleProfile) => profile === "finance";

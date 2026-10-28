import { z } from "zod";
import { apiIdSchema } from "@/features/auth/api/auth-contract.schemas";
import { farmingZoneListItemSchema, farmingZoneViewSchema } from "@/features/farming-zones/api/farming-zone-contract.schemas";
import { employeeListItemSchema, employeeViewSchema } from "@/features/employee-management/api/employee-contract.schemas";

export const resourceKeys = ["zones", "suppliers", "input-items", "employees", "rafts", "accounts", "roles"] as const;
export type ResourceKey = typeof resourceKeys[number];
export type ResourceField = Readonly<{ key: string; label: string; type?: "text" | "number" | "textarea" | "select" | "date";
  required?: boolean; options?: readonly (readonly [string, string])[] }>;
type ResourceDefinition = Readonly<{ title: string; functionCode?: string; ownerOnly?: boolean; editable: boolean; creatable?: boolean; zoneRequired?: boolean;
  columns: readonly (readonly [string, string])[]; fields: readonly ResourceField[] }>;
export const resources: Record<ResourceKey, ResourceDefinition> = {
  zones: { title: "Vùng nuôi", editable: true,
    columns: [["code", "Mã vùng"], ["name", "Tên vùng"], ["status", "Trạng thái"], ["inUseRaftCount", "Bè đang dùng"]],
    fields: [{ key: "code", label: "Mã vùng", required: true }, { key: "name", label: "Tên vùng", required: true },
      { key: "location", label: "Vị trí" }, { key: "latitude", label: "Vĩ độ", type: "number" }, { key: "longitude", label: "Kinh độ", type: "number" },
      { key: "area", label: "Diện tích (ha)", type: "number" }, { key: "waterMeasurementPoint", label: "Điểm đo nước" }] },
  suppliers: { title: "Nhà cung cấp", functionCode: "SUPPLIERS", editable: true,
    columns: [["name", "Tên nhà cung cấp"], ["supplierType", "Loại"], ["phoneNumber", "Số điện thoại"], ["status", "Trạng thái"]],
    fields: [{ key: "name", label: "Tên nhà cung cấp", required: true }, { key: "supplierType", label: "Loại nhà cung cấp", type: "select", required: true,
      options: [["Seed", "Giống"], ["Material", "Vật tư"], ["Other", "Khác"]] },
      { key: "phoneNumber", label: "Số điện thoại", required: true }, { key: "otherContacts", label: "Liên hệ khác", type: "textarea" }] },
  "input-items": { title: "Danh mục vật tư", editable: true,
    columns: [["code", "Mã"], ["name", "Tên vật tư"], ["group", "Nhóm"], ["unit", "Đơn vị"], ["status", "Trạng thái"]],
    fields: [{ key: "code", label: "Mã vật tư", required: true }, { key: "name", label: "Tên vật tư", required: true },
      { key: "group", label: "Nhóm", type: "select", required: true, options: [["Seed", "Giống"], ["RaftMaterial", "Vật tư bè"], ["Other", "Khác"]] },
      { key: "unit", label: "Đơn vị tính", required: true }, { key: "description", label: "Mô tả", type: "textarea" }] },
  employees: { title: "Nhân viên", ownerOnly: true, editable: true,
    columns: [["fullName", "Họ tên"], ["phoneNumber", "Số điện thoại"], ["status", "Tình trạng"]],
    fields: [{ key: "fullName", label: "Họ và tên", required: true }, { key: "phoneNumber", label: "Số điện thoại" },
      { key: "birthday", label: "Ngày sinh", type: "date" }, { key: "address", label: "Địa chỉ" }, { key: "area", label: "Tỉnh/thành phố" },
      { key: "ward", label: "Phường/xã" }, { key: "otherInformation", label: "Thông tin khác", type: "textarea" }, { key: "notes", label: "Ghi chú", type: "textarea" }] },
  rafts: { title: "Bè nuôi", editable: true, zoneRequired: true,
    columns: [["code", "Mã bè"], ["status", "Trạng thái"], ["laneCount", "Số làn"]],
    fields: [{ key: "code", label: "Mã bè", required: true }, { key: "latitude", label: "Vĩ độ", type: "number", required: true },
      { key: "longitude", label: "Kinh độ", type: "number", required: true }, { key: "location", label: "Vị trí" }, { key: "size", label: "Kích thước" }, { key: "conditionNotes", label: "Tình trạng bè", type: "textarea" }] },
  accounts: { title: "Tài khoản", ownerOnly: true, editable: true, creatable: false,
    columns: [["username", "Tên đăng nhập"], ["displayName", "Tên hiển thị"], ["phoneNumber", "Số điện thoại"], ["status", "Trạng thái"]],
    fields: [{ key: "displayName", label: "Tên hiển thị", required: true }, { key: "username", label: "Tên đăng nhập", required: true },
      { key: "phoneNumber", label: "Số điện thoại", required: true }, { key: "email", label: "Email" }] },
  roles: { title: "Vai trò và quyền", ownerOnly: true, editable: false,
    columns: [["name", "Tên vai trò"], ["status", "Trạng thái"]], fields: [] },
};

const text = z.string();
const nullableText = text.nullable();
const usage = { statusId: z.number().int(), status: text };
const version = { rowVersion: text.min(1) };
const supplierRow = z.object({ id: apiIdSchema, name: text, supplierType: text, phoneNumber: text, ...usage });
const itemRow = z.object({ id: apiIdSchema, code: text, name: text, group: text, unit: text, ...usage });
const raftRow = z.object({ id: apiIdSchema, code: text, ...usage, laneCount: z.number().int().optional(), latitude: z.number().nullable().optional(), longitude: z.number().nullable().optional() });
const roleRow = z.object({ id: apiIdSchema, name: text, status: text });
const accountRow = z.object({ id: apiIdSchema, username: text, displayName: text, phoneNumber: nullableText, email: nullableText, status: text,
  subjectType: text.optional(), mustChangePassword: z.boolean().optional(), ...version });
const listSchemas = { zones: farmingZoneListItemSchema, suppliers: supplierRow, "input-items": itemRow,
  employees: employeeListItemSchema, rafts: raftRow, accounts: accountRow, roles: roleRow };
const detailSchemas = {
  zones: farmingZoneViewSchema,
  suppliers: supplierRow.extend({ otherContacts: nullableText, debt: z.number(), ...version }),
  "input-items": itemRow.extend({ description: nullableText, isUsed: z.boolean(), ...version }),
  employees: employeeViewSchema,
  rafts: raftRow.extend({ location: nullableText, size: nullableText, conditionNotes: nullableText,
    lanes: z.array(z.object({ laneNumber: z.number().int(), length: z.number().nullable(), markerA: nullableText, markerB: nullableText })),
    layoutDrawing: z.json().nullable(), ...version }),
  accounts: accountRow,
  roles: roleRow.extend({ permissions: z.array(z.object({ functionCode: text, actions: z.array(text), dataScope: text })), ...version }),
};
export function projectResource(resource: ResourceKey, data: unknown, detail: boolean,
  query?: { page: number; pageSize: number; search?: string }): unknown | undefined {
  if (detail) {
    const value = resource === "employees" && data && typeof data === "object" && "employee" in data ? data.employee : data;
    const parsed = detailSchemas[resource].safeParse(value);
    return parsed.success ? parsed.data : undefined;
  }
  const rowSchema = listSchemas[resource];
  const page = z.object({ items: z.array(rowSchema), page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative() }).safeParse(data);
  if (page.success) return page.data;
  const rows = z.array(rowSchema).safeParse(data);
  if (!rows.success) return undefined;
  // These endpoints return the full filtered array. Apply local search before
  // paging so a match on a later page is still discoverable.
  const term = query?.search?.trim().toLocaleLowerCase("vi");
  const filtered = term && (resource === "roles" || resource === "rafts")
    ? rows.data.filter((row) => resources[resource].columns.some(([key]) => {
      const value = (row as Record<string, unknown>)[key];
      return typeof value === "string" && value.toLocaleLowerCase("vi").includes(term);
    })) : rows.data;
  if (!query) return { items: filtered, page: 1, pageSize: filtered.length, total: filtered.length };
  const pageNumber = Math.min(query.page, Math.max(1, Math.ceil(filtered.length / query.pageSize)));
  return { items: filtered.slice((pageNumber - 1) * query.pageSize, pageNumber * query.pageSize),
    page: pageNumber, pageSize: query.pageSize, total: filtered.length };
}

export function resourceAllowed(resource: ResourceKey, identity: { subjectType: string }, functions: readonly { functionCode: string; action: string }[], action = "View") {
  if (identity.subjectType === "CooperativeOwner") return true;
  const definition = resources[resource];
  if (definition.ownerOnly || identity.subjectType !== "Staff") return false;
  if (resource === "input-items") return action === "View" && functions.some((entry) =>
    ["PURCHASE_RECEIPTS", "SUPPLIER_PAYMENTS", "CULTIVATION_CYCLES"].includes(entry.functionCode) && entry.action === "View");
  if (definition.functionCode) return functions.some((entry) => entry.functionCode === definition.functionCode && entry.action === action);
  return action === "View";
}

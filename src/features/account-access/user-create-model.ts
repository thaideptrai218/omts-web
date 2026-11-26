import { validVietnamesePhone, vietnamesePhoneMessage } from "@/components/form/phone-input-rules";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { createUserRequestSchema, type CreateUserGrant } from "./account-credential-contract";
import { ACCOUNTANT_ROLE, ZONE_MANAGER_ROLE } from "./user-account-model";
import type { UserZone } from "./use-user-accounts";

/** One "Phân quyền" row of the create form: a role and, for Quản lý vùng, the zones it covers. The Accountant is always the whole cooperative. */
export type GrantRow = { key: number; role: "" | typeof ZONE_MANAGER_ROLE | typeof ACCOUNTANT_ROLE; allZones: boolean; zoneIds: string[] };
export const newGrantRow = (key: number, role: GrantRow["role"] = ""): GrantRow => ({ key, role, allZones: false, zoneIds: [] });
const isBlank = (row: GrantRow) => !row.role && !row.allZones && !row.zoneIds.length;

/** Zones another row already holds are not offered again: a zone appears once. */
export const zonesTakenByOthers = (rows: readonly GrantRow[], key: number): Set<string> =>
  new Set(rows.filter((row) => row.key !== key && row.role === ZONE_MANAGER_ROLE).flatMap((row) => row.zoneIds));
/** True when another Quản lý vùng row already covers all zones, so a second row for any zone would repeat it. */
export const allZonesTakenByOthers = (rows: readonly GrantRow[], key: number) => rows.some((row) => row.key !== key && row.role === ZONE_MANAGER_ROLE && row.allZones);

/** The first problem in the grant rows, in the Owner's words; blank rows are ignored. */
export function grantRowsError(rows: readonly GrantRow[], zones: readonly UserZone[]): string | undefined {
  const used = rows.filter((row) => !isBlank(row));
  const name = (id: string) => zones.find((zone) => zone.id === id)?.name ?? "Vùng đã chọn";
  if (used.some((row) => !row.role)) return "Chọn vai trò cho dòng phân quyền, hoặc bỏ dòng đó.";
  const managers = used.filter((row) => row.role === ZONE_MANAGER_ROLE);
  if (managers.some((row) => !row.allZones && !row.zoneIds.length)) return "Chọn ít nhất một vùng cho Quản lý vùng, hoặc chọn Tất cả vùng.";
  if (managers.length > 1 && managers.some((row) => row.allZones)) return "Đã chọn Quản lý vùng cho tất cả vùng thì không thêm dòng Quản lý vùng khác.";
  const seen = new Set<string>();
  for (const id of managers.flatMap((row) => row.zoneIds)) {
    if (seen.has(id)) return `Vùng ${name(id)} chỉ được có một vai trò.`;
    seen.add(id);
  }
  if (used.filter((row) => row.role === ACCOUNTANT_ROLE).length > 1) return "Kế toán chỉ cần chọn một lần.";
  return undefined;
}

/** Rows to the grants the backend takes; the Accountant never carries a zone, "all zones" replaces any single zones. */
export function rowsToGrants(rows: readonly GrantRow[]): CreateUserGrant[] {
  const grants: CreateUserGrant[] = [];
  for (const row of rows) {
    if (row.role === ACCOUNTANT_ROLE) grants.push({ zoneId: null, role: ACCOUNTANT_ROLE });
    else if (row.role === ZONE_MANAGER_ROLE) {
      if (row.allZones) grants.push({ zoneId: null, role: ZONE_MANAGER_ROLE });
      else for (const zoneId of new Set(row.zoneIds)) grants.push({ zoneId, role: ZONE_MANAGER_ROLE });
    }
  }
  return grants;
}

export type CreateAccountValues = { displayName: string; username: string; phoneNumber: string; email: string; note: string; employeeId: string | null };
export type CreateAccountField = "displayName" | "username" | "phoneNumber" | "email" | "note" | "grants";

/** The first problem of the form (with the field to focus), or the validated request body. Same username rule as the backend. */
export function checkCreateAccount(values: CreateAccountValues, rows: readonly GrantRow[], zones: readonly UserZone[]):
  { ok: true; body: ReturnType<typeof createUserRequestSchema.parse> } | { ok: false; field: CreateAccountField; message: string } {
  if (!values.displayName.trim()) return { ok: false, field: "displayName", message: "Nhập tên hiển thị." };
  if (!validVietnamesePhone(values.phoneNumber)) return { ok: false, field: "phoneNumber", message: vietnamesePhoneMessage };
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(values.email.trim())) return { ok: false, field: "email", message: "Email chưa đúng. Ví dụ: ten@example.com." };
  if (values.note.trim().length > 500) return { ok: false, field: "note", message: "Ghi chú tối đa 500 ký tự." };
  const problem = grantRowsError(rows, zones);
  const parsed = createUserRequestSchema.safeParse({
    displayName: values.displayName, username: values.username, phoneNumber: values.phoneNumber, email: values.email.trim() || null,
    employeeId: values.employeeId, grants: rowsToGrants(rows), note: values.note.trim() || null,
  });
  if (!parsed.success) return { ok: false, field: "username", message: parsed.error.issues.find((issue) => issue.path[0] === "username")?.message ?? "Kiểm tra lại thông tin đã nhập." };
  return problem ? { ok: false, field: "grants", message: problem } : { ok: true, body: parsed.data };
}

/** Plain Vietnamese for a refused create; only trusted codes are mapped, backend text may contain what was typed. */
export function createAccountError(result: Exclude<WorkspaceResult<unknown>, { status: "success" }>): string {
  if (result.uncertain) return "Chưa biết tài khoản đã được tạo chưa. Hãy đóng hộp này và xem lại danh sách trước khi tạo lại.";
  if (result.httpStatus === 403 || result.code === "MSG-GEN-08") return "Chỉ chủ hợp tác xã được tạo tài khoản.";
  if (result.httpStatus === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (["MSG-ACCOUNT-09", "MSG03", "MSG-GEN-02"].includes(result.code ?? "")) return "Tên đăng nhập, số điện thoại hoặc email này đã có người dùng. Hãy kiểm tra lại.";
  if (["MSG-GEN-09", "MSG06", "MSG-GEN-06", "MSG24"].includes(result.code ?? "")) return "Nhân viên này đã có tài khoản hoặc đã nghỉ việc. Hãy đóng hộp này và tải lại danh sách.";
  if (["MSG-GEN-01", "MSG01"].includes(result.code ?? "")) return "Thông tin chưa hợp lệ. Hãy kiểm tra tên đăng nhập, số điện thoại, email và vùng đã chọn.";
  return "Chưa tạo được tài khoản. Hãy kiểm tra lại thông tin và kết nối.";
}

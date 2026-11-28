import { emptyGrantSelection, selectionError, type GrantSelection } from "@/features/account-access/user-grant-selection";
import { emptyAddress, type AddressValue } from "@/features/address-invoice/model";
import type { Employee } from "./contracts";
import { issueEmployeeAccountRequestSchema } from "./employee-account-contract";
import { buildEmployeeSaveBody, employeeApiEditorSchema, localFieldLabels, valuesOf, type EmployeeFormValues } from "./employee-editor-model";

/** Value of the account choice that opens the fields of a new login account (the last item of the account list). */
export const NEW_ACCOUNT = "__new";
export type EmployeeFormIssue = { path: string; message: string };

/**
 * Everything the "Thêm mới / Cập nhật nhân viên" form edits. The address is kept as the units picked from the administrative list;
 * `area`, `wardCommune` and `address` of the profile values are filled from it when the form is read.
 * `accountChoice`: "" none, an account id (link it), or `NEW_ACCOUNT` (create one from `username` and `grants`).
 */
export type EmployeeFormState = Omit<EmployeeFormValues, "area" | "wardCommune" | "address"> & { address: AddressValue; accountChoice: string; username: string; grants: GrantSelection };

/** The address of a profile as the picker holds it: `area` is the province name, `ward` the ward name, `address` the street. */
export const addressOfEmployee = (record: Employee | null): AddressValue => record
  ? { provinceCode: record.provinceCode ?? null, provinceName: record.area ?? "", wardCode: record.wardCode ?? null, wardName: record.ward ?? "", street: record.address ?? "" }
  : emptyAddress;

export function formStateOf(record: Employee | null): EmployeeFormState {
  // The picked address replaces the three free-text values of the profile.
  const rest: Partial<EmployeeFormValues> = valuesOf(record);
  delete rest.area; delete rest.wardCommune; delete rest.address;
  return { ...(rest as Omit<EmployeeFormValues, "area" | "wardCommune" | "address">), address: addressOfEmployee(record), accountChoice: "", username: "", grants: emptyGrantSelection };
}

/** Order of the fields on the form: the first invalid one is focused. */
const fieldOrder = ["fullName", "code", "phone", "employeeType", "employeeTypeFrom", "workingZoneIds", "startDate", "accountChoice", "username", "grants", "bankAccount", "idNumber", "birthday", "gender", "address", "otherInformation", "notes"];
const rank = (path: string) => { const index = fieldOrder.findIndex(key => path === key || path.startsWith(`${key}.`)); return index < 0 ? fieldOrder.length : index; };

/** Which folded card holds the field, so a card with an error can be opened. */
export type EmployeeFormCard = "work" | "bank" | "personal";
export function cardOfField(path: string): EmployeeFormCard | undefined {
  if (["startDate", "accountChoice", "username", "grants", "notes"].includes(path)) return "work";
  if (path.startsWith("bankAccount")) return "bank";
  if (["idNumber", "birthday", "gender", "address", "area", "wardCommune", "otherInformation"].includes(path)) return "personal";
  return undefined;
}

export type EmployeeFormContext = {
  /** The saved profile; null when a new one is being made. */
  baseline: Employee | null;
  /** Zones the catalogue still offers (In Use); a selected zone outside this is refused. */
  activeZoneIds: ReadonlySet<string>;
  /** Whether the account choice is part of this save (the Owner, and a profile that can still take an account). */
  accountOffered: boolean;
};

export type ParsedEmployeeForm =
  | { ok: false; issues: EmployeeFormIssue[] }
  | { ok: true; body: ReturnType<typeof buildEmployeeSaveBody> & { provinceCode: number | null; wardCode: number | null }; newAccount?: { username: string }; linkAccountId?: string };

/**
 * Checks the whole form, folded cards included, and builds the save body. A profile that has left keeps only the fields the backend still
 * applies (phone, address, notes, bank), so its locked fields are not judged again. A phone number is required while the person works.
 */
export function parseEmployeeForm(state: EmployeeFormState, { baseline, activeZoneIds, accountOffered }: EmployeeFormContext): ParsedEmployeeForm {
  const left = baseline?.status === "Left";
  const values: EmployeeFormValues = { ...state, area: state.address.provinceName, wardCommune: state.address.wardName, address: state.address.street };
  const checked = employeeApiEditorSchema.safeParse(values);
  const issues: EmployeeFormIssue[] = checked.success ? [] : checked.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message }));
  const add = (path: string, message: string) => { if (!issues.some(issue => issue.path === path)) issues.push({ path, message }); };
  if (!left && !state.phone.trim()) add("phone", "Nhập số điện thoại.");
  if (!left) {
    if (!state.employeeType) add("employeeType", "Chọn loại nhân viên.");
    // A changed type applies from a date; the backend keeps the history of types.
    if (baseline && state.employeeType && state.employeeType !== baseline.employeeType && !state.employeeTypeFrom) add("employeeTypeFrom", "Chọn ngày áp dụng loại nhân viên.");
    if (state.employeeType === "Staff") {
      if (!state.workingZoneIds.length) add("workingZoneIds", "Chọn ít nhất một vùng làm việc.");
      else if (state.workingZoneIds.some(id => !activeZoneIds.has(id))) add("workingZoneIds", "Bỏ chọn vùng đã ngừng hoặc chưa có trong danh mục trước khi lưu.");
    }
  }
  // A blank code on PUT means "unchanged", so an existing profile keeps a visible code.
  if (baseline && !state.code.trim()) add("code", "Nhập mã nhân viên.");
  const creating = accountOffered && state.accountChoice === NEW_ACCOUNT;
  if (creating) {
    const username = issueEmployeeAccountRequestSchema.safeParse({ username: state.username });
    if (!state.username.trim()) add("username", "Nhập tên đăng nhập.");
    else if (!username.success) add("username", username.error.issues[0].message);
    // The backend copies the phone number of the profile to the account.
    if (!state.phone.trim()) add("phone", "Nhập số điện thoại để tạo tài khoản đăng nhập.");
    const missingZone = state.employeeType === "SeasonalWorker" ? undefined : selectionError(state.grants);
    if (missingZone) add("grants", missingZone);
  }
  issues.sort((a, b) => rank(a.path) - rank(b.path));
  if (issues.length || !checked.success) return { ok: false, issues };
  return {
    ok: true,
    body: { ...buildEmployeeSaveBody(checked.data, baseline), provinceCode: state.address.provinceCode, wardCode: state.address.wardCode },
    ...(creating ? { newAccount: { username: state.username.trim() } } : {}),
    ...(accountOffered && state.accountChoice && state.accountChoice !== NEW_ACCOUNT ? { linkAccountId: state.accountChoice } : {}),
  };
}

export const formFieldLabel = (path: string) => localFieldLabels[path] ?? ({ username: "Tên đăng nhập", accountChoice: "Tài khoản đăng nhập", grants: "Vai trò" } as Record<string, string>)[path] ?? path;

/** What the backend still applies to an employee who has left (phone, address, notes, other information, bank); the rest of the form is shown but fixed. */
export const LEFT_EDIT_HINT = "Nhân viên đã nghỉ việc: chỉ sửa được số điện thoại, địa chỉ, ghi chú và ngân hàng.";

import { vietnamesePhoneMessage, validVietnamesePhone } from "@/components/form/phone-input-rules";
import { issueEmployeeAccountRequestSchema } from "@/features/employee-api/employee-account-contract";
import { selectionError, type GrantSelection } from "./user-grant-selection";

export type CreateUserValues = { displayName: string; username: string; phoneNumber: string; email: string; employeeId: string };
/** The fields of "Tạo người dùng" that can be wrong; `grants` is the role and zone choice. */
export type CreateUserField = "displayName" | "username" | "phoneNumber" | "email" | "grants";
export type CreateUserErrors = Partial<Record<CreateUserField, string>>;

/** Same wording as the shared required-field messages ("Vui lòng nhập …"), so a field reads the same on every form. */
const required = (name: string) => `Vui lòng nhập ${name}.`;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

/** Checks every field at once so each invalid one can be marked in place (not just the first one at the bottom of the form). */
export function validateCreateUser(values: CreateUserValues, selection: GrantSelection): CreateUserErrors {
  const errors: CreateUserErrors = {};
  if (!values.displayName.trim()) errors.displayName = required("tên hiển thị");
  if (!values.username.trim()) errors.username = required("tên đăng nhập");
  else {
    const parsed = issueEmployeeAccountRequestSchema.shape.username.safeParse(values.username);
    if (!parsed.success) errors.username = parsed.error.issues[0]?.message ?? "Tên đăng nhập chưa hợp lệ.";
  }
  if (!values.phoneNumber.trim()) errors.phoneNumber = required("số điện thoại");
  else if (!validVietnamesePhone(values.phoneNumber)) errors.phoneNumber = vietnamesePhoneMessage;
  if (values.email.trim() && !emailPattern.test(values.email.trim())) errors.email = "Email chưa đúng định dạng.";
  const zoneProblem = selectionError(selection);
  if (zoneProblem) errors.grants = zoneProblem;
  return errors;
}

/** The first invalid field in form order, to move focus to it. */
export const firstInvalidField = (errors: CreateUserErrors): CreateUserField | undefined =>
  (["displayName", "username", "phoneNumber", "email", "grants"] as const).find((field) => errors[field]);

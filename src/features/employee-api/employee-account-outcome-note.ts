import type { Employee } from "./contracts";

/**
 * What to tell after saving a thời vụ person: the login made for them (they use the cooperative's default password and change it at first sign-in; the password is never shown),
 * or that the profile was saved without one because the phone or username belongs to another account. Empty when the save did nothing about accounts.
 */
export function accountOutcomeNote(employee: Pick<Employee, "account" | "accountOutcome">): string {
  const outcome = employee.accountOutcome;
  if (!outcome) return "";
  if (outcome.accountNote) return " Cảnh báo: hồ sơ đã lưu nhưng chưa tạo được tài khoản, vì số điện thoại hoặc tên đăng nhập đã có tài khoản khác.";
  if (outcome.fixedPassword && employee.account) return ` Đã tạo tài khoản ${employee.account.username}. Họ dùng mật khẩu mặc định của hợp tác xã và phải đổi ở lần đăng nhập đầu.`;
  return "";
}

import type {
  ApplicationAccessGranted,
  LoginResult,
} from "@/features/auth/domain/auth-types";

export function grantsApplicationAccess(
  result: LoginResult,
): result is ApplicationAccessGranted {
  return result.status === "access-granted";
}

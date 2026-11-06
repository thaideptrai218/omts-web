import type {
  ApplicationAccessGranted,
  LoginResult,
  PostLoginGate,
} from "@/features/auth/domain/auth-types";

export function grantsApplicationAccess(
  result: LoginResult,
): result is ApplicationAccessGranted {
  return result.status === "access-granted";
}

export function requiresPostLoginGate(
  result: LoginResult,
): result is PostLoginGate {
  return (
    result.status === "staff-onboarding-required" ||
    result.status === "phone-verification-required"
  );
}

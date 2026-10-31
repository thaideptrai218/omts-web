export const recoverySteps = [
  { id: "identifier", label: "Thông tin" },
  { id: "verification", label: "Xác minh" },
  { id: "new-password", label: "Mật khẩu mới" },
] as const;

export type RecoveryStep = (typeof recoverySteps)[number]["id"];

export function getRecoveryStepIndex(step: RecoveryStep): number {
  return recoverySteps.findIndex((item) => item.id === step);
}

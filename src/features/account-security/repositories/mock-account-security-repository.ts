import type {
  CurrentPasswordChangeInput,
  CurrentPasswordChangeResult,
} from "@/features/account-security/domain/change-password";
import type { AccountSecurityRepository } from "@/features/account-security/repositories/account-security-repository";
import { satisfiesPasswordPolicy } from "@/shared/security/password-policy";

type MockSessionState = "active" | "expired";

type MockAccountSecurityOptions = Readonly<{
  initialPassword?: string;
  latencyMs?: number;
  sessionState?: () => MockSessionState;
}>;

const defaultPassword = "temporary1";

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createMockAccountSecurityRepository({
  initialPassword = defaultPassword,
  latencyMs = 450,
  sessionState = () => "active",
}: MockAccountSecurityOptions = {}): AccountSecurityRepository {
  let currentPassword = initialPassword;

  return {
    async changeWithCurrentPassword(
      input: CurrentPasswordChangeInput,
    ): Promise<CurrentPasswordChangeResult> {
      if (latencyMs > 0) await wait(latencyMs);

      if (sessionState() === "expired") {
        return {
          message: { code: "MSG19" },
          reason: "session-expired",
          status: "rejected",
        };
      }

      if (input.currentPassword !== currentPassword) {
        return {
          message: { code: "MSG17" },
          reason: "invalid-current-password",
          status: "rejected",
        };
      }

      if (!satisfiesPasswordPolicy(input.newPassword)) {
        return {
          message: { code: "MSG01" },
          reason: "invalid-new-password",
          status: "rejected",
        };
      }

      currentPassword = input.newPassword;

      return {
        message: { code: "MSG18" },
        status: "changed",
      };
    },
  };
}

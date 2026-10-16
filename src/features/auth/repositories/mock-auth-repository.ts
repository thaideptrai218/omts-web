import type {
  AuthSession,
  LoginInput,
  LoginResult,
} from "@/features/auth/domain/auth-types";
import type { AuthRepository } from "@/features/auth/repositories/auth-repository";

type MockAuthOptions = Readonly<{
  latencyMs?: number;
}>;

const demoPassword = "demo123";

const demoSession = {
  account: {
    access: {
      permissions: [
        {
          key: "workspace.overview.view",
          scope: { kind: "all-zones" },
        },
      ],
    },
    accountId: "account-owner-demo",
    displayName: "Chủ HTX Trung Nam",
    username: "owner",
  },
  status: "authenticated",
} as const;

const accessGrantedResult = {
  session: demoSession,
  status: "access-granted",
} as const satisfies LoginResult;

const loginResultsByIdentifier: ReadonlyMap<string, LoginResult> =
  new Map<string, LoginResult>([
    ["0900000000", accessGrantedResult],
    [
      "account-blocked",
      { message: { code: "MSG13" }, status: "rejected" },
    ],
    ["owner@omts.test", accessGrantedResult],
    ["owner", accessGrantedResult],
    ["staff-first-login", { status: "password-change-required" }],
    [
      "temp-password-expired",
      { message: { code: "MSG68" }, status: "rejected" },
    ],
    [
      "temporarily-locked",
      { message: { code: "MSG69" }, status: "rejected" },
    ],
    [
      "trader-needs-phone",
      {
        message: { code: "MSG67" },
        status: "phone-verification-required",
      },
    ],
  ]);

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createMockAuthRepository({
  latencyMs = 450,
}: MockAuthOptions = {}): AuthRepository {
  let currentSession: AuthSession = { status: "anonymous" };

  async function simulateLatency() {
    if (latencyMs > 0) await wait(latencyMs);
  }

  return {
    async getSession() {
      await simulateLatency();
      return currentSession;
    },

    async login(input: LoginInput): Promise<LoginResult> {
      await simulateLatency();

      if (input.password !== demoPassword) {
        return {
          message: { code: "MSG12" },
          status: "rejected",
        };
      }

      const result = loginResultsByIdentifier.get(input.identifier);

      if (!result) {
        return {
          message: { code: "MSG12" },
          status: "rejected",
        };
      }

      if (result.status === "access-granted") {
        currentSession = result.session;
      }

      return result;
    },

    async logout() {
      await simulateLatency();
      currentSession = { status: "anonymous" };
    },
  };
}

export const mockAuthRepository = createMockAuthRepository();

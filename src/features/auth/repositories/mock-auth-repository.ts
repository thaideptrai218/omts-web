import type {
  AuthSession,
  LoginInput,
  LoginResult,
} from "@/features/auth/domain/auth-types";
import type { AuthRepository } from "@/features/auth/repositories/auth-repository";

const mockDelayMs = 450;

const demoAccount = {
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
} as const;

const demoCredentials = {
  identifier: "owner",
  password: "demo123",
} as const;

let currentSession: AuthSession = { status: "anonymous" };

function waitForMockResponse(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, mockDelayMs);
  });
}

export const mockAuthRepository: AuthRepository = {
  async getSession() {
    await waitForMockResponse();
    return currentSession;
  },

  async login(input: LoginInput): Promise<LoginResult> {
    await waitForMockResponse();

    const isValid =
      input.identifier === demoCredentials.identifier &&
      input.password === demoCredentials.password;

    if (!isValid) {
      return {
        message: { code: "MSG12" },
        status: "rejected",
      };
    }

    currentSession = {
      account: demoAccount,
      status: "authenticated",
    };

    return {
      session: currentSession,
      status: "authenticated",
    };
  },

  async logout() {
    await waitForMockResponse();
    currentSession = { status: "anonymous" };
  },
};

import type {
  AuthSession,
  LoginInput,
  LoginResult,
} from "@/features/auth/domain/auth-types";
import type { AuthRepository } from "@/features/auth/repositories/auth-repository";

export type AuthService = Readonly<{
  getSession(): Promise<AuthSession>;
  login(input: LoginInput): Promise<LoginResult>;
  logout(): Promise<void>;
}>;

export function createAuthService(repository: AuthRepository): AuthService {
  return {
    getSession: () => repository.getSession(),
    login: (input) =>
      repository.login({
        identifier: input.identifier.trim(),
        password: input.password,
      }),
    logout: () => repository.logout(),
  };
}

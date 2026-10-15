import type {
  AuthSession,
  LoginInput,
  LoginResult,
} from "@/features/auth/domain/auth-types";

export interface AuthRepository {
  getSession(): Promise<AuthSession>;
  login(input: LoginInput): Promise<LoginResult>;
  logout(): Promise<void>;
}

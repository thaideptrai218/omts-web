import { mockAuthRepository } from "@/features/auth/repositories/mock-auth-repository";
import { createAuthService } from "@/features/auth/services/auth-service";

export const authService = createAuthService(mockAuthRepository);

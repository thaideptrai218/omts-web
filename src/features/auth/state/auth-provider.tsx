"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "@/components/ui/toast-provider";
import type {
  AuthSession,
  CompleteStaffOnboardingInput,
  CompleteStaffOnboardingResult,
  LoginInput,
  LoginResult,
  OnboardingContactChannel,
  StartStaffContactVerificationResult,
} from "@/features/auth/domain/auth-types";
import type {
  CurrentPasswordChangeInput,
  CurrentPasswordChangeResult,
} from "@/features/account-security/domain/change-password";
import { grantsApplicationAccess } from "@/features/auth/domain/login-result";
import { authService } from "@/features/auth/services/auth-service.instance";
import { createLatestOperationTracker } from "@/features/auth/state/latest-operation";
import { performLocalFirstLogout } from "@/features/auth/state/local-first-logout";
import { protectedCacheRegistry } from "@/features/auth/state/protected-cache-registry";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type LoadingSession = Readonly<{ status: "loading" }>;

export type AuthState = AuthSession | LoadingSession;

type AuthContextValue = Readonly<{
  changeTemporaryPassword(
    input: CurrentPasswordChangeInput,
  ): Promise<CurrentPasswordChangeResult>;
  completeStaffOnboarding(
    input: CompleteStaffOnboardingInput,
  ): Promise<CompleteStaffOnboardingResult>;
  login(input: LoginInput): Promise<LoginResult>;
  logout(): Promise<void>;
  state: AuthState;
  startStaffContactVerification(
    channel: OnboardingContactChannel,
  ): Promise<StartStaffContactVerificationResult>;
  updateDisplayName(displayName: string): void;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const sessionStatus = useRef<AuthState["status"]>("loading");
  const operationTracker = useRef(createLatestOperationTracker());
  const { notify } = useToast();

  const replaceState = useCallback((nextState: AuthState) => {
    sessionStatus.current = nextState.status;
    setState(nextState);
  }, []);

  useEffect(() => {
    let isActive = true;
    const operation = operationTracker.current.start();

    authService
      .getSession()
      .then((session) => {
        if (isActive) operation.commit(() => replaceState(session));
      })
      .catch(() => {
        if (isActive) {
          operation.commit(() => replaceState({ status: "anonymous" }));
        }
      });

    return () => {
      isActive = false;
    };
  }, [replaceState]);

  useEffect(
    () =>
      sessionExpiryChannel.subscribe((message) => {
        if (sessionStatus.current !== "authenticated") return;

        const operation = operationTracker.current.start();
        operation.commit(() => replaceState({ status: "anonymous" }));
        protectedCacheRegistry.clearAll();
        notify({
          title: formatMessage(message),
          tone: "danger",
        });
      }),
    [notify, replaceState],
  );

  const login = useCallback(async (input: LoginInput) => {
    const operation = operationTracker.current.start();

    try {
      const result = await authService.login(input);

      operation.commit(() => {
        if (grantsApplicationAccess(result)) {
          replaceState(result.session);
          return;
        }

        if (sessionStatus.current === "loading") {
          replaceState({ status: "anonymous" });
        }
      });

      return result;
    } catch (error) {
      operation.commit(() => {
        if (sessionStatus.current === "loading") {
          replaceState({ status: "anonymous" });
        }
      });
      throw error;
    }
  }, [replaceState]);

  const changeTemporaryPassword = useCallback(
    (input: CurrentPasswordChangeInput) =>
      authService.changeTemporaryPassword(input),
    [],
  );

  const completeStaffOnboarding = useCallback(
    async (input: CompleteStaffOnboardingInput) => {
      const result = await authService.completeStaffOnboarding(input);
      if (grantsApplicationAccess(result)) replaceState(result.session);
      return result;
    },
    [replaceState],
  );

  const startStaffContactVerification = useCallback(
    (channel: OnboardingContactChannel) =>
      authService.startStaffContactVerification(channel),
    [],
  );

  const logout = useCallback(async () => {
    const operation = operationTracker.current.start();

    await performLocalFirstLogout(
      () => {
        operation.commit(() => replaceState({ status: "anonymous" }));
      },
      () => {
        protectedCacheRegistry.clearAll();
      },
      () => authService.logout(),
    );
  }, [replaceState]);

  const updateDisplayName = useCallback((displayName: string) => {
    setState((current) => {
      if (current.status !== "authenticated") return current;

      return {
        ...current,
        account: { ...current.account, displayName },
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      changeTemporaryPassword,
      completeStaffOnboarding,
      login,
      logout,
      state,
      startStaffContactVerification,
      updateDisplayName,
    }),
    [
      changeTemporaryPassword,
      completeStaffOnboarding,
      login,
      logout,
      startStaffContactVerification,
      state,
      updateDisplayName,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

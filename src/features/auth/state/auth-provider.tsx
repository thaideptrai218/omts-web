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
  LoginInput,
  LoginResult,
} from "@/features/auth/domain/auth-types";
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
  login(input: LoginInput): Promise<LoginResult>;
  logout(): Promise<void>;
  state: AuthState;
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

  const value = useMemo(
    () => ({ login, logout, state }),
    [login, logout, state],
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

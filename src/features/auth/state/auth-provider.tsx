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
import type {
  AuthSession,
  LoginInput,
  LoginResult,
} from "@/features/auth/domain/auth-types";
import { grantsApplicationAccess } from "@/features/auth/domain/login-result";
import { authService } from "@/features/auth/services/auth-service.instance";
import { createLatestOperationTracker } from "@/features/auth/state/latest-operation";

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
  const operationTracker = useRef(createLatestOperationTracker());

  useEffect(() => {
    let isActive = true;
    const operation = operationTracker.current.start();

    authService
      .getSession()
      .then((session) => {
        if (isActive) operation.commit(() => setState(session));
      })
      .catch(() => {
        if (isActive) {
          operation.commit(() => setState({ status: "anonymous" }));
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const operation = operationTracker.current.start();

    try {
      const result = await authService.login(input);

      operation.commit(() => {
        if (grantsApplicationAccess(result)) {
          setState(result.session);
          return;
        }

        setState((currentState) =>
          currentState.status === "loading"
            ? { status: "anonymous" }
            : currentState,
        );
      });

      return result;
    } catch (error) {
      operation.commit(() => {
        setState((currentState) =>
          currentState.status === "loading"
            ? { status: "anonymous" }
            : currentState,
        );
      });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const operation = operationTracker.current.start();

    await authService.logout();
    operation.commit(() => setState({ status: "anonymous" }));
  }, []);

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

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/state/auth-provider";

function getInitials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toLocaleUpperCase("vi"))
    .join("");
}

export function AppSessionShell({ children }: { children: ReactNode }) {
  const { logout, state } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (state.status === "anonymous" && !isLoggingOut) {
      router.replace("/login");
    }
  }, [isLoggingOut, router, state.status]);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    router.replace("/login");
    try {
      await logout();
    } catch {
      // Local auth state is already cleared. Offline/server retry is handled
      // only after its contract is confirmed.
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (state.status !== "authenticated") {
    return (
      <main
        className="grid min-h-dvh place-items-center bg-canvas px-4 text-center"
        role="status"
      >
        <p className="text-sm font-medium text-text-muted">
          {state.status === "loading"
            ? "Đang kiểm tra phiên đăng nhập..."
            : "Đang chuyển về trang đăng nhập..."}
        </p>
      </main>
    );
  }

  const account = state.account;

  return (
    <AppShell
      access={account.access}
      accountInitials={getInitials(account.displayName)}
      accountLabel={account.displayName}
      accountRole={account.primaryRoleLabel}
      accountScope={account.scopeLabel}
      isLoggingOut={isLoggingOut}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}

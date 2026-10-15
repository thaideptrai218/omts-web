"use client";

import type { ReactNode } from "react";
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
  const { state } = useAuth();
  const account = state.status === "authenticated" ? state.account : undefined;

  return (
    <AppShell
      access={account?.access}
      accountInitials={account ? getInitials(account.displayName) : "HT"}
      accountLabel={account?.displayName ?? "Chưa đăng nhập"}
    >
      {children}
    </AppShell>
  );
}

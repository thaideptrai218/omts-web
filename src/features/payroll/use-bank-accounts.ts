"use client";
import { useCallback } from "react";
import { listAccounts } from "@/features/cash-book/repository";
import { useRemote } from "@/features/operations/ui";

/** Active bank accounts of the cooperative (Sổ quỹ, `GET /api/cash-accounts?kind=Bank`) for the "Tài khoản chi" of a bank transfer; empty until loaded, when it fails, or when not asked. */
export function useBankAccounts(enabled: boolean) {
  const remote = useRemote(useCallback((signal: AbortSignal) => enabled ? listAccounts("Bank", false, signal) : Promise.resolve({ status: "success" as const, data: [] }), [enabled]));
  return remote.data ?? [];
}
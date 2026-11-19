"use client";
import { useCallback, useEffect, useState } from "react";
import type { z } from "zod";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { customerDebtAllowed } from "@/features/customer-debts-api/access";
import { list as debtList, statement as debtStatement } from "@/features/customer-debts-api/contracts";
import { downloadCustomerDebt, readCustomerDebt } from "@/features/customer-debts-api/repository";
import { useMutation, useRemote } from "@/features/operations/ui";

export const DEBT_PAGE_SIZE = 20;
export type DebtList = z.infer<typeof debtList>;
export type DebtStatement = z.infer<typeof debtStatement>;

/** Giá trị đã "ổn định" sau `delay` ms; dùng để ô tìm kiếm không gọi API ở mỗi phím gõ. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setSettled(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return settled;
}

/**
 * Công nợ khách hàng từ backend có sẵn (api/customer-debts, DEBT-03): danh sách khách đang có công nợ (phân trang, tìm theo tên),
 * và sổ chi tiết của một khách trong kỳ. Công nợ không theo vùng nên không có bộ lọc vùng. Xuất Excel: danh sách, hoặc sổ của khách đang mở.
 */
export function useCustomerDebts(opts: Readonly<{ search: string; page: number; from: string; to: string; customerId?: string }>) {
  const workspace = useApiWorkspace(), exporter = useMutation();
  const { search, page, from, to, customerId } = opts;
  const canView = customerDebtAllowed(workspace.identity, workspace.permissions.functionPermissions);
  const canExport = customerDebtAllowed(workspace.identity, workspace.permissions.functionPermissions, "Export");
  const list = useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<DebtList | null>> =>
    canView ? readCustomerDebt({ action: "list", search, page: String(page), pageSize: String(DEBT_PAGE_SIZE) }, debtList, signal) : { status: "success", data: null }, [canView, search, page]));
  const statement = useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<DebtStatement | null>> =>
    canView && customerId ? readCustomerDebt({ action: "statement", customerId, from, to }, debtStatement, signal) : { status: "success", data: null }, [canView, customerId, from, to]));
  return {
    canView, canExport, list, statement, exporting: exporter.pending, exportError: exporter.error,
    exportFile: () => { void exporter.run(() => downloadCustomerDebt({ search, from, to, ...(customerId ? { customerId } : {}) }), true); },
  };
}

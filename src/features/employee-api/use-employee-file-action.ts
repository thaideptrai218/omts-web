"use client";
import { useEffect, useRef, useState } from "react";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { operationError } from "@/features/operations/ui";

/** Why an export was refused: the backend caps one workbook at 5000 employees and answers 400 above it. */
export const exportLimitMessage = "Không xuất được file. Một lần xuất tối đa 5.000 nhân viên: hãy thu hẹp bộ lọc hoặc chọn ít dòng hơn.";

/** Pending and error state of one file download; a second click while one runs is ignored. */
export function useEmployeeFileAction(action: () => Promise<WorkspaceResult<true>>, refusal?: string) {
  const [pending, setPending] = useState(false), [error, setError] = useState<string>();
  const active = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function run() {
    if (active.current) return;
    active.current = true; setPending(true); setError(undefined);
    const result = await action();
    active.current = false;
    if (!mounted.current) return;
    setPending(false);
    if (result.status !== "success") setError(result.httpStatus === 400 && refusal ? refusal : operationError(result));
  }
  return { pending, error, run, clear: () => setError(undefined) };
}

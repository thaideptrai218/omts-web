"use client";
import { useEffect, useState } from "react";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { operationError } from "@/features/operations/ui";

/**
 * Like `useRemote`, but a reload keeps the last data on screen instead of clearing it. A list can refresh behind an open
 * in-place editor, and a record can be re-read for conflict review, without unmounting the row or the draft being edited.
 */
export function useStickyRemote<T>(loader: (signal: AbortSignal) => Promise<WorkspaceResult<T>>) {
  const [data, setData] = useState<T>(), [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setLoading(true); setError(undefined);
      const result = await loader(controller.signal);
      if (controller.signal.aborted) return;
      setLoading(false);
      if (result.status === "success") setData(result.data); else setError(operationError(result));
    });
    return () => controller.abort();
  }, [loader, attempt]);
  return { data, error, loading, reload: () => setAttempt(value => value + 1), replace: setData };
}

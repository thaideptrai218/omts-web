"use client";
import { useEffect, useRef, useState } from "react";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { operationError } from "@/features/operations/ui";

/** Keep the visible table mounted on refresh, but clear it when filters/paging change. */
export function useEmployeeDirectoryList<T>(loader: (signal: AbortSignal) => Promise<WorkspaceResult<T>>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const previousLoader = useRef(loader);
  useEffect(() => {
    const controller = new AbortController();
    const queryChanged = previousLoader.current !== loader;
    previousLoader.current = loader;
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setLoading(true); setError(undefined);
      if (queryChanged) setData(undefined);
      let result: WorkspaceResult<T>;
      try { result = await loader(controller.signal); }
      catch { result = { status: "error", httpStatus: 0, uncertain: false }; }
      if (controller.signal.aborted) return;
      setLoading(false);
      if (result.status === "success") setData(result.data);
      else setError(operationError(result));
    });
    return () => controller.abort();
  }, [loader, revision]);
  return { data, error, loading, reload: () => setRevision(value => value + 1) };
}

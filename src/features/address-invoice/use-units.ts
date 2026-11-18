"use client";
import { useEffect, useState } from "react";
import type { Result } from "./repository";

/** A list read through the shared cache: `load` undefined means nothing to read yet; a new `load` reads again; `retry` asks again after a failure. */
export function useUnits<T>(load: (() => Promise<Result<T[]>>) | undefined) {
  const [state, setState] = useState<{ load?: typeof load; data?: T[]; failed?: boolean }>({}), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!load) return;
    let stale = false;
    void load().then((result) => { if (!stale) setState({ load, ...(result.status === "success" ? { data: result.data } : { failed: true }) }); });
    return () => { stale = true; };
  }, [load, attempt]);
  const settled = !!load && state.load === load;
  return { data: settled ? state.data : undefined, failed: settled && !!state.failed, loading: !!load && !settled, retry: () => { setState({}); setAttempt((value) => value + 1); } };
}

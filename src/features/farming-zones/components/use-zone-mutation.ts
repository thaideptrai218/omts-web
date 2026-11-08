"use client";

import { useEffect, useRef, useState } from "react";
import type { ZoneFailure, ZoneMutationResult } from "../domain/farming-zone";
import { zoneFailureText } from "./zone-feedback";

// Block double clicks synchronously and ignore replies after the editor closes.
export function useZoneMutation(
  onSaved: (result: Extract<ZoneMutationResult, { status: "saved" }>) => void,
  onPendingChange?: (pending: boolean) => void,
  onRejected?: (failure: ZoneFailure) => void,
) {
  const active = useRef(true);
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function run(operation: () => Promise<ZoneMutationResult>) {
    if (!active.current || locked.current) return;
    locked.current = true;
    setPending(true);
    setError("");
    onPendingChange?.(true);
    try {
      const result = await operation();
      if (!active.current) return;
      if (result.status === "saved") onSaved(result);
      else {
        setError(zoneFailureText(result));
        onRejected?.(result);
      }
    } catch {
      if (active.current)
        setError(
          "Chưa lưu được hồ sơ. Nội dung đang nhập vẫn được giữ lại. Hãy thử lại.",
        );
    } finally {
      locked.current = false;
      if (active.current) {
        setPending(false);
        onPendingChange?.(false);
      }
    }
  }
  return {
    run,
    pending,
    error,
    clearError: () => setError(""),
    isLocked: () => locked.current,
  };
}

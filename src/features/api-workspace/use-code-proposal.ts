"use client";
import { useEffect, useRef, useState } from "react";
import type { createWorkspaceRepository } from "./workspace-repository";

/**
 * Next free code proposed by the backend for a new zone (KV01...) or raft ({zone}-B01...). `onProposal` runs once when
 * the proposal arrives (use it to prefill an empty code field); the returned code is the dirty-check baseline. The user
 * may overwrite it, so a failed or missing proposal (older backend, 404, network) leaves the field empty and editable.
 */
export function useCodeProposal(repository: ReturnType<typeof createWorkspaceRepository>, onProposal: (code: string) => void, zoneId?: string): string {
  const [code, setCode] = useState("");
  const apply = useRef(onProposal);
  useEffect(() => { apply.current = onProposal; });
  useEffect(() => {
    const controller = new AbortController();
    void repository.proposal(controller.signal, zoneId).then((result) => {
      if (controller.signal.aborted || result.status !== "success") return;
      setCode(result.data.code);
      apply.current(result.data.code);
    });
    return () => controller.abort();
  }, [repository, zoneId]);
  return code;
}

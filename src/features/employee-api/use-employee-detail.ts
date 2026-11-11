"use client";
import { useEffect, useState } from "react";
import { createOperationsRepository } from "@/features/operations/repository";
import { operationError } from "@/features/operations/ui";
import { employeeViewSchema, type Employee } from "./contracts";

export type EmployeeDetailCache = Map<string, Employee>;
/** Only secret-free GET records enter this page-lifetime cache. */
export function useEmployeeDetail(id: string, cache: EmployeeDetailCache, revision = 0) {
  const [data, setData] = useState<Employee>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setLoading(true); setError(undefined);
      const cached = cache.get(id);
      const result = cached ? { status: "success" as const, data: cached } : await createOperationsRepository("employees").read("detail", { id }, employeeViewSchema, controller.signal);
      if (controller.signal.aborted) return;
      setLoading(false);
      if (result.status === "success") { cache.set(id, result.data); setData(result.data); }
      else { setError(operationError(result)); setData(undefined); }
    });
    return () => controller.abort();
  }, [id, cache, revision, attempt]);
  return { data, error, loading, reload: () => setAttempt(value => value + 1) };
}

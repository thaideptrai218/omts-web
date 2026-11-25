"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { createOperationsRepository } from "@/features/operations/repository";
import { employeeKindOf, type EmployeeKind } from "./employee-type-badge";

const page = z.object({ items: z.array(z.object({ id: z.guid(), employeeType: z.string().nullish() }).loose()), total: z.number() });
const PAGE_SIZE = 100, MAX_PAGES = 30, KEEP_MS = 5 * 60_000;
let cached: { at: number; kinds: Map<string, EmployeeKind> } | undefined, loading: Promise<Map<string, EmployeeKind>> | undefined;

/** Reads the kind (nội bộ or thời vụ) of every employee the caller may see, through the permission-scoped employee list. A failure gives an empty map: screens then show no marker instead of a wrong one. */
async function load(): Promise<Map<string, EmployeeKind>> {
  const kinds = new Map<string, EmployeeKind>(), repository = createOperationsRepository("employees");
  for (let number = 1; number <= MAX_PAGES; number++) {
    const result = await repository.read("list", { page: String(number), pageSize: String(PAGE_SIZE) }, page);
    if (!result || result.status !== "success") break;
    for (const item of result.data.items) { const kind = employeeKindOf(item.employeeType); if (kind) kinds.set(item.id, kind); }
    if (number * PAGE_SIZE >= result.data.total) break;
  }
  return kinds;
}

/** Forgets what was read (after an employee was created or its type changed). */
export const resetEmployeeTypes = () => { cached = undefined; };

/**
 * `kindOf(employeeId)`: the kind of an employee for screens whose own data does not carry it (crew pickers, schedule, attendance). `known` carries the kind a screen already has
 * (for example the `type` of a workforce lookup), which wins over the list. Re-renders once the list arrives; undefined means "not known", never a guess.
 */
export function useEmployeeKinds(known?: ReadonlyMap<string, string | null | undefined>) {
  const [kinds, setKinds] = useState<Map<string, EmployeeKind> | undefined>(() => cached && Date.now() - cached.at < KEEP_MS ? cached.kinds : undefined);
  useEffect(() => {
    if (kinds) return;
    let alive = true;
    loading ??= load().then((loaded) => { cached = { at: Date.now(), kinds: loaded }; return loaded; }).catch(() => new Map<string, EmployeeKind>()).finally(() => { loading = undefined; });
    void loading.then((loaded) => { if (alive) setKinds(loaded); });
    return () => { alive = false; };
  }, [kinds]);
  return (employeeId: string | null | undefined): EmployeeKind | undefined => employeeId ? employeeKindOf(known?.get(employeeId)) ?? kinds?.get(employeeId) : undefined;
}

"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { createOperationsRepository } from "@/features/operations/repository";
import { employeeKindOf, type EmployeeKind } from "./employee-type-badge";

const page = z.object({ items: z.array(z.object({ id: z.guid(), employeeType: z.string().nullish(), workingZones: z.array(z.object({ code: z.string() }).loose()).nullish().catch(undefined) }).loose()), total: z.number() });
const PAGE_SIZE = 100, MAX_PAGES = 30, KEEP_MS = 5 * 60_000;
type Facts = { kinds: Map<string, EmployeeKind>; zones: Map<string, string[]> };
let cached: { at: number; facts: Facts } | undefined, loading: Promise<Facts> | undefined;

/** Reads the kind (nội bộ or thời vụ) of every employee the caller may see, through the permission-scoped employee list. A failure gives an empty map: screens then show no marker instead of a wrong one. */
async function load(): Promise<Facts> {
  const kinds = new Map<string, EmployeeKind>(), zones = new Map<string, string[]>(), repository = createOperationsRepository("employees");
  for (let number = 1; number <= MAX_PAGES; number++) {
    const result = await repository.read("list", { page: String(number), pageSize: String(PAGE_SIZE) }, page);
    if (!result || result.status !== "success") break;
    for (const item of result.data.items) { const kind = employeeKindOf(item.employeeType); if (kind) kinds.set(item.id, kind); if (item.workingZones?.length) zones.set(item.id, item.workingZones.map((zone) => zone.code)); }
    if (number * PAGE_SIZE >= result.data.total) break;
  }
  return { kinds, zones };
}

/** Forgets what was read (after an employee was created or its type changed). */
export const resetEmployeeTypes = () => { cached = undefined; };

/**
 * `kindOf(employeeId)` and `zonesOf(employeeId)`: the kind (nội bộ or thời vụ) and the fixed working zones (codes) of an employee for screens whose own data does not carry them (crew pickers, schedule, attendance).
 * `known` carries the kind a screen already has (for example the `type` of a workforce lookup), which wins over the list. Re-renders once the list arrives; undefined means "not known", never a guess.
 */
export function useEmployeeFacts(known?: ReadonlyMap<string, string | null | undefined>) {
  const [facts, setFacts] = useState<Facts | undefined>(() => cached && Date.now() - cached.at < KEEP_MS ? cached.facts : undefined);
  useEffect(() => {
    if (facts) return;
    let alive = true;
    loading ??= load().then((loaded) => { cached = { at: Date.now(), facts: loaded }; return loaded; }).catch((): Facts => ({ kinds: new Map(), zones: new Map() })).finally(() => { loading = undefined; });
    void loading.then((loaded) => { if (alive) setFacts(loaded); });
    return () => { alive = false; };
  }, [facts]);
  return {
    kindOf: (employeeId: string | null | undefined): EmployeeKind | undefined => employeeId ? employeeKindOf(known?.get(employeeId)) ?? facts?.kinds.get(employeeId) : undefined,
    zonesOf: (employeeId: string | null | undefined): readonly string[] => (employeeId ? facts?.zones.get(employeeId) : undefined) ?? [],
  };
}

/** Only the kind of an employee: see `useEmployeeFacts`. */
export const useEmployeeKinds = (known?: ReadonlyMap<string, string | null | undefined>) => useEmployeeFacts(known).kindOf;

"use client";
import { FilterPills } from "@/components/ui/management-screen/management-layout";
import { employeeKindOf, type EmployeeKind } from "./employee-type-badge";

/** The filter "Tất cả / Nội bộ / Thời vụ" of every list or picker that names people. The value is "" (all), "Staff" or "SeasonalWorker", as the employee API names them. */
export const employeeTypeFilterOptions = [["Staff", "Nội bộ"], ["SeasonalWorker", "Thời vụ"]] as const;

export function EmployeeTypeFilter({ value, onChange, name = "employee-type", legend = "Loại nhân viên" }: { value: string; onChange(value: string): void; name?: string; legend?: string }) {
  return <FilterPills legend={legend} name={name} value={value} options={employeeTypeFilterOptions} onChange={onChange} />;
}

/** True when a person of `type` passes the filter; an empty filter lets everyone through, and a person whose kind is not known stays visible (the list is not hiding people on missing data). */
export const matchesEmployeeType = (type: string | null | undefined, filter: string) => !filter || !employeeKindOf(type) || type === filter;

/** Keeps the people the filter allows; `typeOf` reads the kind of one item. */
export const filterByEmployeeType = <T,>(items: readonly T[], filter: string, typeOf: (item: T) => string | null | undefined): T[] => filter ? items.filter((item) => matchesEmployeeType(typeOf(item), filter)) : [...items];

export type { EmployeeKind };

import type { ReactNode } from "react";

/** The two kinds of employee: official (nội bộ, `Staff`) and called when there is work (thời vụ, `SeasonalWorker`). */
export type EmployeeKind = "Staff" | "SeasonalWorker";

/** Narrows what an API or a form hands over (text, null, empty) to one of the two kinds; anything else is "not known". */
export const employeeKindOf = (value: string | null | undefined): EmployeeKind | undefined => value === "Staff" || value === "SeasonalWorker" ? value : undefined;

/**
 * The marker of the kind of employee, the same everywhere a person is shown or chosen: a blue tick for an official (nội bộ) employee and a clear "Thời vụ" chip for a seasonal one.
 * The tick always carries its text for screen readers and as a tooltip; `showLabel` prints "Nội bộ" beside it (type columns, forms). An unknown kind shows nothing.
 */
export function EmployeeTypeBadge({ type, showLabel = false, className = "" }: { type: string | null | undefined; showLabel?: boolean; className?: string }) {
  const kind = employeeKindOf(type);
  if (kind === "SeasonalWorker") return <span data-employee-type="SeasonalWorker" className={`inline-flex shrink-0 items-center rounded-full border border-warning/40 bg-warning-soft px-2 py-px align-middle text-xs font-semibold leading-5 text-warning ${className}`}>Thời vụ</span>;
  if (kind !== "Staff") return null;
  return <span data-employee-type="Staff" title="Nội bộ" className={`inline-flex shrink-0 items-center gap-1 align-middle text-xs font-semibold text-[#1d6fdc] ${className}`}>
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="10" fill="currentColor" /><path d="M5.8 10.3l3 3 5.4-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    {showLabel ? "Nội bộ" : <span className="sr-only">Nội bộ</span>}
  </span>;
}

/** A person's name with the marker of their kind right after it; the name keeps shrinking and truncating in a narrow cell while the marker stays whole. */
export function EmployeeNameWithType({ name, type, children }: { name: ReactNode; type: string | null | undefined; children?: ReactNode }) {
  return <span className="inline-flex min-w-0 max-w-full items-center gap-1.5"><span className="min-w-0 truncate">{name}</span><EmployeeTypeBadge type={type} />{children}</span>;
}

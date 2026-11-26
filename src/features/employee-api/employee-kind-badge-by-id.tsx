"use client";
import { EmployeeTypeBadge } from "./employee-type-badge";
import { useEmployeeKinds } from "./use-employee-types";

/** The marker of the kind of employee for a screen that only has the employee id (payroll lists, payment rows); shows nothing until the kind is known. */
export function EmployeeKindBadgeById({ employeeId, showLabel = false, className }: { employeeId: string | null | undefined; showLabel?: boolean; className?: string }) {
  return <EmployeeTypeBadge type={useEmployeeKinds()(employeeId)} showLabel={showLabel} className={className ?? "ml-1.5"} />;
}

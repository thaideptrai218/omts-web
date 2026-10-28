import { Fragment } from "react";
import type { EmployeeZoneOption } from "../domain/employee-working-details";

export function EmployeeZoneSummary({ ids, zones }: Readonly<{
  ids: readonly string[];
  zones: readonly EmployeeZoneOption[];
}>) {
  if (!ids.length) return <span className="text-sm text-text-muted">Chưa có vùng làm việc</span>;
  const known = zones.filter((zone) => ids.includes(zone.id));
  const unknownCount = ids.filter((id) => !zones.some((zone) => zone.id === id)).length;
  return (
    <span className="flex min-w-0 flex-wrap gap-2 text-xs text-text-muted">
      {known.map((zone) => (
        <Fragment key={zone.id}>
          <span className="max-w-full rounded-control bg-surface-subtle px-2 py-1 [overflow-wrap:anywhere]">
            {zone.label}
          </span>{" "}
        </Fragment>
      ))}
      {unknownCount > 0 && <span>{unknownCount} vùng chưa có trong danh mục</span>}
    </span>
  );
}

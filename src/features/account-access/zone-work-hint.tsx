import Link from "next/link";
import { employeeProfileHref } from "./user-info-section";

/**
 * Gentle yellow note when someone is made Quản lý vùng for a zone their employee record does not list under Vùng làm việc.
 * It only warns: saving stays allowed. Renders nothing when no zone is missing.
 */
export function ZoneWorkHint({ zoneNames, employeeId, employeeName }: { zoneNames: readonly string[]; employeeId: string; employeeName: string }) {
  if (!zoneNames.length) return null;
  return <p role="note" className="rounded-control border border-warning/30 bg-warning-soft p-2 text-sm">
    Người này chưa được ghi làm việc ở vùng {zoneNames.join(", ")}. Nên thêm vùng đó vào hồ sơ nhân viên.{" "}
    <Link className="font-semibold underline" href={employeeProfileHref(employeeId, employeeName)}>Mở hồ sơ nhân viên</Link>
  </p>;
}

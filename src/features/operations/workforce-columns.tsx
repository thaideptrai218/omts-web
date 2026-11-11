import type { ReactNode } from "react";
import type { SortState } from "@/components/ui/management-screen/management-table";
import { displayTime } from "./ui";
import styles from "./workforce-screen.module.css";
import { attendanceLabel, attendanceState, type Assignment, type WorkforceTab } from "./workforce-shared";

export type WorkforceColumn = {
  key: string;
  label: string;
  /** Views that offer this column. */
  modes: readonly WorkforceTab[];
  render(row: Assignment, zoneName: (id: string) => string): ReactNode;
  compare(a: Assignment, b: Assignment, zoneName: (id: string) => string): number;
};

const text = (a: string, b: string) => a.localeCompare(b, "vi");
const both: readonly WorkforceTab[] = ["assignments", "attendance"];
const recorded = (value: string | null) => (value ? displayTime(value) : "Chưa ghi nhận");

export const workforceColumns: readonly WorkforceColumn[] = [
  { key: "employee", label: "Nhân viên", modes: both, render: (row) => <strong>{row.employeeName}</strong>, compare: (a, b) => text(a.employeeName, b.employeeName) },
  { key: "zone", label: "Vùng", modes: both, render: (row, zoneName) => zoneName(row.zoneId), compare: (a, b, zoneName) => text(zoneName(a.zoneId), zoneName(b.zoneId)) },
  { key: "raft", label: "Bè", modes: both, render: (row) => row.raftCode || "Chưa xác định", compare: (a, b) => text(a.raftCode ?? "", b.raftCode ?? "") },
  { key: "job", label: "Công việc", modes: both, render: (row) => row.job, compare: (a, b) => text(a.job, b.job) },
  { key: "checkedIn", label: "Vào làm", modes: ["attendance"], render: (row) => <span className="tabular-nums">{recorded(row.checkedInAt)}</span>, compare: (a, b) => text(a.checkedInAt ?? "", b.checkedInAt ?? "") },
  { key: "checkedOut", label: "Ra về", modes: ["attendance"], render: (row) => <span className="tabular-nums">{recorded(row.checkedOutAt)}</span>, compare: (a, b) => text(a.checkedOutAt ?? "", b.checkedOutAt ?? "") },
  { key: "status", label: "Trạng thái", modes: both, render: (row) => <span className={styles.status} data-state={attendanceState(row)}>{attendanceLabel[attendanceState(row)]}</span>, compare: (a, b) => text(attendanceState(a), attendanceState(b)) },
];

/** Sorts the whole loaded day (the data is not paged by the server); an unknown sort key keeps the API order. */
export function sortAssignments(rows: readonly Assignment[], sort: SortState, mode: WorkforceTab, zoneName: (id: string) => string) {
  const column = workforceColumns.find((item) => item.key === sort.key && item.modes.includes(mode));
  if (!column) return rows;
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => sign * column.compare(a, b, zoneName));
}

"use client";
import { Button } from "@/components/ui/button";
import { displayTime } from "@/features/operations/ui";
import { isPreviousOpen, offeredStep, todayLabel, todayState, type AttendanceAllowed, type AttendanceStep, type TodayCrew } from "./attendance-today-model";
import type { AttendanceTodayActions } from "./use-attendance-today-actions";
import styles from "./attendance-today.module.css";

export function AttendanceTodayGroup({ group, day, zoneId, allowed, actions, previous = false, onCrew }: {
  group: TodayCrew; day: string; zoneId: string; allowed: AttendanceAllowed; actions: AttendanceTodayActions; previous?: boolean;
  onCrew(group: TodayCrew, step: AttendanceStep): void;
}) {
  const eligible = (step: AttendanceStep) => group.people.filter(row => offeredStep(row, day, zoneId, allowed) === step);
  const waiting = eligible("check-in"), working = eligible("check-out");
  const busy = actions.pending || actions.blocked;
  // A disabled button says why it is disabled.
  const busyReason = busy ? (actions.blocked ? "Cần tải lại và đối chiếu kết quả trước khi ghi tiếp." : "Đang ghi chấm công, chờ một chút.") : undefined;
  return <section className={styles.group} data-previous={previous || undefined} aria-label={group.label}>
    <header className={styles.groupHeader}>
      <h2>{group.label} <span>({group.people.length} người)</span></h2>
      {!previous && <div className={styles.groupActions}>
        {waiting.length > 0 && <Button type="button" className="w-auto" disabled={busy} title={busyReason} onClick={() => onCrew({ ...group, people: waiting }, "check-in")}>Vào làm cả tổ ({waiting.length})</Button>}
        {working.length > 0 && <Button type="button" className="w-auto" variant="secondary" disabled={busy} title={busyReason} onClick={() => onCrew({ ...group, people: working }, "check-out")}>Ra về cả tổ ({working.length})</Button>}
      </div>}
    </header>
    {!previous && (waiting.length > 0 || working.length > 0) && <p className="px-3 pb-1 text-xs text-text-muted">Cả tổ: cả nhóm trong cùng bè hoặc vùng, ghi một lần cho mọi người trong nhóm.</p>}
    <ul className={styles.people}>{group.people.map(row => {
      const step = offeredStep(row, day, zoneId, allowed);
      return <li key={row.key} className={styles.person} aria-busy={actions.pendingKey === row.key || undefined}>
        <div className={styles.identity}><strong>{row.name}</strong><small>{row.assignment?.job || row.code || "Nhân viên nội bộ"}</small></div>
        <div className={styles.times}>
          <span>Vào: {row.checkedInAt ? displayTime(row.checkedInAt) : "—"}</span>
          <span>Ra: {row.checkedOutAt ? displayTime(row.checkedOutAt) : "—"}</span>
        </div>
        <div className={styles.state}><span className={styles.badge} data-state={todayState(row)}>{todayLabel(row)}</span>
          {isPreviousOpen(row, day) && <small>Chưa ra về từ ngày trước</small>}
          {isPreviousOpen(row, day) && row.source === "staff" && !step && <small>Cần đối chiếu chấm công ngày trước.</small>}
          {!row.assignment?.jobTypeId && row.source === "assignment" && todayState(row) === "planned" && <small>Chưa có loại công việc</small>}
        </div>
        <div className={styles.personAction}>{step && <Button type="button" className="w-auto" variant={step === "check-in" ? "primary" : "secondary"}
          disabled={busy} title={busyReason} isPending={actions.pendingKey === row.key} aria-label={`${step === "check-in" ? "Vào làm" : "Ra về"} cho ${row.name}`}
          onClick={() => void actions.record([row], step, row.key)}>{step === "check-in" ? "Vào làm" : "Ra về"}</Button>}</div>
      </li>;
    })}</ul>
  </section>;
}

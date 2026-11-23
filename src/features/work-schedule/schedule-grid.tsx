import { Button } from "@/components/ui/button";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { assignmentLabel, cellAccessibleName, type DayState, type ScheduleCell, type SchedulePerson } from "./schedule-model";
import styles from "./work-schedule.module.css";

export function ScheduleGrid({ days, people, zoneId, today, retry, onCell }: {
  days: DayState[]; people: SchedulePerson[]; zoneId: string; today: string;
  retry(day: string): void; onCell(cell: ScheduleCell): void;
}) {
  const labels = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"];
  return <div className={styles.scroller} tabIndex={0} role="region" aria-label="Lịch làm việc theo tuần">
    <table className={styles.grid}>
      <caption className="sr-only">Lịch phân công từ {formatVietnameseDate(days[0].day)} đến {formatVietnameseDate(days[6].day)}</caption>
      <thead><tr><th scope="col">Nhân viên</th>{days.map((entry, index) => <th scope="col" key={entry.day} aria-current={entry.day === today ? "date" : undefined}>
        {labels[index]}<span className={styles.date}>{formatVietnameseDate(entry.day)}</span>
        {entry.loading && <span role="status" className="sr-only">Đang tải ngày {formatVietnameseDate(entry.day)}</span>}
        {entry.error && <div className={styles.dayError}><p role="alert">{entry.error}</p><Button variant="ghost" onClick={() => retry(entry.day)}
          aria-label={`Thử lại ngày ${formatVietnameseDate(entry.day)}`}>Thử lại</Button></div>}
      </th>)}</tr></thead>
      <tbody>{people.map((person) => <tr key={person.id}><th scope="row">{person.name}{person.code && <small className={styles.date}>{person.code}</small>}</th>
        {days.map((entry, dayIndex) => {
          const assignments = entry.rows.filter((row) => row.zoneId === zoneId && row.employeeId === person.id);
          return <td key={entry.day} data-past={entry.day < today || undefined}>
            {entry.loading ? <div aria-hidden="true" className="omts-skeleton h-14 rounded-control" /> : entry.error ? <span>Chưa tải được</span>
              : <button type="button" className={styles.cell} aria-label={cellAccessibleName(person.name, labels[dayIndex], formatVietnameseDate(entry.day), assignments.map(assignmentLabel))}
                onClick={() => onCell({ person, day: entry.day, assignments })}>
                {assignments.length ? assignments.map((row) => <span key={row.id} className={styles.assignment}>{assignmentLabel(row)}{row.onLeave && <small> · Đã duyệt nghỉ</small>}</span>)
                  : <span className={styles.empty}>—</span>}
              </button>}
          </td>;
        })}</tr>)}
        {!people.length && <tr><td colSpan={8}>{days.some((entry) => entry.loading) ? <div role="status" aria-label="Đang tải lịch tuần" className="omts-skeleton h-28" />
          : "Chưa có nhân viên hoặc phân công trong vùng này."}</td></tr>}
      </tbody>
    </table>
  </div>;
}

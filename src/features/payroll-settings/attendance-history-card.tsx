import { displayClock, roundingLabel, sortedVersions, vnDate, type AttendanceSettings } from "./attendance-settings-draft";
import s from "./payroll-settings-screen.module.css";

/** Lịch sử các phiên bản thiết lập chấm công (mới nhất trước), chỉ đọc. */
export function AttendanceHistoryCard({ versions }: { versions: AttendanceSettings["versions"] }) {
  const rows = sortedVersions(versions);
  return (
    <section className={s.card} aria-labelledby="attendance-history-title">
      <h2 id="attendance-history-title" className={s.h2}>Lịch sử thiết lập chấm công</h2>
      {rows.length === 0 ? <p className={s.empty}>Chưa có phiên bản nào.</p> : (
        <div className={s.historyScroll} tabIndex={0} role="region" aria-label="Danh sách phiên bản thiết lập chấm công">
          <table className={s.history}>
            <thead><tr><th scope="col">Hiệu lực</th><th scope="col">Nghỉ từ</th><th scope="col">Nghỉ đến</th><th scope="col">Làm tròn</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.effectiveFrom}>
                  <td>{vnDate(r.effectiveFrom)}</td><td>{displayClock(r.breakStart) || "—"}</td><td>{displayClock(r.breakEnd) || "—"}</td><td>{roundingLabel(r.roundingUnit)}</td>
                </tr>))}
            </tbody>
          </table>
        </div>)}
    </section>
  );
}

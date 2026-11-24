"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import { businessToday } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { copyStatusLabel, previewCopyWeek } from "./copy-week-model";
import { executeCopyWeek, type CopyProgress } from "./copy-week-service";
import { ScheduleHelp } from "./schedule-help";
import { ScheduleGrid } from "./schedule-grid";
import { shiftDay, type DayState, type SchedulePerson } from "./schedule-model";
import { useScheduleWeek } from "./use-schedule-week";
import styles from "./work-schedule.module.css";

export function CopyWeekDialog({ monday, zoneId, target, people, canCreate, onClose, onCopied }: {
  monday: string; zoneId: string; target: DayState[]; people: SchedulePerson[];
  canCreate(): boolean; onClose(): void; onCopied(): void;
}) {
  const source = useScheduleWeek(shiftDay(monday, -7));
  // Freeze the reviewed destination; the runner rechecks occupied cells before it writes.
  const [destination] = useState(target);
  const [progress, setProgress] = useState<CopyProgress>();
  const [pending, setPending] = useState(false), [finished, setFinished] = useState(false);
  const [error, setError] = useState<string>();
  const active = useRef(false), { notify } = useToast();
  const incomplete = source.days.some((day) => day.loading || day.error) || destination.some((day) => day.loading || day.error);
  const items = previewCopyWeek(source.days.flatMap((day) => day.rows), destination.flatMap((day) => day.rows), people, zoneId, businessToday());
  const candidates = items.filter((item) => item.status === "create");
  const occupiedDays = destination.filter((day) => day.rows.some((row) => row.zoneId === zoneId));

  async function copy() {
    if (active.current || finished || incomplete || !canCreate() || !candidates.length) return;
    active.current = true; setPending(true); setError(undefined);
    setProgress({ completed: 0, total: candidates.length, outcomes: [] });
    try {
      const outcomes = await executeCopyWeek(items, setProgress, canCreate);
      const created = outcomes.filter((outcome) => outcome.status === "created").length;
      const failed = outcomes.filter((outcome) => outcome.status === "failed").length;
      notify({ tone: failed ? "warning" : "success", title: `Đã chép ${created} phân công.${failed ? ` ${failed} dòng chưa thành công.` : ""}` });
    } catch {
      setError("Chưa hoàn tất lượt chép. Tải lại lịch để đối chiếu trước khi mở lượt chép mới.");
    } finally {
      setPending(false); setFinished(true); active.current = false; onCopied();
    }
  }

  return <Dialog open size="xl" title="Chép từ tuần trước" description={`Tuần nhận: ${formatVietnameseDate(monday)} – ${formatVietnameseDate(shiftDay(monday, 6))}`}
    dismissible={!pending} onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <ScheduleHelp>Chép công việc và bè của từng người sang cùng thứ tuần này. Các ô đã có phân công được giữ nguyên. Không chép chấm công. Lượt gửi chạy lần lượt và không tự gửi lại khi chưa rõ kết quả.</ScheduleHelp>
    {occupiedDays.length > 0 && <p className={styles.warning}>Các ngày {occupiedDays.map((day) => formatVietnameseDate(day.day)).join(", ")} đã có phân công. Vẫn có thể chép các ô trống; bỏ qua ô trùng hoặc đã có việc.</p>}
    {incomplete && <div className="mb-4"><p role="status">Đang đối chiếu đủ bảy ngày trước khi chép.</p>
      <ScheduleGrid days={source.days} people={[]} zoneId={zoneId} today={businessToday()} retry={(day) => void source.retry(day)} onCell={() => undefined} /></div>}
    {!incomplete && !items.length && <p className="my-4">Tuần trước chưa có phân công trong vùng này.</p>}
    {!!items.length && <div className={styles.previewScroll}><table className={styles.preview}>
      <caption className="sr-only">Xem trước phân công sẽ chép</caption>
      <thead><tr><th scope="col">Nhân viên</th><th scope="col">Ngày nhận</th><th scope="col">Bè · Công việc</th><th scope="col">Kết quả đối chiếu</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item.key}><th scope="row">{item.name}</th><td>{formatVietnameseDate(item.draft.day)}</td><td>{item.label}</td><td>{copyStatusLabel[item.status]}</td></tr>)}</tbody>
    </table></div>}
    {!incomplete && !finished && <p className="my-3 text-sm">Sẽ tạo {candidates.length} phân công; bỏ qua {items.length - candidates.length} dòng. Lịch đã có được giữ nguyên.</p>}
    {progress && <div role="status" aria-live="polite" className="my-4"><label htmlFor="copy-week-progress">{pending ? "Đang chép" : "Đã xử lý"} {progress.completed}/{progress.total} phân công</label>
      <progress id="copy-week-progress" className="block w-full" max={Math.max(progress.total, 1)} value={progress.completed} /></div>}
    {error && <p role="alert" className={styles.warning}>{error}</p>}
    {!!progress?.outcomes.length && <ul aria-label="Kết quả từng phân công" className="my-4 max-h-64 space-y-2 overflow-auto text-sm">
      {progress.outcomes.map((outcome) => <li key={outcome.item.key} className={outcome.status === "failed" ? "text-danger" : undefined}>
        {outcome.item.name} · {formatVietnameseDate(outcome.item.draft.day)}: {outcome.message}</li>)}
    </ul>}
    <div className="mt-4 flex flex-wrap gap-2">
      <Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>{finished ? "Đóng" : "Bỏ qua"}</Button>
      {!finished && <Button className="w-auto" isPending={pending} pendingLabel="Đang chép…" disabled={incomplete || !candidates.length || !canCreate()}
        onClick={() => void copy()}>Xác nhận chép {candidates.length} phân công</Button>}
    </div>
  </Dialog>;
}

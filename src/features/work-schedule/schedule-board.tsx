"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton, businessToday, useRemote } from "@/features/operations/ui";
import { CopyWeekDialog } from "./copy-week-dialog";
import { ScheduleCellDialog } from "./schedule-cell-dialog";
import { ScheduleGrid } from "./schedule-grid";
import { schedulePeople, type ScheduleAccess, type ScheduleCell } from "./schedule-model";
import { scheduleService } from "./schedule-service";
import { useScheduleWeek } from "./use-schedule-week";
import styles from "./work-schedule.module.css";

export function ScheduleBoard({ monday, zoneId, allowed, canReadPeople }: {
  monday: string; zoneId: string; allowed: ScheduleAccess; canReadPeople: boolean;
}) {
  const week = useScheduleWeek(monday);
  const roster = useRemote(useMemo(() => (signal: AbortSignal) => canReadPeople ? scheduleService.people(zoneId, signal)
    : Promise.resolve({ status: "success" as const, data: [] }), [zoneId, canReadPeople]));
  const [cell, setCell] = useState<ScheduleCell>();
  const [copying, setCopying] = useState(false);
  const people = schedulePeople(roster.data || [], week.days.flatMap((day) => day.rows), zoneId);
  const ready = !roster.loading && !roster.error && !week.days.some((day) => day.loading || day.error);

  function closeCell() {
    if (cell) void week.retry(cell.day);
    setCell(undefined);
  }

  return <section className={styles.board} aria-label="Phân công trong tuần">
    <div className={styles.boardToolbar}><p>{people.length} nhân viên · Ngày đã qua chỉ xem</p>
      {allowed("Create", zoneId) && <Button className="w-auto" disabled={!ready || !canReadPeople} title={!canReadPeople ? "Bạn chưa có quyền xem danh sách nhân viên của vùng." : !ready ? "Lịch đang tải hoặc có lỗi, chờ tải xong rồi thử lại." : undefined} onClick={() => setCopying(true)}>Chép từ tuần trước</Button>}
    </div>
    {!canReadPeople && <p role="status" className={styles.warning}>Bạn chưa có quyền xem danh sách nhân viên trong vùng. Lịch chỉ hiển thị những người đã có phân công.</p>}
    <ErrorNotice error={roster.error} />
    {roster.error && <Button variant="secondary" className="w-auto mb-3" onClick={roster.reload}>Thử lại danh sách nhân viên</Button>}
    {roster.loading ? <Skeleton /> : <ScheduleGrid days={week.days} people={people} zoneId={zoneId} today={businessToday()}
      retry={(day) => void week.retry(day)} onCell={setCell} />}
    {cell && <ScheduleCellDialog cell={cell} zoneId={zoneId} allowed={allowed} onClose={closeCell} onSaved={closeCell} />}
    {copying && <CopyWeekDialog monday={monday} zoneId={zoneId} target={week.days} people={roster.data || []}
      canCreate={() => allowed("Create", zoneId)} onClose={() => setCopying(false)} onCopied={() => { for (const day of week.days) void week.retry(day.day); }} />}
  </section>;
}

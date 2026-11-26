"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScreenGuide } from "@/components/ui/screen-guide";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { ErrorNotice, Field, Select, Skeleton, businessToday, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate, isDateOnly } from "@/shared/format/date-only";
import { ScheduleBoard } from "./schedule-board";
import { scheduleAllowed, shiftDay, weekStart } from "./schedule-model";
import { scheduleService } from "./schedule-service";
import styles from "./work-schedule.module.css";

export function WorkScheduleScreen() {
  const context = useApiWorkspace();
  if (!scheduleAllowed(context.identity, context.permissions.functionPermissions, "View")) {
    return <section className={styles.page}><h1>Lịch làm việc vùng</h1><p role="alert">Bạn chưa được cấp quyền xem phân công công việc.</p></section>;
  }
  return <ScheduleScreenContent />;
}

function ScheduleScreenContent() {
  const { identity, permissions } = useApiWorkspace();
  const zones = useRemote(useMemo(() => (signal: AbortSignal) => scheduleService.zones(signal), []));
  const [selectedZone, setSelectedZone] = useState("");
  const [pickedDay, setPickedDay] = useState(businessToday);
  const [monday, setMonday] = useState(() => weekStart(businessToday()));
  const allowed = (action: Parameters<typeof scheduleAllowed>[2], zoneId?: string) => scheduleAllowed(identity, permissions.functionPermissions, action, zoneId);
  const visibleZones = zones.data?.filter((zone) => allowed("View", zone.id)) || [];
  const zoneId = visibleZones.find((zone) => zone.id === selectedZone)?.id || visibleZones[0]?.id;
  const canReadPeople = identity.subjectType === "CooperativeOwner" || permissions.functionPermissions.some((grant) => grant.functionCode === "LABOR_WORKERS"
    && grant.action === "View" && grant.dataScope === "AssignedZone" && (grant.scope.kind === "all-zones" || !!zoneId && grant.scope.zoneIds.includes(zoneId)));

  function navigate(offset: number) {
    const next = shiftDay(monday, offset);
    setMonday(next); setPickedDay(next);
  }

  return <section className={styles.page}>
    <header className={styles.toolbar}><h1>Lịch làm việc vùng</h1>
      <div className={styles.filters}>
        <Select label="Vùng làm việc" value={zoneId || ""} disabled={zones.loading || !visibleZones.length} onChange={(event) => setSelectedZone(event.target.value)}>
          {!visibleZones.length && <option value="">Chưa có vùng</option>}
          {visibleZones.map((zone) => <option key={zone.id} value={zone.id}>{String(zone.name)}</option>)}
        </Select>
        <Field label="Chọn ngày trong tuần" type="date" value={pickedDay} onChange={(event) => {
          setPickedDay(event.target.value); if (isDateOnly(event.target.value)) setMonday(weekStart(event.target.value));
        }} />
      </div>
      <nav aria-label="Chọn tuần" className={styles.weekNav}>
        <Button variant="secondary" className="w-auto" aria-label="Tuần trước" onClick={() => navigate(-7)}>‹</Button>
        <Button variant="secondary" className="w-auto" onClick={() => { const today = businessToday(); setPickedDay(today); setMonday(weekStart(today)); }}>Tuần này</Button>
        <Button variant="secondary" className="w-auto" aria-label="Tuần sau" onClick={() => navigate(7)}>›</Button>
      </nav>
    </header>
    <ScreenGuide id="work-schedule" steps={[
      { title: "Chọn vùng và tuần", text: "Chọn vùng làm việc, rồi chọn tuần cần xếp lịch.", target: "p[aria-live=\"polite\"]" },
      { title: "Bấm ô để xếp việc", text: "Bấm vào ô của một người để thêm, đổi hoặc gỡ phân công ngày đó.", target: "table tbody td button" },
      { title: "Chép từ tuần trước", text: "Muốn nhanh thì bấm \"Chép từ tuần trước\", xem rồi xác nhận.", target: "text:Chép từ tuần trước" },
    ]} />
    <p className={styles.range} aria-live="polite">{formatVietnameseDate(monday)} – {formatVietnameseDate(shiftDay(monday, 6))}</p>
    {!isDateOnly(pickedDay) && <ErrorNotice error="Chọn ngày hợp lệ để đổi tuần." />}
    <ErrorNotice error={zones.error} />
    {zones.error && <Button variant="secondary" className="w-auto" onClick={zones.reload}>Thử lại danh sách vùng</Button>}
    {zones.loading ? <Skeleton /> : zoneId ? <ScheduleBoard key={`${zoneId}:${monday}`} monday={monday} zoneId={zoneId} allowed={allowed} canReadPeople={canReadPeople} />
      : !zones.error && <p role="status" className="p-4">Chưa có vùng làm việc được cấp quyền phân công.</p>}
  </section>;
}

"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScreenGuide } from "@/components/ui/screen-guide";
import { FilterGroup, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ListStateMessage, ManagementScroller } from "@/components/ui/management-screen/management-table";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { loadOptions } from "@/features/operations/lookups";
import { businessToday, ErrorNotice, Select, Skeleton, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { AttendanceCrewDialog } from "./attendance-crew-dialog";
import { AttendanceTodayGroup } from "./attendance-today-group";
import { attendanceAccess, attendanceSummary, grantedZones, groupPeople, isPreviousOpen, searchPeople, todayPeople, type AttendanceAllowed, type AttendanceStep, type TodayCrew } from "./attendance-today-model";
import { readAttendanceToday, type TodaySnapshot } from "./attendance-today-service";
import { useAttendanceTodayActions } from "./use-attendance-today-actions";
import styles from "./attendance-today.module.css";

export function AttendanceTodayScreen() {
  const context = useApiWorkspace();
  const allowed = attendanceAccess(context.identity, context.permissions.functionPermissions);
  const [day, setDay] = useState(businessToday);
  useEffect(() => {
    const timer = setInterval(() => setDay(businessToday()), 30_000);
    return () => clearInterval(timer);
  }, []);
  // Denied accounts never mount the data loaders.
  if (!allowed("View")) return <section><h1>Chấm công hôm nay</h1><p role="alert">Bạn không có quyền xem chấm công trong vùng nào.</p></section>;
  return <AttendanceTodayBoard key={day} day={day} allowed={allowed} />;
}

function AttendanceTodayBoard({ day, allowed }: { day: string; allowed: AttendanceAllowed }) {
  const [pickedZone, setPickedZone] = useState("");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [dialog, setDialog] = useState<{ group: TodayCrew; step: AttendanceStep }>();
  const zones = useRemote(useCallback((signal: AbortSignal) => loadOptions("zones", signal), []));
  const list = useRemote<TodaySnapshot>(useCallback((signal: AbortSignal) => readAttendanceToday(day, signal)
    .catch(() => ({ status: "error" as const, httpStatus: 0, uncertain: false }))
    .then(result => { if (!signal.aborted) setRefreshing(false); return result; }), [day]));
  const options = grantedZones(zones.data ?? [], allowed);
  const zoneId = options.some(zone => zone.id === pickedZone) ? pickedZone : options.length === 1 ? options[0].id : "";
  const actions = useAttendanceTodayActions(day, zoneId, allowed, () => { setRefreshing(true); list.refresh(); }, refreshing);
  const zoneName = (id: string) => String(options.find(zone => zone.id === id)?.name ?? "Vùng được cấp");
  const people = list.data ? todayPeople(list.data, day, zoneId, allowed) : [];
  // Searching finds a whole crew: its buttons always apply to the same full membership that is visible.
  const groups = groupPeople(people.filter(row => !isPreviousOpen(row, day)), zoneName)
    .filter(group => searchPeople(group.people, search, zoneName).length > 0);
  const carry = searchPeople(people.filter(row => isPreviousOpen(row, day)), search, zoneName);
  const summary = attendanceSummary([...groups.flatMap(group => group.people), ...carry], day);
  const loading = list.loading || zones.loading;
  const error = list.error || zones.error;
  const ready = !loading && !error && !!list.data && !!zones.data;
  const onCrew = (group: TodayCrew, step: AttendanceStep) => setDialog({ group, step });
  const reload = () => { list.reload(); zones.reload(); };

  return <ManagementLayout storageKey="attendance-today" icon="attendance" title="Chấm công hôm nay" filterLabel="Bộ lọc chấm công"
    search={<input type="search" aria-label="Tìm người, tổ hoặc công việc" placeholder="Tìm người, tổ hoặc công việc" maxLength={200} value={search} onChange={event => setSearch(event.target.value)} />}
    actions={<><Button type="button" variant="secondary" className="w-auto" disabled={loading || actions.pending} onClick={reload}>Tải lại</Button><HelpLink /></>}
    filters={<><FilterGroup legend="Ngày chấm công"><p>{formatVietnameseDate(day)}</p></FilterGroup>
      <FilterGroup legend="Phạm vi"><Select label="Vùng làm việc" value={zoneId} disabled={loading || !options.length || actions.pending || !!dialog} onChange={event => setPickedZone(event.target.value)}>
        {options.length !== 1 && <option value="">Tất cả vùng được cấp</option>}
        {options.map(zone => <option key={zone.id} value={zone.id}>{String(zone.name ?? zone.id)}</option>)}
      </Select></FilterGroup>
      {ready && !allowed("AttendanceCreate", zoneId || undefined) && <p className={styles.readOnly}>Bạn chỉ có quyền xem chấm công trong phạm vi này.</p>}
    </>}>
    {ready && <dl className={styles.summary} aria-label="Tổng hợp chấm công">
      <div><dt>Tổng</dt><dd>{summary.total}</dd></div><div><dt>Đang làm</dt><dd>{summary.working}</dd></div>
      <div><dt>Chưa vào</dt><dd>{summary.waiting}</dd></div><div title="Lượt công từ ngày trước hoặc quá 12 giờ chưa ra về"><dt>Chưa ra</dt><dd>{summary.unclosed}</dd></div>
    </dl>}
    <ManagementScroller busy={loading || refreshing}>
      <div className={styles.content}>
        <ScreenGuide id="attendance-today" steps={[
          { title: "Xem ai chưa vào làm", text: "Danh sách chia theo tổ (cả nhóm làm cùng bè hoặc vùng); người chưa vào làm hiện trạng thái \"Chưa vào làm\"." },
          { title: "Bấm Vào làm / Ra về", text: "Bấm cho từng người, hoặc \"cả tổ\" để ghi một lần cho cả nhóm cùng bè hoặc vùng.", target: "text:Vào làm" },
          { title: "Nhìn khối \"Chưa ra về từ hôm qua\"", text: "Người vào làm hôm qua mà chưa ra về nằm ở đó, bấm Ra về để chốt.", target: "text:Chưa ra về từ hôm qua" },
        ]} />
        <ErrorNotice error={actions.error} />
        {actions.blocked && <div className={styles.reconcile} role="alert"><p>Chưa rõ kết quả hoặc dữ liệu đã đổi. Tải lại và đối chiếu trước khi ghi tiếp.</p>
          <Button type="button" className="w-auto" variant="secondary" disabled={!ready || refreshing} onClick={actions.reviewed}>Đã đối chiếu kết quả</Button></div>}
        {actions.outcomes && actions.outcomes.some(item => !item.ok) && <section className={styles.results} aria-label="Kết quả chấm công" role="status">
          <ul>{actions.outcomes.map(item => <li key={item.key}>{item.name}: {item.message}</li>)}</ul>
          <button type="button" className="underline" onClick={actions.clearOutcomes}>Ẩn kết quả</button>
        </section>}
        {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại chấm công" />
          : loading ? <Skeleton />
          : !options.length ? <ListStateMessage>Chưa có vùng được cấp để xem chấm công.</ListStateMessage>
          : ready && <>
            {carry.length > 0 && <AttendanceTodayGroup group={{ key: "carry", label: "Chưa ra về từ hôm qua", people: carry }} previous day={day} zoneId={zoneId} allowed={allowed} actions={actions} onCrew={onCrew} />}
            {groups.map(group => <AttendanceTodayGroup key={group.key} group={group} day={day} zoneId={zoneId} allowed={allowed} actions={actions} onCrew={onCrew} />)}
            {!groups.length && !carry.length && <ListStateMessage>{search ? "Không tìm thấy người hoặc tổ phù hợp." : <>
              Chưa có phân công hoặc nhân viên nội bộ trong phạm vi hôm nay.{" "}
              <Link href="/work/schedule" className="font-medium text-primary underline underline-offset-4">Thêm phân công</Link>
            </>}</ListStateMessage>}
          </>}
      </div>
    </ManagementScroller>
    {dialog && <AttendanceCrewDialog group={dialog.group} step={dialog.step} actions={actions} onClose={() => setDialog(undefined)} />}
  </ManagementLayout>;
}

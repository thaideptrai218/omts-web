"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { RecordCrewPicker } from "@/features/cultivation-api/record-crew-picker";
import { employeeLink } from "@/features/farming-management/entity-links";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { ErrorNotice, Skeleton, businessToday, useRemote } from "@/features/operations/ui";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { PLAN, type PlanStaffing, type PlanView, type StaffingLine } from "./contracts";
import type { PlanAccess } from "./plan-access";
import { planRepository, staffingErrorText } from "./repository";

const viDate = (day: string) => day.split("-").reverse().join("/");
const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((id) => b.includes(id));
const ids = (line: StaffingLine) => line.employees.map((employee) => employee.employeeId);

/** Why nobody can change the crew of the plan now, when that is plain from the plan itself. */
function closedNote(plan: PlanView, staffing: PlanStaffing) {
  if (plan.statusId === PLAN.completed) return "Kế hoạch đã hoàn thành nên không đổi nhân công được.";
  if (plan.statusId === PLAN.cancelled) return "Kế hoạch đã hủy nên không đổi nhân công được.";
  return staffing.lines.length && staffing.lines.every((line) => line.plannedDate < businessToday()) ? "Đã qua ngày thu hoạch nên không đổi nhân công được." : undefined;
}

/** The "Nhân công" subtab of a plan: the employees of each line, chosen in place and saved as the work assignments of the line's raft on the day of the plan. */
export function PlanStaffingTab({ plan, access }: { plan: PlanView; access: PlanAccess }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => planRepository.staffing(plan.id, signal), [plan.id]));
  if (remote.loading) return <div className={listStyles.tabBody}><Skeleton /></div>;
  if (remote.error || !remote.data) return <div className={listStyles.tabBody}><ListStateMessage error={remote.error ?? "Không tải được nhân công của kế hoạch."} onRetry={remote.reload} retryLabel="Tải lại nhân công" /></div>;
  return <Staffing plan={plan} staffing={remote.data} access={access} />;
}

function Staffing({ plan, staffing, access }: { plan: PlanView; staffing: PlanStaffing; access: PlanAccess }) {
  const { notify } = useToast();
  const [lines, setLines] = useState(staffing.lines), [draft, setDraft] = useState<Record<string, string[]>>({});
  const [editing, setEditing] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  const editable = (line: StaffingLine) => line.canEdit && access.staff;
  const canEdit = lines.some(editable);
  const changed = (line: StaffingLine) => editable(line) && !same(draft[line.lineId] ?? ids(line), ids(line));

  function start() {
    setError(undefined);
    setDraft(Object.fromEntries(lines.filter(editable).map((line) => [line.lineId, ids(line)])));
    setEditing(true);
  }
  function stop() { setEditing(false); setError(undefined); setDraft({}); }
  async function save() {
    setPending(true); setError(undefined);
    let current = lines;
    for (const line of lines.filter(changed)) {
      const result = await planRepository.saveStaffing(plan.id, line.lineId, draft[line.lineId], staffing.rowVersion);
      if (result.status !== "success") {
        // The lines saved before this one stay saved: show them as they are now, and keep what was chosen for the rest.
        setPending(false); setError(`Bè ${line.raftCode}: ${staffingErrorText(result)}`);
        return;
      }
      current = current.map((row) => row.lineId === line.lineId ? result.data : row);
      setLines(current);
    }
    setPending(false); setEditing(false); setDraft({});
    notify({ tone: "success", title: `Đã lưu nhân công của ${plan.code}.` });
  }

  const note = canEdit ? undefined : closedNote(plan, staffing);
  return <div className={listStyles.tabBody}>
    {!lines.length ? <p className="text-sm text-text-muted">Kế hoạch chưa có dòng nào để chọn nhân công.</p>
      : <div className="space-y-3">{lines.map((line) => <section key={line.lineId} aria-label={`Nhân công bè ${line.raftCode}`} className="space-y-2 rounded-card border border-border p-3">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h4 className="font-medium"><Link className="text-primary underline" href={farmingReferenceHref("raft", { zoneId: line.zoneId, recordId: line.raftId, search: line.raftCode })}>{line.raftCode}</Link></h4>
          <span className="text-sm text-text-muted">Vùng {line.zoneCode} · Luống {line.laneNumbers.join(", ") || "—"} · Ngày {viDate(line.plannedDate)}</span>
        </header>
        {editing && editable(line)
          ? <RecordCrewPicker label={`Nhân viên bè ${line.raftCode}`} raftId={line.raftId} zoneId={line.zoneId} day={line.plannedDate}
              values={draft[line.lineId] ?? ids(line)} locked={line.employees.filter((employee) => employee.checkedIn).map((employee) => employee.employeeId)}
              onChange={(values) => setDraft((current) => ({ ...current, [line.lineId]: values }))} />
          : line.employees.length
            ? <ul className="flex flex-wrap gap-2">{line.employees.map((employee) => {
              const href = employeeLink(employee.employeeId);
              return <li key={employee.assignmentId} className="flex items-center gap-2 rounded-control border border-border px-2 py-1 text-sm">
                {href ? <Link className="text-primary underline" href={href}>{employee.name}</Link> : employee.name}
                {employee.code && <small className="text-text-muted">{employee.code}</small>}
                {employee.checkedIn && <StatusPill tone="success">Đã điểm danh</StatusPill>}
              </li>;
            })}</ul>
            : <p className="text-sm text-text-muted">Chưa chọn nhân công cho bè này.</p>}
      </section>)}</div>}
    {note && <p className="mt-3 text-sm text-text-muted">{note}</p>}
    <ErrorNotice error={error} />
    {canEdit && <footer className={listStyles.tabFooter}>
      <div />
      <div>{editing
        ? <><Button key="cancel-staffing" className="w-auto" type="button" variant="secondary" disabled={pending} onClick={stop}>Bỏ qua</Button>
          <Button key="save-staffing" className="w-auto" type="button" isPending={pending} pendingLabel="Đang lưu..." disabled={!lines.some(changed)} onClick={() => void save()}>Lưu</Button></>
        : <Button key="edit-staffing" className="w-auto" type="button" onClick={start}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>}</div>
    </footer>}
  </div>;
}

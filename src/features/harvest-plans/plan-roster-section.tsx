"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice } from "@/features/operations/ui";
import type { PlanRoster, PlanView } from "./contracts";
import type { PlanAccess } from "./plan-access";
import { PlanRosterExternalDialog, type ExternalForm } from "./plan-roster-external-dialog";
import { PlanRosterInviteDialog } from "./plan-roster-invite-dialog";
import { planIsOver } from "./plan-roster-logic";
import { PlanRosterSummary } from "./plan-roster-summary";
import { PlanRosterTable } from "./plan-roster-table";
import { planRepository, rosterErrorText, type Result } from "./repository";
import { usePlanRoster } from "./use-plan-roster";

const clock = (date: Date) => date.toLocaleTimeString("vi-VN", { hour12: false });

/**
 * The people of a plan: the number needed, how many confirmed, who was chosen and what each answered. Refreshes every 5 seconds while the page is visible, so the Owner watches the
 * confirmations come in. Everything here warns and never blocks: a shortage is an amber line, starting to harvest short stays allowed.
 */
export function PlanRosterSection({ plan, access, onRoster }: { plan: PlanView; access: PlanAccess; onRoster?(roster: PlanRoster): void }) {
  const over = planIsOver(plan.statusId), { notify } = useToast(), confirmation = useActionDialog();
  const live = usePlanRoster(plan.id, !over), { roster } = live;
  const [pending, setPending] = useState(false), [busyId, setBusyId] = useState<string>(), [error, setError] = useState<string>();
  const [dialog, setDialog] = useState<"invite" | "external">(), [dialogError, setDialogError] = useState<string>(), [conflict, setConflict] = useState<{ employeeId: string; text: string }>();
  const [accountNote, setAccountNote] = useState<{ tone: "info" | "warning"; text: string }>();
  const can = !!roster?.canEdit && access.harvest && !over;
  const day = plan.plannedAt.slice(0, 10);

  /** Runs one change; a roster answer replaces the screen at once and is not announced as news. */
  async function run<T extends PlanRoster | { roster: PlanRoster }>(work: () => Promise<Result<T>>, done?: string): Promise<{ value?: T; failure?: Result<T> }> {
    setPending(true); setError(undefined);
    const result = await work();
    setPending(false);
    if (result.status !== "success") return { failure: result };
    const next: PlanRoster = "people" in result.data ? result.data : result.data.roster;
    live.accept(next); onRoster?.(next);
    if (done) notify({ tone: "success", title: done });
    return { value: result.data };
  }

  async function saveRequired(value: number | null) {
    const { failure } = await run(() => planRepository.setRequired(plan.id, value, plan.rowVersion), "Đã lưu số người cần.");
    return failure ? rosterErrorText(failure) : undefined;
  }
  async function invite(ids: string[]) {
    setDialogError(undefined);
    const { failure } = await run(() => planRepository.invite(plan.id, ids), "Đã mời nhân viên. Họ sẽ xác nhận trên ứng dụng.");
    if (failure) setDialogError(rosterErrorText(failure)); else setDialog(undefined);
  }
  async function addExternal(form: ExternalForm) {
    setDialogError(undefined); setConflict(undefined);
    const { value, failure } = await run(() => planRepository.addExternal(plan.id, form));
    if (failure) {
      if (failure.status === "error" && failure.code === "MSG-LABOR-03" && failure.problem?.existingId) {
        setConflict({ employeeId: failure.problem.existingId, text: failure.problem.message ?? "Số điện thoại này đã thuộc về một nhân viên đang làm việc." });
      } else setDialogError(rosterErrorText(failure));
      return;
    }
    setDialog(undefined);
    if (value?.accountNote) setAccountNote({ tone: "warning", text: "Đã thêm người này nhưng chưa tạo được tài khoản: số điện thoại hoặc tên đăng nhập đã có tài khoản khác." });
    else if (value?.fixedPassword) setAccountNote({ tone: "info", text: `Đã tạo tài khoản thời vụ cho ${value.person.name}. Mật khẩu mặc định của hợp tác xã, họ phải đổi ở lần đăng nhập đầu.` });
    notify({ tone: "success", title: `Đã bổ sung ${value?.person.name ?? "nhân công"}.` });
  }
  async function confirmFor(id: string, name: string) {
    const reason = await confirmation.prompt(`Xác nhận thay ${name}? Nhập lý do, ví dụ đã gọi điện và họ đồng ý.`);
    if (!reason) return;
    setBusyId(id);
    const { failure } = await run(() => planRepository.confirmStaff(plan.id, id, reason), `Đã xác nhận thay ${name}.`);
    setBusyId(undefined);
    if (failure) setError(rosterErrorText(failure));
  }
  async function remove(id: string, name: string) {
    if (!(await confirmation.confirm(`Gỡ ${name} khỏi kế hoạch này?`))) return;
    setBusyId(id);
    const { failure } = await run(() => planRepository.removeStaff(plan.id, id), `Đã gỡ ${name}.`);
    setBusyId(undefined);
    if (failure) setError(rosterErrorText(failure));
  }

  if (live.loading) return <div role="status" aria-label="Đang tải nhân công" className="omts-skeleton h-24 rounded-control" />;
  if (!roster) return <div role="alert" className="rounded-control border border-border p-4 text-sm">{live.error ?? "Không tải được danh sách nhân công."} <Button className="ml-2 w-auto" variant="secondary" onClick={() => void live.refresh()}>Làm mới</Button></div>;

  return <section aria-label="Người thu hoạch của kế hoạch" className="space-y-3">{confirmation.dialog}
    {dialog === "invite" && <PlanRosterInviteDialog day={day} zoneIds={plan.lines.map((line) => line.zone.id)} onRoster={roster.people.map((person) => person.employeeId)} preselected={conflict ? [conflict.employeeId] : []} pending={pending} error={dialogError}
      onInvite={(ids) => void invite(ids)} onClose={() => { setDialog(undefined); setDialogError(undefined); }} />}
    {dialog === "external" && <PlanRosterExternalDialog zoneManager={!access.owner} pending={pending} error={dialogError} conflict={conflict} onSubmit={(form) => void addExternal(form)}
      onInviteConflict={() => setDialog("invite")} onClose={() => { setDialog(undefined); setDialogError(undefined); setConflict(undefined); }} />}
    <PlanRosterSummary roster={roster} canEdit={can} pending={pending} onSave={saveRequired} />
    {live.news.length > 0 && <div role="status" className="flex items-center justify-between gap-3 rounded-control border border-info/40 bg-info-soft p-3 text-sm">
      <span>{live.news.join(". ")}.</span><button type="button" className="font-medium underline underline-offset-4" onClick={live.dismissNews}>Đã xem</button></div>}
    {accountNote && <p role="status" className={`rounded-control border p-3 text-sm ${accountNote.tone === "warning" ? "border-warning/40 bg-warning-soft" : "border-border"}`}>{accountNote.text}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        {can && <Button className="w-auto" onClick={() => { setConflict(undefined); setDialog("invite"); }}>Mời nhân viên</Button>}
        {can && <Button className="w-auto" variant="secondary" onClick={() => { setConflict(undefined); setDialog("external"); }}>Bổ sung nhân công</Button>}
      </div>
      <p className="flex items-center gap-2 text-xs text-text-muted">
        {live.updatedAt && <span>Cập nhật lúc {clock(live.updatedAt)}</span>}
        {live.error && <span className="text-warning">Chưa cập nhật được, sẽ thử lại.</span>}
        <Button className="w-auto" variant="ghost" onClick={() => void live.refresh()}>Làm mới</Button>
      </p>
    </div>
    <ErrorNotice error={error} />
    <PlanRosterTable people={roster.people} canEdit={can} busyId={busyId} onConfirm={(person) => void confirmFor(person.id, person.name)} onRemove={(person) => void remove(person.id, person.name)} />
    {over && <p className="text-sm text-text-muted">Kế hoạch đã xong nên danh sách này chỉ để xem.</p>}
  </section>;
}

"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { HelpLink } from "@/components/ui/management-screen/management-layout";
import { businessTime, ErrorNotice, Field, Note } from "@/features/operations/ui";
import type { AttendanceStep, TodayCrew } from "./attendance-today-model";
import { MAX_TODAY_BATCH, type AttendanceTodayActions } from "./use-attendance-today-actions";

/** Only the existing crew-start contract asks for a reason. Staff bulk attendance keeps its current-time flow. */
export function AttendanceCrewDialog({ group, step, actions, onClose }: {
  group: TodayCrew; step: AttendanceStep; actions: AttendanceTodayActions; onClose(): void;
}) {
  const requiresReason = step === "check-in" && group.people[0]?.source === "assignment";
  const [time, setTime] = useState(() => businessTime().slice(11, 16));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const limit = requiresReason ? 100 : MAX_TODAY_BATCH;
  async function save() {
    if (requiresReason && (!reason.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || time > businessTime().slice(11, 16))) {
      setError("Nhập lý do và giờ bắt đầu hợp lệ, không muộn hơn hiện tại."); return;
    }
    setError(undefined);
    const saved = await actions.record(group.people, step, group.key, requiresReason ? { time, reason } : undefined);
    // A per-person batch may partially succeed: close its stale snapshot and report outcomes on the refreshed board.
    if (saved || !requiresReason) onClose();
  }
  return <Dialog open title={step === "check-in" ? "Vào làm cả tổ" : "Ra về cả tổ"} mobileLayout="compact" dismissible={!actions.pending} onOpenChange={open => { if (!open) onClose(); }}>
    <div className="flex items-center justify-between gap-3"><strong>{group.label}</strong><HelpLink /></div>
    <p className="my-3 text-sm">Ghi {step === "check-in" ? "vào làm" : "ra về"} cho {Math.min(group.people.length, limit)} người{requiresReason ? ". Thao tác được ghi vào nhật ký." : " lúc hiện tại."}</p>
    {group.people.length > limit && <p role="status">Mỗi lần tối đa {limit} người. Tiếp tục với những người còn lại sau khi đối chiếu kết quả.</p>}
    <ul className="mb-3 max-h-36 overflow-auto text-sm">{group.people.slice(0, limit).map(row => <li key={row.key}>{row.name}</li>)}</ul>
    <ErrorNotice error={error || actions.error} />
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      {requiresReason && <fieldset disabled={actions.pending || actions.blocked} className="grid gap-3">
        <Field label="Giờ bắt đầu *" type="time" required value={time} onChange={event => setTime(event.target.value)} />
        <Note label="Lý do vào làm cả tổ *" required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} />
      </fieldset>}
      {actions.blocked && <p role="alert">Hãy đóng hộp thoại và tải lại để đối chiếu kết quả trước khi ghi tiếp.</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="secondary" className="w-auto" disabled={actions.pending} onClick={onClose}>Bỏ qua</Button>
        <Button type="submit" className="w-auto" disabled={actions.blocked} isPending={actions.pending}>Xác nhận {step === "check-in" ? "vào làm" : "ra về"}</Button>
      </div>
    </form>
  </Dialog>;
}

"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Field, Note } from "@/features/operations/ui";

export type ExternalForm = { fullName: string; phoneNumber: string; note?: string; address?: string; ownerApproved?: boolean };

/**
 * "Bổ sung nhân công": a person hired outside the system, counted at once with no confirmation. Name and phone are required; a zone manager also ticks that the Owner agreed.
 * When the phone belongs to a working employee the API names them (`conflict`): the dialog offers to invite that employee instead.
 */
export function PlanRosterExternalDialog({ zoneManager, pending, error, conflict, onSubmit, onInviteConflict, onClose }: {
  zoneManager: boolean; pending: boolean; error?: string; conflict?: { employeeId: string; text: string }; onSubmit(form: ExternalForm): void; onInviteConflict(employeeId: string): void; onClose(): void;
}) {
  const [fullName, setFullName] = useState(""), [phone, setPhone] = useState(""), [note, setNote] = useState(""), [address, setAddress] = useState(""), [approved, setApproved] = useState(false);
  const [problem, setProblem] = useState<string>();

  function submit() {
    if (!fullName.trim()) return setProblem("Nhập họ tên.");
    if (!phone.trim()) return setProblem("Nhập số điện thoại.");
    if (zoneManager && !approved) return setProblem("Cần chủ đồng ý trước khi bổ sung người này.");
    setProblem(undefined);
    onSubmit({ fullName: fullName.trim(), phoneNumber: phone.trim(), ...(note.trim() ? { note: note.trim() } : {}), ...(address.trim() ? { address: address.trim() } : {}), ...(zoneManager ? { ownerApproved: approved } : {}) });
  }

  return <Dialog open title="Bổ sung nhân công" mobileLayout="fullscreen" onOpenChange={(open) => { if (!open) onClose(); }}>
    <p className="mb-3 text-sm text-text-muted">Người thuê ngoài hệ thống được tính đủ ngay, không cần họ xác nhận.</p>
    <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <Field label="Họ tên *" value={fullName} maxLength={200} onChange={(event) => setFullName(event.target.value)} autoFocus />
      <Field label="Số điện thoại *" type="tel" inputMode="tel" value={phone} maxLength={30} onChange={(event) => setPhone(event.target.value)} />
      <Note label="Ghi chú" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
      <Field label="Địa chỉ" value={address} maxLength={300} onChange={(event) => setAddress(event.target.value)} />
      {zoneManager && <label className="flex items-start gap-2 text-sm"><input className="omts-check" type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />Chủ đã đồng ý bổ sung người này</label>}
      <ErrorNotice error={problem ?? (conflict ? undefined : error)} />
      {conflict && <div role="alert" className="rounded-control border border-warning/40 bg-warning-soft p-3 text-sm">
        <p>{conflict.text}</p>
        <Button className="mt-2 w-auto" type="button" variant="secondary" onClick={() => onInviteConflict(conflict.employeeId)}>Mời nhân viên này</Button>
      </div>}
      <div className="mt-2 flex flex-wrap gap-3">
        <Button className="w-auto" type="submit" isPending={pending} pendingLabel="Đang thêm...">Bổ sung</Button>
        <Button className="w-auto" type="button" variant="secondary" disabled={pending} onClick={onClose}>Quay lại</Button>
      </div>
    </form>
  </Dialog>;
}

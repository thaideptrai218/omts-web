"use client";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmployeeTwoGroupPicker } from "@/features/employee-api/employee-two-group-picker";
import { createOperationsRepository } from "@/features/operations/repository";
import { workforceLookupsSchema } from "@/features/operations/new-module-contracts";
import { ErrorNotice, useRemote } from "@/features/operations/ui";

const workforce = createOperationsRepository("workforce");

/**
 * "Mời nhân viên": the two groups (nội bộ and thời vụ) side by side, listing the employees who are not on the roster yet. The chosen ones are invited and told in the mobile app.
 * `preselected` is used when the phone of a person added outside the system belongs to a working employee: that employee is ticked ready to invite.
 */
export function PlanRosterInviteDialog({ day, zoneIds, onRoster, preselected = [], pending, error, onInvite, onClose }: {
  day: string; zoneIds?: readonly string[]; onRoster: readonly string[]; preselected?: readonly string[]; pending: boolean; error?: string; onInvite(employeeIds: string[]): void; onClose(): void;
}) {
  const remote = useRemote(useCallback((signal: AbortSignal) => workforce.read("lookups", { day }, workforceLookupsSchema, signal), [day]));
  const [selected, setSelected] = useState<string[]>([...preselected]);
  const people = useMemo(() => (remote.data?.employees ?? []).filter((employee) => !onRoster.includes(employee.id))
    .map((employee) => ({ id: employee.id, name: employee.name, kind: employee.type, disabled: employee.onLeave, note: employee.onLeave ? <small className="block text-text-muted">Đang nghỉ phép</small> : undefined })), [remote.data, onRoster]);

  return <Dialog open title="Mời nhân viên" size="lg" mobileLayout="fullscreen" onOpenChange={(open) => { if (!open) onClose(); }}>
    {remote.loading ? <p role="status" className="text-sm text-text-muted">Đang tải danh sách nhân viên...</p>
      : remote.error ? <><ErrorNotice error={remote.error} /><Button className="mt-2 w-auto" variant="secondary" onClick={remote.reload}>Tải lại danh sách</Button></>
        : people.length ? <EmployeeTwoGroupPicker zoneIds={zoneIds} name="roster-invite" label="Nhân viên có thể mời" people={people} values={selected} onChange={setSelected} />
          : <p className="text-sm text-text-muted">Mọi nhân viên đều đã có trong danh sách của kế hoạch này.</p>}
    <ErrorNotice error={error} />
    <div className="mt-5 flex flex-wrap gap-3">
      <Button className="w-auto" isPending={pending} pendingLabel="Đang mời..." disabled={!selected.length} onClick={() => onInvite(selected)}>{selected.length ? `Mời ${selected.length} người` : "Mời"}</Button>
      <Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Quay lại</Button>
    </div>
  </Dialog>;
}

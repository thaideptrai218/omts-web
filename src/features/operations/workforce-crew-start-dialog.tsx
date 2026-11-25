"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmployeeTypeBadge } from "@/features/employee-api/employee-type-badge";
import { useEmployeeKinds } from "@/features/employee-api/use-employee-types";
import * as c from "./new-module-contracts";
import { ErrorNotice, Field, Note, Select, businessTime } from "./ui";
import { useOperationEditor } from "./use-operation-editor";
import * as w from "./workforce-contracts";
import { workforceRepository as repository, type Assignment } from "./workforce-shared";

type Group = { key: string; label: string; zoneId: string; raftId: string | null; members: Assignment[] };

/** The crews of today that can still start: assignments of a raft (or of a zone with no raft) with no check-in yet. */
function startableCrews(rows: readonly Assignment[], today: string, zoneName: (id: string) => string, allowed: (action: string, zoneId?: string) => boolean): Group[] {
  const groups = new Map<string, Group>();
  for (const row of rows) {
    if (row.date !== today || row.checkedInAt || row.checkedOutAt || !row.jobTypeId || row.onLeave || !allowed("AttendanceCreate", row.zoneId)) continue;
    const key = row.raftId ?? `zone:${row.zoneId}`;
    const group = groups.get(key) ?? { key, zoneId: row.zoneId, raftId: row.raftId, members: [], label: row.raftCode ? `Bè ${row.raftCode} · ${zoneName(row.zoneId)}` : `${zoneName(row.zoneId)} (làm ở vùng, không có bè)` };
    group.members.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

/** "Vào làm cả tổ": one start time and one reason for the chosen members of a raft; every member gets the same check-in time. */
export function CrewStartDialog({ rows, today, zoneName, allowed, onClose, onSaved }: {
  rows: readonly Assignment[]; today: string; zoneName(id: string): string; allowed(action: string, zoneId?: string): boolean; onClose(): void; onSaved(count: number): void;
}) {
  const crews = useMemo(() => startableCrews(rows, today, zoneName, allowed), [rows, today, zoneName, allowed]);
  const [groupKey, setGroupKey] = useState(""), [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [time, setTime] = useState(() => businessTime().slice(11, 16)), [reason, setReason] = useState(""), [problem, setProblem] = useState<string>();
  const editor = useOperationEditor(onClose, !!groupKey || !!reason);
  const group = crews.find((item) => item.key === groupKey), kindOf = useEmployeeKinds();

  function pick(key: string) {
    setGroupKey(key);
    setTicked(new Set(crews.find((item) => item.key === key)?.members.map((member) => member.employeeId) ?? []));
  }
  async function save() {
    if (!group) return setProblem("Chọn tổ cần vào làm.");
    const employeeIds = group.members.filter((member) => ticked.has(member.employeeId)).map((member) => member.employeeId);
    if (time > businessTime().slice(11, 16)) return setProblem("Giờ bắt đầu không được muộn hơn hiện tại.");
    const payload = w.crewStartSchema.safeParse({ ...(group.raftId ? { raftId: group.raftId } : { zoneId: group.zoneId }), startTime: time, reason, employeeIds });
    if (!payload.success) return setProblem("Chọn ít nhất một nhân viên, nhập giờ bắt đầu hợp lệ và lý do.");
    setProblem(undefined);
    const result = await editor.submit(`Ghi vào làm lúc ${time} cho ${employeeIds.length} nhân viên của ${group.label}? Thao tác này được ghi vào nhật ký.`,
      () => repository.write("crew-start", payload.data, z.array(c.assignmentSchema), undefined, group.zoneId));
    if (result) onSaved(result.length);
  }

  return <Dialog open size="md" mobileLayout="compact" title="Vào làm cả tổ" dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>
    {editor.dialog}
    <ErrorNotice error={problem ?? editor.mutation.error} />
    {!crews.length ? <p>Hôm nay chưa có tổ nào còn chờ vào làm. Tạo phân công trước, hoặc nhân viên đã vào làm rồi.</p>
      : <form onSubmit={(event) => { event.preventDefault(); void save(); }} noValidate>
        <fieldset disabled={editor.disabled} className="grid gap-3">
          <Select label="Tổ (bè hoặc vùng) *" value={groupKey} onChange={(event) => pick(event.target.value)}>
            <option value="">Chọn tổ</option>
            {crews.map((item) => <option key={item.key} value={item.key}>{item.label} · {item.members.length} người</option>)}
          </Select>
          {group && <fieldset className="max-h-56 overflow-auto rounded-control border border-border p-3">
            <legend>Thành viên vào làm ({ticked.size}/{group.members.length})</legend>
            {group.members.map((member) => <label key={member.id} className="flex gap-3 py-1.5">
              <input type="checkbox" checked={ticked.has(member.employeeId)} onChange={(event) => setTicked((current) => { const next = new Set(current); if (event.target.checked) next.add(member.employeeId); else next.delete(member.employeeId); return next; })} />
              <span className="min-w-0">{member.employeeName}<EmployeeTypeBadge type={kindOf(member.employeeId)} className="ml-1.5" /> · {member.job}</span>
            </label>)}
          </fieldset>}
          <Field label="Giờ bắt đầu *" type="time" required value={time} onChange={(event) => setTime(event.target.value)} />
          <Note label="Lý do vào làm cả tổ *" required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
        </fieldset>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" className="w-auto" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
          <Button type="submit" className="w-auto" isPending={editor.pending}>Vào làm</Button>
        </div>
      </form>}
  </Dialog>;
}

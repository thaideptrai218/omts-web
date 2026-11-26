"use client";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { EmployeeTypeBadge } from "@/features/employee-api/employee-type-badge";
import { viDateTime } from "@/features/purchase-documents/document-parts";
import docStyles from "@/features/purchase-documents/purchases.module.css";
import type { RosterPerson } from "./contracts";
import { rosterStateLabel, rosterStateOrder, rosterStateTone } from "./plan-roster-logic";

const sorted = (people: readonly RosterPerson[]) => [...people].sort((a, b) => rosterStateOrder.indexOf(a.state) - rosterStateOrder.indexOf(b.state) || a.name.localeCompare(b.name, "vi"));

/** The people chosen for the plan, those who owe an answer first. Each row can be confirmed for the person or taken off while the roster can still change. */
export function PlanRosterTable({ people, canEdit, busyId, onConfirm, onRemove }: {
  people: readonly RosterPerson[]; canEdit: boolean; busyId?: string; onConfirm(person: RosterPerson): void; onRemove(person: RosterPerson): void;
}) {
  if (!people.length) return <p className="rounded-control border border-dashed border-border p-4 text-sm text-text-muted">Chưa chọn ai cho kế hoạch này. Bấm Mời nhân viên để chọn người, hoặc Bổ sung nhân công cho người ngoài hệ thống.</p>;
  return <div className={docStyles.innerScroll}><table className={docStyles.inner} aria-label="Nhân công của kế hoạch">
    <thead><tr><th>Họ tên</th><th>Số điện thoại</th><th>Trạng thái</th><th>Trả lời lúc</th>{canEdit && <th><span className="sr-only">Thao tác</span></th>}</tr></thead>
    <tbody>{sorted(people).map((person) => {
      const detail = person.state === "ConfirmedManually" ? [person.confirmedBy && `bởi ${person.confirmedBy}`, person.reason].filter(Boolean).join(": ") : person.reason;
      return <tr key={person.id}>
        <td><span className="inline-flex flex-wrap items-center gap-1.5">{person.name}<EmployeeTypeBadge type={person.type} /></span>{person.code && <span className={docStyles.sub}>{person.code}</span>}</td>
        <td>{person.phoneNumber || "—"}</td>
        <td><StatusPill tone={rosterStateTone[person.state]}>{rosterStateLabel[person.state]}</StatusPill>{detail && <span className={docStyles.sub} title={detail}>{detail}</span>}</td>
        <td>{person.respondedAt ? viDateTime(person.respondedAt) : "—"}</td>
        {canEdit && <td><span className="inline-flex flex-wrap gap-2">
          {(person.state === "Invited" || person.state === "Declined") && <Button className="w-auto" variant="secondary" disabled={busyId === person.id} onClick={() => onConfirm(person)}>Xác nhận thay</Button>}
          <Button className="w-auto" variant="ghost" disabled={busyId === person.id} aria-label={`Gỡ ${person.name}`} onClick={() => onRemove(person)}>Gỡ</Button>
        </span></td>}
      </tr>;
    })}</tbody>
  </table></div>;
}

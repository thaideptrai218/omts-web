"use client";
import { Fragment, useState } from "react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/management-page";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { managementStyles, SortableHeader } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { YieldGroup } from "./contracts";
import type { Sort, SortKey } from "./yield-logic";
import { YieldLotsTable } from "./yield-lots-table";
import { cagesOrDash, kgOrDash, YieldTargetCell } from "./yield-target-cell";
import s from "./yield-screen.module.css";

type Column = { key?: SortKey; label: string; num?: boolean };
const columns: Column[] = [
  { key: "label", label: "Nhóm" }, { key: "lotCount", label: "Số lô", num: true }, { label: "Số lồng", num: true },
  { key: "estimatedKg", label: "Kg ước tính", num: true }, { label: "So với mục tiêu" },
  { key: "soldKg", label: "Đã bán", num: true }, { key: "remainingKg", label: "Còn để bán", num: true },
];

type Props = { groups: YieldGroup[]; sort: Sort; showZone: boolean; linkedRecordId?: string; onSort(key: SortKey): void };

/** Bảng nhóm có sắp xếp theo cột và dòng mở rộng xem các lô; trạng thái mở/đóng đọc được qua aria-expanded. */
export function YieldTable({ groups, sort, showZone, linkedRecordId, onSort }: Props) {
  const [open, setOpen] = useState<string | undefined>(() => groups.find(group => group.key === linkedRecordId || group.lots.some(lot => lot.id === linkedRecordId))?.key);
  const toggle = (key: string) => setOpen(current => current === key ? undefined : key);
  return (
    <div className={s.tableFrame}>
      <table className={s.table}>
        <caption className={s.srOnly}>Sản lượng thu hoạch theo nhóm</caption>
        <thead><tr>
          {columns.map(c => c.key
            ? <SortableHeader key={c.label} label={c.label} sortKey={c.key} sort={{ key: sort.key, direction: sort.dir }} onSort={() => onSort(c.key!)} className={c.num ? s.num : undefined} />
            : <th key={c.label} scope="col" className={c.num ? s.num : undefined}>{c.label}</th>)}
          <th scope="col">Trạng thái số liệu</th>
        </tr></thead>
        <tbody>
          {groups.map((g) => {
            const expanded = open === g.key, detailId = `lots-${g.key}`;
            return (
              <Fragment key={g.key}>
                <OpenableTableRow className={expanded ? s.rowOpen : undefined} data-selected={expanded || undefined} onOpen={() => toggle(g.key)}>
                  <th scope="row" className={s.rowHead}>
                    <button type="button" className={s.expand} aria-label={`${expanded ? "Thu gọn" : "Mở"} nhóm ${g.label}`} aria-expanded={expanded} aria-controls={detailId} onClick={() => toggle(g.key)}>
                      <InterfaceIcon name={expanded ? "chevron-down" : "chevron-right"} />
                    </button>
                    <Link className="ml-2 text-primary underline" href={g.raftId ? farmingReferenceHref("raft", { zoneId: g.zoneId, recordId: g.raftId, search: g.raftCode }) : farmingReferenceHref("zone", { recordId: g.zoneId, search: g.zoneCode })}>{g.label}</Link>
                    {g.cycleId && <Link className="ml-2 text-primary underline" href={farmingReferenceHref("cycle", { zoneId: g.zoneId, raftId: g.raftId, cycleId: g.cycleId })}>Chu kỳ {g.cycleStartDate ? formatVietnameseDate(g.cycleStartDate) : ""}</Link>}
                    {showZone && <Link className={`ml-2 ${s.muted} underline`} href={farmingReferenceHref("zone", { recordId: g.zoneId, search: g.zoneCode })}>{g.zoneCode}</Link>}
                    {g.cycleStatus === "Open" && <span className={s.muted}> · chu kỳ đang nuôi</span>}
                  </th>
                  <td className={s.num}>{g.lotCount}</td>
                  <td className={s.num}>{cagesOrDash(g.harvestedCages)}</td>
                  <td className={s.num}>{kgOrDash(g.estimatedKg)}</td>
                  <td><YieldTargetCell harvestedKg={g.estimatedKg} targetKg={g.targetYieldKg} /></td>
                  <td className={s.num}>{kgOrDash(g.soldKg)}</td>
                  <td className={s.num}>{kgOrDash(g.availableKg)}</td>
                  <td>{g.notFinal ? <StatusPill>Chưa chốt</StatusPill> : <span className={s.muted}>Đã chốt</span>}</td>
                </OpenableTableRow>
                {expanded && <tr id={detailId} className={s.detail}><td colSpan={columns.length + 1}><div className={`${managementStyles.viewWidth} max-w-full overflow-x-auto`}><YieldLotsTable lots={g.lots} /></div></td></tr>}
              </Fragment>);
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";
import { Fragment, useState, type ReactNode } from "react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/management-page";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { SortableHeader } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { allColumnKeys, yieldColumns, type ColumnKey } from "./yield-columns";
import { YieldGroupDetail } from "./yield-group-detail";
import { formatKg, type Sort, type SortKey } from "./yield-logic";
import { cagesOrDash, kgOrDash, YieldTargetCell } from "./yield-target-cell";
import { daysToLastOf, kgPerCageOf, lastHarvestOf, type YieldRow } from "./yield-rows";
import type { Kpis } from "./yield-summary-model";
import s from "./yield-screen.module.css";

type Props = {
  groups: YieldRow[]; sort: Sort; showZone: boolean; linkedRecordId?: string; visible?: readonly string[]; totals?: Kpis;
  onSort(key: SortKey): void;
};

const perCage = (value: number | null) => value == null ? "—" : `${formatKg(Math.round(value * 10) / 10)} kg/lồng`;

function StatusCell({ row }: { row: YieldRow }) {
  const cycle = row.cycleStatus === "Open" ? "Đang mở" : row.cycleStatus === "Closed" ? "Đã đóng" : null;
  if (!cycle && !row.notFinal) return <span className={s.muted}>Đã chốt</span>;
  return <span className={s.statusCell}>{cycle && <span>{cycle}</span>}{row.notFinal && <StatusPill>Chưa chốt</StatusPill>}</span>;
}

/** Bảng nhóm: cột chọn được, sắp xếp theo cột, dòng tổng và dòng mở rộng xem lô ngay tại chỗ (aria-expanded). */
export function YieldTable({ groups, sort, showZone, linkedRecordId, visible = allColumnKeys, totals, onSort }: Props) {
  const [open, setOpen] = useState<string | undefined>(() => groups.find(group => group.key === linkedRecordId || group.lots.some(lot => lot.id === linkedRecordId))?.key);
  const toggle = (key: string) => setOpen(current => current === key ? undefined : key);
  const columns = yieldColumns.filter(column => visible.includes(column.key));
  const cells = (row: YieldRow): Record<ColumnKey, ReactNode> => {
    const last = lastHarvestOf(row), days = daysToLastOf(row);
    return {
      lotCount: row.lotCount, cages: cagesOrDash(row.harvestedCages), estimatedKg: kgOrDash(row.estimatedKg), kgPerCage: perCage(kgPerCageOf(row)),
      target: <YieldTargetCell harvestedKg={row.targetedKg ?? row.estimatedKg} targetKg={row.targetYieldKg} />,
      soldKg: kgOrDash(row.soldKg), remainingKg: kgOrDash(row.availableKg), lastHarvest: last ? formatVietnameseDate(last) : "—",
      daysToLast: days == null ? "—" : `${days} ngày`, status: <StatusCell row={row} />,
      nurseryQuantityIn: row.nurseryQuantityIn == null ? "—" : formatKg(row.nurseryQuantityIn),
      nurseryLossPieces: row.nurseryLossPieces == null ? "—" : `${formatKg(row.nurseryLossPieces)} mảnh${row.nurseryLossPercent == null ? "" : ` · ${formatKg(row.nurseryLossPercent)}%`}`,
    };
  };
  const totalCells: Partial<Record<ColumnKey, ReactNode>> | undefined = totals && {
    lotCount: totals.lots, cages: cagesOrDash(totals.cages), estimatedKg: kgOrDash(totals.kg), kgPerCage: perCage(totals.kgPerCage),
    target: totals.targetPct == null ? "—" : `${totals.targetPct}%`, soldKg: kgOrDash(totals.soldKg), remainingKg: kgOrDash(totals.remainingKg),
  };
  return (
    <div className={s.tableFrame}>
      <table className={s.table}>
        <caption className={s.srOnly}>Sản lượng thu hoạch theo nhóm</caption>
        <thead><tr>
          <SortableHeader label="Nhóm" sortKey="label" sort={{ key: sort.key, direction: sort.dir }} onSort={() => onSort("label")} />
          {columns.map(c => c.sort
            ? <SortableHeader key={c.key} label={c.label} sortKey={c.sort} sort={{ key: sort.key, direction: sort.dir }} onSort={() => onSort(c.sort!)} className={c.num ? s.num : undefined} />
            : <th key={c.key} scope="col" className={c.num ? s.num : undefined}>{c.label}</th>)}
        </tr></thead>
        <tbody>
          {groups.map((g) => {
            const expanded = open === g.key, detailId = `lots-${g.key}`, values = cells(g);
            return (
              <Fragment key={g.key}>
                <OpenableTableRow className={expanded ? s.rowOpen : undefined} data-selected={expanded || undefined} onOpen={() => toggle(g.key)}>
                  <th scope="row" className={s.rowHead}>
                    <button type="button" className={s.expand} aria-label={`${expanded ? "Thu gọn" : "Mở"} nhóm ${g.label}`} aria-expanded={expanded} aria-controls={detailId} onClick={() => toggle(g.key)}>
                      <InterfaceIcon name={expanded ? "chevron-down" : "chevron-right"} />
                    </button>
                    {g.zoneId
                      ? <Link className="ml-2 text-primary underline" href={g.raftId ? farmingReferenceHref("raft", { zoneId: g.zoneId, recordId: g.raftId, search: g.raftCode }) : farmingReferenceHref("zone", { recordId: g.zoneId, search: g.zoneCode })}>{g.label}</Link>
                      : <span className="ml-2">{g.label}</span>}
                    {g.cycleId && <Link className="ml-2 text-primary underline" href={farmingReferenceHref("cycle", { zoneId: g.zoneId, raftId: g.raftId, cycleId: g.cycleId })}>Chu kỳ {g.cycleStartDate ? formatVietnameseDate(g.cycleStartDate) : ""}</Link>}
                    {showZone && g.zoneId && <Link className={`ml-2 ${s.muted} underline`} href={farmingReferenceHref("zone", { recordId: g.zoneId, search: g.zoneCode })}>{g.zoneCode}</Link>}
                  </th>
                  {columns.map(c => <td key={c.key} className={c.num ? s.num : undefined}>{values[c.key]}</td>)}
                </OpenableTableRow>
                {expanded && <tr id={detailId} className={s.detail}><td colSpan={columns.length + 1}><YieldGroupDetail group={g} /></td></tr>}
              </Fragment>);
          })}
        </tbody>
        {totalCells && <tfoot><tr className={s.totalRow}>
          <th scope="row">Tổng (mọi nhóm đang lọc)</th>
          {columns.map(c => <td key={c.key} className={c.num ? s.num : undefined}>{totalCells[c.key] ?? ""}</td>)}
        </tr></tfoot>}
      </table>
    </div>
  );
}

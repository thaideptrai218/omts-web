"use client";
import { Fragment, useState } from "react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/management-page";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { YieldGroup, YieldLot } from "./contracts";
import { differenceNote, type Sort, type SortKey } from "./yield-logic";
import { YieldQuantity } from "./yield-quantity";
import s from "./yield-screen.module.css";

const columns: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "label", label: "Nhóm" }, { key: "lotCount", label: "Số lô", num: true }, { key: "estimatedKg", label: "Ước tính", num: true },
  { key: "soldKg", label: "Đã bán", num: true }, { key: "lostKg", label: "Hao hụt", num: true }, { key: "differenceKg", label: "Chênh lệch", num: true },
];
const lotStatus: Record<string, string> = { Open: "Đang bán", Reopened: "Mở lại", Closed: "Đã chốt" };

function Difference({ value, kgPerCage }: { value: number; kgPerCage?: number }) {
  // Âm = bán vượt ước tính; ngoài màu còn có dấu và chú thích ẩn cho trình đọc màn hình.
  return <span className={value < 0 ? s.over : undefined}><YieldQuantity kg={value} kgPerCage={kgPerCage} /><span className={s.srOnly}>. {differenceNote(value)}</span></span>;
}
function Lots({ lots, kgPerCage }: { lots: YieldLot[]; kgPerCage?: number }) {
  const q = (kg: number) => <YieldQuantity kg={kg} kgPerCage={kgPerCage} />;
  return (
    <table className={s.lots}>
      <caption className={s.srOnly}>Các lô của nhóm</caption>
      <thead><tr><th scope="col">Mã lô</th><th scope="col">Ngày thu hoạch</th><th scope="col">Trạng thái lô</th><th scope="col" className={s.num}>Ước tính</th><th scope="col" className={s.num}>Đã bán</th><th scope="col" className={s.num}>Hao hụt</th><th scope="col" className={s.num}>Chênh lệch</th></tr></thead>
      <tbody>{lots.map((lot) => (
        <tr key={lot.id}>
          <td className={s.code}>
            <Link
              className="text-primary underline underline-offset-4"
              href={`/operations/harvest?zoneId=${encodeURIComponent(lot.zoneId)}&raftId=${encodeURIComponent(lot.raftId)}`}
              aria-label={`Mở thu hoạch bè ${lot.raftCode} để xem lô ${lot.lotCode}`}
            >{lot.lotCode}</Link>
          </td>
          <td>{formatVietnameseDate(lot.harvestDate)}{!lot.inPeriod && <span className={s.muted}> · ngoài kỳ</span>}</td>
          <td>{lotStatus[lot.status] ?? lot.status}{lot.notFinal && <> <StatusPill>Chưa chốt</StatusPill></>}</td>
          <td className={s.num}>{q(lot.estimatedKg)}</td><td className={s.num}>{q(lot.soldKg)}</td><td className={s.num}>{q(lot.lostKg)}</td>
          <td className={s.num}><Difference value={lot.differenceKg} kgPerCage={kgPerCage} /></td>
        </tr>))}
      </tbody>
    </table>
  );
}

type Props = { groups: YieldGroup[]; sort: Sort; showZone: boolean; kgPerCage?: number; onSort(key: SortKey): void };

/** Bảng nhóm có sắp xếp theo cột và dòng mở rộng xem các lô; trạng thái mở/đóng đọc được qua aria-expanded. */
export function YieldTable({ groups, sort, showZone, kgPerCage, onSort }: Props) {
  const q = (kg: number) => <YieldQuantity kg={kg} kgPerCage={kgPerCage} />;
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) => setOpen((current) => { const next = new Set(current); if (!next.delete(key)) next.add(key); return next; });
  return (
    <div className={s.tableFrame}>
      <table className={s.table}>
        <caption className={s.srOnly}>Sản lượng thu hoạch theo nhóm</caption>
        <thead><tr>
          {columns.map((c) => (
            <th key={c.key} scope="col" className={c.num ? s.num : undefined} aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
              <button type="button" className={s.sortBtn} onClick={() => onSort(c.key)}>{c.label}<span aria-hidden="true">{sort.key === c.key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}</span></button>
            </th>))}
          <th scope="col">Trạng thái số liệu</th>
        </tr></thead>
        <tbody>
          {groups.map((g) => {
            const expanded = open.has(g.key), detailId = `lots-${g.key}`;
            return (
              <Fragment key={g.key}>
                <OpenableTableRow className={expanded ? s.rowOpen : undefined} data-selected={expanded || undefined} onOpen={() => toggle(g.key)}>
                  <th scope="row" className={s.rowHead}>
                    <button type="button" className={s.expand} aria-expanded={expanded} aria-controls={detailId} onClick={() => toggle(g.key)}>
                      <span aria-hidden="true">{expanded ? "▾" : "▸"}</span><span>{g.label}</span>
                    </button>
                    {showZone && <span className={s.muted}> · {g.zoneCode}</span>}
                    {g.cycleStatus === "Open" && <span className={s.muted}> · chu kỳ đang nuôi</span>}
                  </th>
                  <td className={s.num}>{g.lotCount}</td><td className={s.num}>{q(g.estimatedKg)}</td><td className={s.num}>{q(g.soldKg)}</td>
                  <td className={s.num}>{q(g.lostKg)}</td><td className={s.num}><Difference value={g.differenceKg} kgPerCage={kgPerCage} /></td>
                  <td>{g.notFinal ? <StatusPill>Chưa chốt</StatusPill> : <span className={s.muted}>Đã chốt</span>}</td>
                </OpenableTableRow>
                {expanded && <tr id={detailId} className={s.detail}><td colSpan={columns.length + 1}><Lots lots={g.lots} kgPerCage={kgPerCage} /></td></tr>}
              </Fragment>);
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";
import { Fragment, useState } from "react";
import { StatusPill } from "@/components/ui/management-page";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { YieldGroup, YieldLot } from "./contracts";
import { differenceNote, formatKg, type Sort, type SortKey } from "./yield-logic";
import s from "./yield-screen.module.css";

const columns: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "label", label: "Nhóm" }, { key: "lotCount", label: "Số lô", num: true }, { key: "estimatedKg", label: "kg ước tính", num: true },
  { key: "soldKg", label: "kg đã bán", num: true }, { key: "lostKg", label: "kg hao hụt", num: true }, { key: "differenceKg", label: "Chênh lệch (kg)", num: true },
];
const lotStatus: Record<string, string> = { Open: "Đang bán", Reopened: "Mở lại", Closed: "Đã chốt" };

function Difference({ value }: { value: number }) {
  // Âm = bán vượt ước tính; ngoài màu còn có dấu và chú thích ẩn cho trình đọc màn hình.
  return <span className={value < 0 ? s.over : undefined}>{formatKg(value)}<span className={s.srOnly}>. {differenceNote(value)}</span></span>;
}
function Lots({ lots }: { lots: YieldLot[] }) {
  return (
    <table className={s.lots}>
      <caption className={s.srOnly}>Các lô của nhóm</caption>
      <thead><tr><th scope="col">Mã lô</th><th scope="col">Ngày thu hoạch</th><th scope="col">Trạng thái lô</th><th scope="col" className={s.num}>kg ước tính</th><th scope="col" className={s.num}>kg đã bán</th><th scope="col" className={s.num}>kg hao hụt</th><th scope="col" className={s.num}>Chênh lệch (kg)</th></tr></thead>
      <tbody>{lots.map((lot) => (
        <tr key={lot.id}>
          <td className={s.code}>{lot.lotCode}</td>
          <td>{formatVietnameseDate(lot.harvestDate)}{!lot.inPeriod && <span className={s.muted}> · ngoài kỳ</span>}</td>
          <td>{lotStatus[lot.status] ?? lot.status}{lot.notFinal && <> <StatusPill>Chưa chốt</StatusPill></>}</td>
          <td className={s.num}>{formatKg(lot.estimatedKg)}</td><td className={s.num}>{formatKg(lot.soldKg)}</td><td className={s.num}>{formatKg(lot.lostKg)}</td>
          <td className={s.num}><Difference value={lot.differenceKg} /></td>
        </tr>))}
      </tbody>
    </table>
  );
}

type Props = { groups: YieldGroup[]; sort: Sort; showZone: boolean; onSort(key: SortKey): void };

/** Bảng nhóm có sắp xếp theo cột và dòng mở rộng xem các lô; trạng thái mở/đóng đọc được qua aria-expanded. */
export function YieldTable({ groups, sort, showZone, onSort }: Props) {
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
                <tr className={expanded ? s.rowOpen : undefined}>
                  <th scope="row" className={s.rowHead}>
                    <button type="button" className={s.expand} aria-expanded={expanded} aria-controls={detailId} onClick={() => toggle(g.key)}>
                      <span aria-hidden="true">{expanded ? "▾" : "▸"}</span><span>{g.label}</span>
                    </button>
                    {showZone && <span className={s.muted}> · {g.zoneCode}</span>}
                    {g.cycleStatus === "Open" && <span className={s.muted}> · chu kỳ đang nuôi</span>}
                  </th>
                  <td className={s.num}>{g.lotCount}</td><td className={s.num}>{formatKg(g.estimatedKg)}</td><td className={s.num}>{formatKg(g.soldKg)}</td>
                  <td className={s.num}>{formatKg(g.lostKg)}</td><td className={s.num}><Difference value={g.differenceKg} /></td>
                  <td>{g.notFinal ? <StatusPill>Chưa chốt</StatusPill> : <span className={s.muted}>Đã chốt</span>}</td>
                </tr>
                {expanded && <tr id={detailId} className={s.detail}><td colSpan={columns.length + 1}><Lots lots={g.lots} /></td></tr>}
              </Fragment>);
          })}
        </tbody>
      </table>
    </div>
  );
}

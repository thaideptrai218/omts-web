"use client";
import { useId, type ReactNode } from "react";
import s from "./report-live.module.css";

export type ReportTile = Readonly<{ label: string; value: string; hint?: string }>;

/** Ô chỉ số đầu báo cáo (Doanh thu, Số đơn...); giá trị đã định dạng sẵn. */
export function ReportTiles({ label, tiles }: Readonly<{ label: string; tiles: readonly ReportTile[] }>) {
  return (
    <dl className={s.tiles} aria-label={label}>
      {tiles.map((tile) => <div key={tile.label}><dt>{tile.label}</dt><dd>{tile.value}{tile.hint && <small>{tile.hint}</small>}</dd></div>)}
    </dl>
  );
}

/** Khối có tiêu đề h2 (thẻ trắng) cho biểu đồ/bảng; `actions` đặt bên phải tiêu đề. */
export function ReportCard({ title, actions, children }: Readonly<{ title: string; actions?: ReactNode; children: ReactNode }>) {
  const id = useId();
  return <section className={s.card} aria-labelledby={id}><div className={s.cardHead}><h2 id={id}>{title}</h2>{actions}</div>{children}</section>;
}

export type ReportColumn<R> = Readonly<{
  key: string; header: string; numeric?: boolean;
  cell(row: R): ReactNode;
  /** Ô của dòng tổng cuối bảng; bỏ trống thì để trống. */
  total?: ReactNode;
}>;

type ReportTableProps<R> = Readonly<{
  caption: string; columns: readonly ReportColumn<R>[]; rows: readonly R[]; rowKey(row: R): string;
  /** Có dòng tổng cuối bảng khi ít nhất một cột có `total`. */
  selectedKey?: string;
}>;

/** Bảng số liệu có tiêu đề cột, dòng tổng (tfoot) và vùng cuộn ngang bàn phím được; dòng đang chọn được tô nền. */
export function ReportTable<R>({ caption, columns, rows, rowKey, selectedKey }: ReportTableProps<R>) {
  const hasTotal = columns.some((column) => column.total !== undefined);
  return (
    <div className={s.tableFrame} role="region" aria-label={caption} tabIndex={0}>
      <table className={s.table}>
        <caption className={s.srOnly}>{caption}</caption>
        <thead><tr>{columns.map((column) => <th key={column.key} scope="col" className={column.numeric ? s.right : undefined}>{column.header}</th>)}</tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={rowKey(row)} className={selectedKey === rowKey(row) ? s.selected : undefined}>
            {columns.map((column, index) => index === 0
              ? <th key={column.key} scope="row" className={column.numeric ? s.right : undefined}>{column.cell(row)}</th>
              : <td key={column.key} className={column.numeric ? s.right : undefined}>{column.cell(row)}</td>)}
          </tr>
        ))}</tbody>
        {hasTotal && <tfoot><tr>{columns.map((column, index) => index === 0
          ? <th key={column.key} scope="row">{column.total ?? "Tổng"}</th>
          : <td key={column.key} className={column.numeric ? s.right : undefined}>{column.total ?? ""}</td>)}</tr></tfoot>}
      </table>
    </div>
  );
}

/** Nút trông như liên kết, mở chi tiết của dòng (bấm dòng) mà vẫn dùng được bằng bàn phím. */
export function RowLinkButton({ children, onClick, pressed }: Readonly<{ children: ReactNode; onClick(): void; pressed?: boolean }>) {
  return <button type="button" className={s.rowButton} aria-pressed={pressed} onClick={onClick}>{children}</button>;
}

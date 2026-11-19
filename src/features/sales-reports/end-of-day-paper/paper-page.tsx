"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { isOpen, type EodTable, type OpenState } from "../end-of-day-model";
import type { FlowEntry } from "./paper-flow";
import { splitMatches, type SearchMatch } from "./paper-search";
import styles from "./paper.module.css";

export type SearchState = Readonly<{ query: string; active?: SearchMatch }>;
type Context = Readonly<{ state: OpenState; search: SearchState; /** Không có = bản in/đo, dấu ⊞/⊟ chỉ để xem. */ onToggle?(key: string): void }>;

/** Chữ có tô sáng các lần khớp từ khóa tìm; lần khớp đang chọn có màu đậm và `data-active`. */
function Text({ text, entryKey, cell, search }: Readonly<{ text: string; entryKey: string; cell: number; search: SearchState }>) {
  if (!search.query.trim()) return text;
  let nth = 0;
  return splitMatches(text, search.query).map((part, index) => {
    if (!part.hit) return part.text;
    const active = search.active?.key === entryKey && search.active.cell === cell && search.active.nth === nth++;
    return <mark key={index} className={styles.mark} data-active={active || undefined}>{part.text}</mark>;
  });
}

const Cols = ({ table }: Readonly<{ table: EodTable }>) => {
  const total = table.columns.reduce((sum, column) => sum + column.width, 0);
  return <colgroup>{table.columns.map((column) => <col key={column.key} style={{ width: `${(column.width / total) * 100}%` }} />)}</colgroup>;
};
const Head = ({ table }: Readonly<{ table: EodTable }>) => <thead><tr>{table.columns.map((column) => <th key={column.key} scope="col" className={column.numeric ? styles.num : undefined}>{column.header}</th>)}</tr></thead>;

/** Bảng chỉ có dòng tiêu đề: dùng để đo chiều cao tiêu đề lặp lại ở mỗi trang. */
export const PaperTableHead = ({ table }: Readonly<{ table: EodTable }>) => <table className={styles.table}><Cols table={table} /><Head table={table} /></table>;

function Toggle({ open, label, onToggle }: Readonly<{ open: boolean; label: string; onToggle?(): void }>) {
  const icon = <InterfaceIcon name={open ? "square-minus" : "square-plus"} />;
  return onToggle
    ? <button type="button" className={styles.toggle} aria-expanded={open} aria-label={`${open ? "Thu gọn" : "Mở rộng"} ${label}`} title={open ? "Thu gọn" : "Mở rộng"} onClick={onToggle}>{icon}</button>
    : <span className={styles.toggle} aria-hidden="true">{icon}</span>;
}

function RowView({ entry, ctx }: Readonly<{ entry: Extract<FlowEntry, { type: "row" | "total" }>; ctx: Context }>) {
  const { table } = entry, row = entry.type === "row" ? entry.row : undefined;
  const cells = row ? row.cells : table.total ?? [];
  const className = entry.type === "total" ? styles.total : row?.role === "group" ? styles.groupRow : row?.role === "detail" ? styles.detail : undefined;
  // Như KiotViet: nhãn của dòng nhóm/tổng tràn sang các ô chữ trống liền sau nó (không tràn qua cột số).
  const spans = cells.map(() => 1);
  if (row?.role === "group" || entry.type === "total") {
    let next = 1;
    while (next < cells.length && !cells[next].text && !table.columns[next]?.numeric) { spans[0] += 1; spans[next] = 0; next += 1; }
  }
  return (
    <tr className={className}>
      {cells.map((item, index) => {
        if (!spans[index]) return null;
        const column = table.columns[index];
        const text = <Text text={item.text} entryKey={entry.key} cell={index} search={ctx.search} />;
        return (
          <td key={column?.key ?? index} colSpan={spans[index] > 1 ? spans[index] : undefined} className={[column?.numeric ? styles.num : "", item.strong ? styles.strong : ""].filter(Boolean).join(" ") || undefined}>
            {index === 0 && row?.toggle && <Toggle open={isOpen(row, ctx.state)} label={item.text} onToggle={ctx.onToggle && (() => ctx.onToggle?.(row.key))} />}
            {item.href ? <Link className={styles.cellLink} href={item.href}>{text}</Link> : text}
          </td>
        );
      })}
    </tr>
  );
}

function Block({ entry, ctx }: Readonly<{ entry: Exclude<FlowEntry, { type: "row" | "total" }>; ctx: Context }>) {
  const text = (value: string, cell: number) => <Text text={value} entryKey={entry.key} cell={cell} search={ctx.search} />;
  switch (entry.type) {
    case "head": return (
      <header className={styles.head}>
        <div className={styles.created}>Ngày lập: {entry.head.createdAt}</div>
        <h2 className={styles.title}>{text(entry.head.title, 0)}</h2>
        {entry.head.lines.map((line, index) => <p key={line} className={styles.line}>{text(line, index + 1)}</p>)}
      </header>
    );
    case "tableTitle": return <h3 className={styles.tableTitle}>{text(entry.table.title, 0)}</h3>;
    case "empty": return <p className={styles.empty}>{text(entry.table.emptyText, 0)}</p>;
    case "note": return <p className={styles.note}>{text(entry.text, 0)}</p>;
  }
}

/** Các phần tử của một trang (hoặc một phần tử khi đo): dòng liên tiếp của cùng một bảng gộp thành một bảng có dòng tiêu đề riêng. */
/** `withoutHead`: chỉ dùng khi đo chiều cao từng dòng (tiêu đề bảng được đo riêng và cộng một lần mỗi trang). */
export function PaperEntries({ entries, withoutHead, ...ctx }: Readonly<{ entries: readonly FlowEntry[]; withoutHead?: boolean } & Context>) {
  const out: ReactNode[] = [];
  for (let at = 0; at < entries.length; at++) {
    const entry = entries[at];
    if (entry.type !== "row" && entry.type !== "total") { out.push(<Block key={entry.key} entry={entry} ctx={ctx} />); continue; }
    const run = [entry];
    while (at + 1 < entries.length) {
      const next = entries[at + 1];
      if ((next.type !== "row" && next.type !== "total") || next.table.id !== entry.table.id) break;
      run.push(next); at++;
    }
    out.push(
      <table key={entry.key} className={styles.table}>
        <Cols table={entry.table} />{!withoutHead && <Head table={entry.table} />}
        <tbody>{run.map((item) => <RowView key={item.key} entry={item} ctx={ctx} />)}</tbody>
      </table>,
    );
  }
  return <>{out}</>;
}

/** Một tờ giấy: kích thước mm đúng khổ A4 theo hướng giấy, nội dung trong lề và chân trang "Trang n/N". */
export function PaperSheet({ number, total, widthMm, heightMm, margin, className, children }: Readonly<{ number: number; total: number; widthMm: number; heightMm: number; margin: Readonly<{ top: number; bottom: number; side: number }>; className: string; children: ReactNode }>) {
  return (
    <section className={className} data-page={number} aria-label={`Trang ${number} trên ${total}`} style={{ width: `${widthMm}mm`, height: `${heightMm}mm`, padding: `${margin.top}mm ${margin.side}mm ${margin.bottom}mm` }}>
      <div className={styles.content}>{children}</div>
      <footer className={styles.footer}>Trang {number}/{total}</footer>
    </section>
  );
}

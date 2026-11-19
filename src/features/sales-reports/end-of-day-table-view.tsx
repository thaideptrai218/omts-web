"use client";
import Link from "next/link";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { EmptyNote, EndOfDaySection } from "./end-of-day-parts";
import styles from "./end-of-day-report.module.css";
import { isOpen, visibleRows, type EodCell, type EodDocument, type EodRow, type EodTable, type OpenState } from "./end-of-day-model";
import { ReportTable, ReportTiles, type ReportColumn } from "./report-parts";

type Props = Readonly<{ doc: EodDocument; state: OpenState; onToggle(key: string): void }>;

function CellView({ cell, row, state, onToggle, first }: Readonly<{ cell: EodCell; row: EodRow; state: OpenState; onToggle(key: string): void; first: boolean }>) {
  const open = isOpen(row, state);
  const content = cell.href ? <Link href={cell.href} className="font-semibold text-primary underline">{cell.text}</Link> : <span className={cell.strong ? "font-semibold" : undefined}>{cell.text}</span>;
  return (
    <span className={row.role === "detail" && first ? styles.detailCell : undefined}>
      {first && row.toggle && (
        <button type="button" className={styles.rowToggle} aria-expanded={open} aria-label={`${open ? "Thu gọn" : "Mở rộng"} ${cell.text}`} title={open ? "Thu gọn" : "Mở rộng"} onClick={() => onToggle(row.key)}>
          <InterfaceIcon name={open ? "square-minus" : "square-plus"} className="size-4" />
        </button>
      )}
      {content}
    </span>
  );
}

function TableBlock({ table, state, onToggle }: Readonly<{ table: EodTable } & Omit<Props, "doc">>) {
  const rows = visibleRows(table, state);
  const columns: ReportColumn<EodRow>[] = table.columns.map((column, index) => ({
    key: column.key, header: column.header, numeric: column.numeric,
    cell: (row) => <CellView cell={row.cells[index]} row={row} state={state} onToggle={onToggle} first={index === 0} />,
    total: table.total ? table.total[index]?.text : undefined,
  }));
  return (
    <EndOfDaySection title={table.title} summary={`${table.rows.length} dòng`}>
      {table.rows.length ? <ReportTable caption={table.title} columns={columns} rows={rows} rowKey={(row) => row.key} /> : <EmptyNote>{table.emptyText}</EmptyNote>}
    </EndOfDaySection>
  );
}

/** Dạng bảng: ô chỉ số rồi từng bảng của mối quan tâm (thu gọn được); dòng nhóm / sản phẩm có ⊞/⊟ mở các dòng bên dưới. */
export function EndOfDayTableView({ doc, state, onToggle }: Props) {
  return (
    <div className={styles.printArea}>
      {doc.tiles.length > 0 && <ReportTiles label="Tổng hợp báo cáo cuối ngày" tiles={doc.tiles} />}
      {doc.tables.map((table) => <TableBlock key={table.id} table={table} state={state} onToggle={onToggle} />)}
      {doc.note && <p className={styles.note}>{doc.note}</p>}
    </div>
  );
}

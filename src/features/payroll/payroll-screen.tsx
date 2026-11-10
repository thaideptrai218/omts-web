"use client";
/*
 * SCR-LABOR-10 "Bảng lương". The backend has no payroll sheet endpoints yet, so this screen makes no request and has no
 * rows: `sheets` defaults to empty (the real state today). Wire the list read (status, period, paging) here when the API
 * exists; "+ Tạo bảng lương" is added with the create endpoint, not before.
 */
import { useMemo, useState } from "react";
import { FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, managementStyles } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, isAllTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { filterSheets, PAYROLL_STATUSES, type PayrollSheet } from "./payroll-model";
import { sheetColumns } from "./payroll-sheet-columns";
import { PayrollSheetTable } from "./payroll-sheet-table";
import s from "./payroll-screen.module.css";

const NO_SHEETS: readonly PayrollSheet[] = [];
const defaultColumns = sheetColumns.map((column) => column.key).join(",");
const pageSizes = [15, 30, 50] as const;

export function PayrollScreen({ helpHref, sheets = NO_SHEETS }: Readonly<{ helpHref?: string; sheets?: readonly PayrollSheet[] }>) {
  const [search, setSearch] = useState(""), [status, setStatus] = useState(""), [time, setTime] = useState<TimeRangeValue>(allTime);
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState<number>(pageSizes[0]), [expanded, setExpanded] = useState<string>();
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-payroll-sheets", defaultColumns);
  const visible = useMemo(() => { const keys = storedColumns.split(","), shown = sheetColumns.filter((column) => keys.includes(column.key)); return shown.length ? shown : sheetColumns; }, [storedColumns]);

  const filtered = useMemo(() => filterSheets(sheets, { search, status, from: time.from, to: time.to }), [sheets, search, status, time]);
  const last = Math.max(1, Math.ceil(filtered.length / pageSize)), current = Math.min(page, last);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);
  const hasFilter = !!status || !!search.trim() || !isAllTime(time);

  const changed = <T,>(apply: (value: T) => void) => (value: T) => { apply(value); setPage(1); setExpanded(undefined); };
  const filters = <>
    <div className={s.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => { changed<void>(() => { setSearch(""); setStatus(""); setTime(allTime); })(); }}>Đặt lại</button></div>
    <FilterPills legend="Trạng thái" name="payroll-status" value={status} options={PAYROLL_STATUSES} onChange={changed<string>(setStatus)} />
    <TimeRangeFilter legend="Kỳ lương" value={time} onChange={changed<TimeRangeValue>(setTime)} />
  </>;

  return <ManagementLayout storageKey="payroll-sheets" icon="payment" title="Bảng lương" filters={filters} filterLabel="Bộ lọc bảng lương"
    footer={<ManagementPagination page={current} pageSize={pageSize} total={filtered.length} pageSizes={pageSizes} unit="bảng lương"
      onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm bảng lương" placeholder="Theo kỳ lương" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      <ColumnPicker columns={sheetColumns} visible={visible.map((column) => column.key)} onChange={(keys) => storeColumns(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    <ManagementScroller>
      {rows.length === 0
        ? <ListStateMessage>{hasFilter && sheets.length ? "Không có bảng lương phù hợp bộ lọc." : "Chưa có dữ liệu để hiển thị."}</ListStateMessage>
        : <PayrollSheetTable rows={rows} columns={visible} expandedId={expanded} onToggle={(id) => setExpanded((value) => value === id ? undefined : id)} />}
    </ManagementScroller>
  </ManagementLayout>;
}

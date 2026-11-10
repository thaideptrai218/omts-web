"use client";
/*
 * SCR-LABOR-11 "Thanh toán lương". The backend has no payable-lines or record-payment endpoints yet, so this screen makes
 * no request and shows no rows (`lines` defaults to empty). The payment form and "Ghi nhận thanh toán" arrive with the
 * record-payment endpoint; they are not drawn before it can work.
 */
import { useMemo, useState } from "react";
import { FilterGroup, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, managementStyles } from "@/components/ui/management-screen/management-table";
import { NumberRangeFilter } from "@/components/ui/management-screen/number-range-filter";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { Money } from "@/features/operations/ui";
import { PayrollDataTable, type DataColumn } from "./payroll-data-table";
import { filterPayables, type PayableLine } from "./payroll-model";
import s from "./payroll-screen.module.css";

const NO_LINES: readonly PayableLine[] = [];
const columns: readonly DataColumn<PayableLine>[] = [
  { key: "employee", label: "Nhân viên", render: (line) => <span className={s.name}>{line.employeeName}</span> },
  { key: "pay", label: "Lương", right: true, render: (line) => <Money value={line.pay} /> },
  { key: "paid", label: "Đã trả", right: true, render: (line) => <Money value={line.paid} /> },
  { key: "outstanding", label: "Còn nợ", right: true, render: (line) => <Money value={line.outstanding} /> },
  { key: "bank", label: "Tài khoản ngân hàng", render: (line) => line.bankAccount || "—" },
];
const defaultColumns = columns.map((column) => column.key).join(",");
const pageSizes = [15, 30, 50] as const;

export function PayrollPaymentsScreen({ helpHref, lines = NO_LINES }: Readonly<{ helpHref?: string; lines?: readonly PayableLine[] }>) {
  const [search, setSearch] = useState(""), [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState<number>(pageSizes[0]);
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-payroll-payables", defaultColumns);
  const visible = useMemo(() => { const keys = storedColumns.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [storedColumns]);

  const filtered = useMemo(() => filterPayables(lines, { search, outstandingFrom: from, outstandingTo: to }), [lines, search, from, to]);
  const last = Math.max(1, Math.ceil(filtered.length / pageSize)), current = Math.min(page, last);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);
  const hasFilter = !!search.trim() || !!from || !!to;

  const changed = <T,>(apply: (value: T) => void) => (value: T) => { apply(value); setPage(1); };
  const filters = <>
    <div className={s.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => { setSearch(""); setFrom(""); setTo(""); setPage(1); }}>Đặt lại</button></div>
    <FilterGroup legend="Còn nợ (₫)"><NumberRangeFilter label="Còn nợ" from={from} to={to} onFromChange={changed<string>(setFrom)} onToChange={changed<string>(setTo)} /></FilterGroup>
  </>;

  return <ManagementLayout storageKey="payroll-payables" icon="payment" title="Thanh toán lương" filters={filters} filterLabel="Bộ lọc thanh toán lương"
    footer={<ManagementPagination page={current} pageSize={pageSize} total={filtered.length} pageSizes={pageSizes} unit="nhân viên" onPage={setPage} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm nhân viên còn nợ lương" placeholder="Theo tên nhân viên" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => storeColumns(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    <ManagementScroller>
      {rows.length === 0
        ? <ListStateMessage>{hasFilter && lines.length ? "Không có nhân viên phù hợp bộ lọc." : "Chưa có dữ liệu để hiển thị."}</ListStateMessage>
        : <PayrollDataTable caption="Nhân viên còn nợ lương" columns={visible} rows={rows} />}
    </ManagementScroller>
  </ManagementLayout>;
}

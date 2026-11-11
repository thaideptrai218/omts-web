"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, managementStyles } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, isAllTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { StatusPill } from "@/components/ui/management-page";
import { Money, operationError } from "@/features/operations/ui";
import type { PaymentPage, PaymentRow } from "./contracts";
import { PayrollDataTable, type DataColumn } from "./payroll-data-table";
import { formatDateTime, methodLabel, paymentStatusLabel } from "./payroll-model";
import { StandalonePaymentDialog } from "./payroll-standalone-payment-dialog";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

const columns: readonly DataColumn<PaymentRow>[] = [
  { key: "code", label: "Mã phiếu chi", render: (row) => <span className={s.mono}>{row.voucherCode}</span> },
  { key: "time", label: "Thời gian", render: (row) => formatDateTime(row.paidAt) },
  { key: "employee", label: "Nhân viên", render: (row) => <span className={s.name}>{row.employeeName}</span> },
  { key: "sheet", label: "Bảng lương", render: (row) => row.kind === "Advance" ? "Tạm ứng" : row.payrollCode ?? "—" },
  { key: "method", label: "Phương thức", render: (row) => methodLabel[row.method] },
  { key: "amount", label: "Số tiền", right: true, render: (row) => <Money value={row.amount} /> },
  { key: "status", label: "Trạng thái", render: (row) => <StatusPill tone={row.status === "Cancelled" ? "danger" : "success"}>{paymentStatusLabel[row.status]}</StatusPill> },
];
const defaultColumns = columns.map((column) => column.key).join(",");

/** SCR-LABOR-11 "Thanh toán lương": the wage payments made (sheet payments and advances) and the standalone "Thanh toán lương". */
export function PayrollPaymentsScreen({ helpHref }: Readonly<{ helpHref?: string }>) {
  const [search, setSearch] = useState(""), [time, setTime] = useState<TimeRangeValue>(allTime), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<PaymentPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>(), [paying, setPaying] = useState(false), [notice, setNotice] = useState<string>();
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-payroll-payments", defaultColumns);
  const visible = useMemo(() => { const keys = storedColumns.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [storedColumns]);
  const hasFilter = !!search.trim() || !isAllTime(time);
  const reload = () => setRefresh((value) => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void payrollRepository.payments({ search, from: time.from, to: time.to, page, pageSize }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setData(result.data);
          if (result.data.total > 0 && page > Math.ceil(result.data.total / pageSize)) setPage(Math.ceil(result.data.total / pageSize));
        } else { setData(undefined); setError(operationError(result)); }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, time, page, pageSize, refresh]);

  const changed = <T,>(apply: (value: T) => void) => (value: T) => { apply(value); setPage(1); };
  const filters = <>
    <div className={s.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setSearch(""); setTime(allTime); })()}>Đặt lại</button></div>
    <TimeRangeFilter legend="Thời gian" value={time} onChange={changed<TimeRangeValue>(setTime)} />
  </>;

  return <ManagementLayout storageKey="payroll-payments" icon="payment" title="Thanh toán lương" filters={filters} filterLabel="Bộ lọc thanh toán lương"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="phiếu chi" disabled={loading} onPage={setPage} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm phiếu chi lương" placeholder="Theo mã phiếu chi, nhân viên, bảng lương" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      <Button key="pay" className="w-auto" type="button" onClick={() => setPaying(true)}><InterfaceIcon name="add" className="mr-1 size-4" />Thanh toán lương</Button>
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => storeColumns(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {notice && <div className={s.feedback}><p role="status">{notice}</p></div>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={s.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{hasFilter ? "Không có phiếu chi phù hợp bộ lọc." : "Chưa có phiếu chi lương."}</ListStateMessage>
        : <PayrollDataTable caption="Phiếu chi lương" columns={visible} rows={data.items} />}
    </ManagementScroller>
    {paying && <StandalonePaymentDialog onClose={() => setPaying(false)} onPaid={() => { setPaying(false); setNotice("Đã tạo phiếu chi. Phiếu chi xuất hiện trong Sổ quỹ."); reload(); }} />}
  </ManagementLayout>;
}

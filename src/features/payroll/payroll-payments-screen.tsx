"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller } from "@/components/ui/management-screen/management-table";
import { allTime, isAllTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { operationError } from "@/features/operations/ui";
import type { PaymentPage } from "./contracts";
import { PayrollPaymentsFilterRail, noPaymentFilters, type PaymentFilters } from "./payroll-payments-filter-rail";
import { paymentListColumns as columns } from "./payroll-payments-columns";
import { PayrollPaymentsTable } from "./payroll-payments-table";
import { StandalonePaymentDialog } from "./payroll-standalone-payment-dialog";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

const defaultColumns = columns.map((column) => column.key).join(",");

/** SCR-LABOR-11 "Thanh toán lương": the wage payments made (sheet payments and advances) and the standalone "Thanh toán lương". */
export function PayrollPaymentsScreen({ helpHref }: Readonly<{ helpHref?: string }>) {
  const [search, setSearch] = useState(""), [time, setTime] = useState<TimeRangeValue>(allTime), [filters, setFilters] = useState<PaymentFilters>(noPaymentFilters);
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0), [expanded, setExpanded] = useState<string>();
  const [data, setData] = useState<PaymentPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>(), [paying, setPaying] = useState(false), [notice, setNotice] = useState<string>();
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-payroll-payments", defaultColumns);
  const visible = useMemo(() => { const keys = storedColumns.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [storedColumns]);
  const hasFilter = !!search.trim() || !isAllTime(time) || !!filters.method || !!filters.kind || !!filters.status;
  const reload = () => setRefresh((value) => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void payrollRepository.payments({ search, from: time.from, to: time.to, page, pageSize, ...filters }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setData(result.data);
          if (result.data.total > 0 && page > Math.ceil(result.data.total / pageSize)) setPage(Math.ceil(result.data.total / pageSize));
        } else { setData(undefined); setError(operationError(result)); }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, time, filters, page, pageSize, refresh]);

  const changed = <T,>(apply: (value: T) => void) => (value: T) => { apply(value); setPage(1); setExpanded(undefined); };
  // The sum of the whole filtered set when the backend gives it, else the recorded vouchers on this page (cancelled vouchers count for nothing).
  const total = data?.summary?.amount ?? data?.items.reduce((sum, row) => sum + (row.status === "Recorded" ? row.amount : 0), 0) ?? 0;

  return <ManagementLayout storageKey="payroll-payments" icon="payment" title="Thanh toán lương" filterLabel="Bộ lọc thanh toán lương"
    filters={<PayrollPaymentsFilterRail time={time} filters={filters} hasFilter={hasFilter} onTime={changed<TimeRangeValue>(setTime)} onFilters={changed<PaymentFilters>(setFilters)}
      onReset={() => changed<void>(() => { setSearch(""); setTime(allTime); setFilters(noPaymentFilters); })()} />}
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="phiếu chi" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
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
        : <PayrollPaymentsTable rows={data.items} columns={visible} total={total} totalNote={data.summary ? undefined : "trang này"} expandedId={expanded} onToggle={(id) => setExpanded((value) => value === id ? undefined : id)} />}
    </ManagementScroller>
    {paying && <StandalonePaymentDialog onClose={() => setPaying(false)} onPaid={() => { setPaying(false); setNotice("Đã tạo phiếu chi. Phiếu chi xuất hiện trong Sổ quỹ."); reload(); }} />}
  </ManagementLayout>;
}

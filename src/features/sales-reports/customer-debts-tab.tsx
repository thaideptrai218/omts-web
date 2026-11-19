"use client";
import { useState, type ReactNode } from "react";
import { CustomerDebtsPanel } from "./customer-debts-panel";
import type { CustomerReportFilters } from "./customer-report-filters";
import { ReportFilterRail, useReportZones } from "./report-filter-rail";
import { ReportPage } from "./report-page";
import { useCustomerDebts, useDebounced } from "./use-customer-debts";

/** Tab "Công nợ": danh sách khách đang có công nợ (backend DEBT-03) và sổ chi tiết của khách đang mở trong kỳ đã chọn; không lọc theo vùng. */
export function CustomerDebtsTab({ filters, tabChoice }: Readonly<{ filters: CustomerReportFilters; tabChoice: ReactNode }>) {
  const zones = useReportZones("customer-report");
  const [search, setSearch] = useState(""), [page, setPage] = useState(1), [openId, setOpenId] = useState<string>();
  const term = useDebounced(search.trim());
  const { draft } = filters;
  const debts = useCustomerDebts({ search: term, page, from: filters.query.from, to: filters.query.to, customerId: openId });
  const { list } = debts, data = list.data;
  return (
    <ReportPage storageKey="customer-debts" icon="users" title="Khách hàng" filterLabel="Bộ lọc công nợ khách hàng" canView={debts.canView}
      filters={<ReportFilterRail time={draft.time} onTime={(time) => filters.change({ time })} zoneIds={draft.zoneIds} onZones={(zoneIds) => filters.change({ zoneIds })} zones={zones}
        showZones={false} problem={filters.problem} busy={list.loading} onApply={filters.apply} onReset={filters.reset}>{tabChoice}</ReportFilterRail>}
      search={{ value: search, placeholder: "Tìm khách hàng", onChange: (value) => { setSearch(value); setPage(1); } }}
      onExport={debts.canExport ? debts.exportFile : undefined} exporting={debts.exporting} exportError={debts.exportError}
      loading={list.loading} error={list.error} onRetry={list.reload} hasData={!!data}>
      {data && <CustomerDebtsPanel list={data} page={page} onPage={setPage} busy={list.loading} openId={openId} onOpen={setOpenId}
        statement={{ data: debts.statement.data, loading: debts.statement.loading, error: debts.statement.error, reload: debts.statement.reload }} />}
    </ReportPage>
  );
}

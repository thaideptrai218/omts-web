"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { BulkBar, ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, type SortState } from "@/components/ui/management-screen/management-table";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { ErrorNotice, operationError, useMutation } from "@/features/operations/ui";
import { payrollStatuses, type PayrollStatus, type PeriodType, type SheetPage } from "./contracts";
import { PayrollCreateDialog } from "./payroll-create-dialog";
import { PayrollFilterRail } from "./payroll-filter-rail";
import { PayrollListTable, listColumns } from "./payroll-list-table";
import { defaultStatuses } from "./payroll-model";
import { payrollRepository, type SheetQuery } from "./repository";
import s from "./payroll-screen.module.css";

const defaultColumns = listColumns.map((column) => column.key).join(",");
const sameStatuses = (a: readonly PayrollStatus[], b: readonly PayrollStatus[]) => a.length === b.length && a.every((status) => b.includes(status));

/** SCR-LABOR-10 "Bảng lương", laid out like KiotViet's payroll list (see docs/reports/PAYROLL_API_CONTRACT_2026-11-11.md). */
export function PayrollScreen({ helpHref }: Readonly<{ helpHref?: string }>) {
  // A link from an employee profile opens this list on one sheet: ?recordId=<id>&search=<code>. Cancelled sheets are then included.
  const params = useSearchParams(), linkedId = params?.get("recordId") ?? undefined, linkedSearch = params?.get("search") ?? "";
  const [search, setSearch] = useState(linkedSearch), [periodType, setPeriodType] = useState<"" | PeriodType>(""), [statuses, setStatuses] = useState<readonly PayrollStatus[]>(linkedId ? payrollStatuses : defaultStatuses);
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<SheetPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>();
  const [expanded, setExpanded] = useState<string | undefined>(linkedId), [selected, setSelected] = useState<ReadonlySet<string>>(new Set()), [creating, setCreating] = useState(false), [notice, setNotice] = useState<string>();
  const exportList = useMutation();
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-payroll-sheets", defaultColumns);
  const visible = useMemo(() => { const keys = storedColumns.split(","), shown = listColumns.filter((column) => keys.includes(column.key)); return shown.length ? shown : listColumns; }, [storedColumns]);
  const query = useMemo<SheetQuery>(() => ({ search, periodType, statuses, sortBy: sort.key, sortDir: sort.direction, page, pageSize }), [search, periodType, statuses, sort, page, pageSize]);
  const hasFilter = !!periodType || !sameStatuses(statuses, defaultStatuses) || !!search.trim();
  const reload = () => setRefresh((value) => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void payrollRepository.list(query, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setData(result.data);
          if (result.data.total > 0 && page > Math.ceil(result.data.total / pageSize)) setPage(Math.ceil(result.data.total / pageSize));
        } else { setData(undefined); setError(operationError(result)); }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, page, pageSize, refresh]);

  const changed = <T,>(apply: (value: T) => void) => (value: T) => { apply(value); setPage(1); setExpanded(undefined); setSelected(new Set()); };
  const pageIds = data?.items.map((row) => row.id) ?? [];
  const filters = <PayrollFilterRail periodType={periodType} statuses={statuses} hasFilter={hasFilter} onPeriodType={changed(setPeriodType)} onStatuses={changed(setStatuses)}
    onReset={() => changed<void>(() => { setPeriodType(""); setStatuses(defaultStatuses); setSearch(""); })()} />;

  return <ManagementLayout storageKey="payroll-sheets" icon="payment" title="Bảng lương" filters={filters} filterLabel="Bộ lọc bảng lương"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="bảng lương" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); setSelected(new Set()); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm bảng lương" placeholder="Theo mã, tên bảng lương" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      <Button key="create" className="w-auto" type="button" onClick={() => setCreating(true)}><InterfaceIcon name="add" className="mr-1 size-4" />Bảng tính lương</Button>
      <Button key="export" className="w-auto" variant="secondary" type="button" isPending={exportList.pending} onClick={() => void exportList.run(() => payrollRepository.exportList(query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>
      <ColumnPicker columns={listColumns} visible={visible.map((column) => column.key)} onChange={(keys) => storeColumns(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>{null}</BulkBar>
    {(notice || exportList.error) && <div className={s.feedback}><ErrorNotice error={exportList.error} />{notice && <p role="status">{notice}</p>}</div>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={s.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{hasFilter ? "Không có bảng lương phù hợp bộ lọc." : "Chưa có bảng lương."}</ListStateMessage>
        : <PayrollListTable page={data} columns={visible} sort={sort} expandedId={expanded} selected={selected}
          onSort={changed<SortState>(setSort)} onToggle={(id) => setExpanded((value) => value === id ? undefined : id)}
          onSelect={(id, on) => setSelected((current) => { const next = new Set(current); if (on) next.add(id); else next.delete(id); return next; })}
          onSelectAll={(on) => setSelected(on ? new Set(pageIds) : new Set())}
          onChanged={(message) => { if (message) setNotice(message); reload(); }} />}
    </ManagementScroller>
    {creating && <PayrollCreateDialog onClose={() => setCreating(false)} onCreated={(sheet) => {
      setCreating(false); setNotice(`Đã tạo ${sheet.name}.`); setSort({ key: "code", direction: "desc" }); setPage(1); setExpanded(sheet.id); reload();
      // Creation is synchronous on the backend; a sheet still "Đang tạo" is refreshed once more.
      if (sheet.status === "Creating") setTimeout(reload, 2000);
    }} />}
  </ManagementLayout>;
}

"use client";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { SelectBox } from "@/components/ui/select-box";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { PlanRefLink } from "@/features/harvest-plans/plan-ref-link";
import issueStyles from "@/features/input-issues/input-issues.module.css";
import { useZoneOptions } from "@/features/input-issues/issue-access";
import { loadOptions } from "@/features/operations/lookups";
import { operationAllowed } from "@/features/operations/permissions";
import { ErrorNotice, operationError, useMutation, useRemote } from "@/features/operations/ui";
import { productRepository } from "@/features/products/repository";
import { IN_USE, type ProductRow } from "@/features/products/contracts";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { closeReasons, lotStatusIds, type LotListQuery, type LotPage, type LotRow, type LotTotals } from "./contracts";
import { LotDetailPanel } from "./lot-detail";
import { LotStatus, closeReasonLabel, lotStatusLabel } from "./lot-labels";
import { lotRepository } from "./repository";
import { DetailRow } from "@/components/ui/management-screen/detail-pane";

type Column = { key: string; label: string; sort?: string; numeric?: boolean; hidden?: boolean; render(row: LotRow): ReactNode; total?(totals: LotTotals): ReactNode };
const dash = (value: string | null | undefined) => value || "—";
const stop = (event: { stopPropagation(): void }) => event.stopPropagation();
const columns: readonly Column[] = [
  { key: "code", label: "Mã lô", sort: "code", render: (row) => <span className="font-mono tabular-nums">{row.lotCode}</span> },
  { key: "harvestedAt", label: "Thời gian thu", sort: "harvestedAt", render: (row) => viDateTime(row.harvestedAt) },
  { key: "place", label: "Vùng / bè", render: (row) => `${row.zoneCode} / ${row.raftCode}` },
  { key: "products", label: "Sản phẩm", render: (row) => <span title={row.products.map((product) => `${product.name} (${product.code})`).join(", ")}>{row.products.length ? row.products.map((product) => product.name).join(", ") : "—"}</span> },
  { key: "cages", label: "Lồng", numeric: true, render: (row) => fmt(row.cageCount), total: (totals) => fmt(totals.cageCount) },
  { key: "weighed", label: "Kg cân", numeric: true, render: (row) => row.weighedKg == null ? <span className="text-text-muted">Chờ cân</span> : fmt(row.weighedKg), total: (totals) => fmt(totals.weighedKg) },
  { key: "sold", label: "Đã bán", numeric: true, render: (row) => fmt(row.figures.soldKg), total: (totals) => fmt(totals.soldKg) },
  { key: "remaining", label: "Còn lại", sort: "remainingKg", numeric: true, render: (row) => fmt(row.figures.remainingKg), total: (totals) => fmt(totals.remainingKg) },
  { key: "lost", label: "Hao hụt", numeric: true, render: (row) => fmt(row.figures.lostKg), total: (totals) => fmt(totals.lostKg) },
  { key: "plan", label: "KHT", render: (row) => row.harvestPlan ? <span onClick={stop}><PlanRefLink className={issueStyles.link} code={row.harvestPlan.code} /></span> : "—" },
  { key: "closeReason", label: "Lý do đóng", hidden: true, render: (row) => row.closeReason ? closeReasonLabel[row.closeReason] ?? row.closeReason : "—" },
  { key: "recordedBy", label: "Người ghi nhận", hidden: true, render: (row) => dash(row.recordedByName) },
  { key: "status", label: "Trạng thái", render: (row) => <LotStatus statusId={row.statusId} status={row.status} /> },
];
const defaults = columns.filter((column) => !column.hidden).map((column) => column.key).join(",");
const emptyFilters = { status: "", zone: "", raft: "", product: "", weighed: "", closeReason: "", hasPlan: "" };
type Filters = typeof emptyFilters;
const railSelect = "h-[30px] w-full rounded-md border border-border-strong bg-surface px-2 text-[13px]";

/**
 * A link opens this list on one lot by its code (`?code=LTH000001`). The list is keyed by that code so a link followed while the list is already open starts it again:
 * the search box shows the code, every status and date is shown and the row with exactly that code opens.
 */
export function LotsScreen(props: { helpHref?: string }) {
  const params = useSearchParams(), linkedCode = params.get("code") ?? "", linkedZone = params.get("zoneId") ?? "", linkedRaft = params.get("raftId") ?? "", weigh = params.get("weigh") === "1";
  return <LotsList key={`${linkedCode}:${linkedZone}:${linkedRaft}:${weigh}`} linkedCode={linkedCode} linkedZone={linkedZone} linkedRaft={linkedRaft} weighLinked={weigh} {...props} />;
}

function LotsList({ helpHref, linkedCode, linkedZone, linkedRaft, weighLinked }: { helpHref?: string; linkedCode: string; linkedZone: string; linkedRaft: string; weighLinked: boolean }) {
  const { identity, permissions } = useApiWorkspace(), exportFile = useMutation();
  const view = operationAllowed("harvest", identity, permissions.functionPermissions, "View");
  const linkPending = useRef(linkedCode);
  const [search, setSearch] = useState(linkedCode), [filters, setFilters] = useState<Filters>({ ...emptyFilters, zone: linkedZone, raft: linkedZone ? linkedRaft : "" }), [time, setTime] = useState<TimeRangeValue>(allTime);
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<LotPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>(), [expanded, setExpanded] = useState<string>();
  const [stored, store] = useStoredValue("omts-columns-harvest-lots", defaults);
  const visible = useMemo(() => { const keys = stored.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [stored]);
  const { zones } = useZoneOptions(view);
  const rafts = useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<{ id: string; code: string }[]>> => {
    if (!filters.zone) return { status: "success", data: [] };
    const result = await loadOptions("rafts", signal, { zoneId: filters.zone });
    return result.status === "success" ? { status: "success", data: result.data.map((row) => ({ id: row.id, code: String(row.code ?? "") })) } : result;
  }, [filters.zone]));
  const products = useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<ProductRow[]>> => view ? productRepository.all({}, signal) : { status: "success", data: [] }, [view]));

  // The filters as the list and the file take them; the file has no paging.
  const query = useMemo<LotListQuery>(() => {
    const values: LotListQuery = {
      search: search.trim(), statusId: filters.status, from: time.from, to: time.to, zoneId: filters.zone, raftId: filters.raft, productId: filters.product, weighed: filters.weighed,
      closeReason: filters.closeReason, hasPlan: filters.hasPlan, sort: sort.key, desc: String(sort.direction === "desc"),
    };
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== "")) as LotListQuery;
  }, [search, filters, time, sort]);

  useEffect(() => {
    if (!view) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void lotRepository.list({ ...query, page: String(page), pageSize: String(pageSize) }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setData(result.data);
          if (linkPending.current) { const code = linkPending.current.toLowerCase(); linkPending.current = ""; const linked = result.data.items.find((row) => row.lotCode.toLowerCase() === code); if (linked) setExpanded(linked.id); }
          if (result.data.total > 0 && page > Math.ceil(result.data.total / pageSize)) setPage(Math.ceil(result.data.total / pageSize));
        } else { setData(undefined); setError(operationError(result)); }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [view, query, page, pageSize, refresh]);

  function changed<T>(apply: (value: T) => void) { return (value: T) => { apply(value); setPage(1); setExpanded(undefined); }; }
  const setFilter = (key: keyof Filters) => changed<string>((value) => setFilters((current) => ({ ...current, [key]: value })));
  const setZone = changed<string>((zone) => setFilters((current) => ({ ...current, zone, raft: "" })));
  const reload = () => setRefresh((value) => value + 1);
  const hasFilter = Object.values(filters).some((value) => value !== "") || time.kind !== allTime.kind || time.from !== allTime.from || time.to !== allTime.to;
  const toggle = (id: string) => setExpanded((value) => value === id ? undefined : id);
  if (!view) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setFilters(emptyFilters); setTime(allTime); })()}>Đặt lại</button></div>
    <FilterPills legend="Trạng thái" name="lot-status" value={filters.status} options={lotStatusIds.map((id) => [String(id), lotStatusLabel[id]] as const)} onChange={setFilter("status")} />
    <TimeRangeFilter legend="Ngày thu hoạch" value={time} onChange={changed<TimeRangeValue>(setTime)} />
    <FilterGroup legend="Vùng"><SelectBox aria-label="Vùng" className={railSelect} value={filters.zone} onChange={(event) => setZone(event.target.value)}>
      <option value="">Tất cả vùng</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code || zone.name}</option>)}</SelectBox></FilterGroup>
    <FilterGroup legend="Bè"><SelectBox aria-label="Bè" className={railSelect} disabled={!filters.zone} value={filters.raft} onChange={(event) => setFilter("raft")(event.target.value)}>
      <option value="">{filters.zone ? "Tất cả bè" : "Chọn vùng trước"}</option>{(rafts.data ?? []).map((raft) => <option key={raft.id} value={raft.id}>{raft.code}</option>)}</SelectBox></FilterGroup>
    <FilterGroup legend="Sản phẩm"><SelectBox aria-label="Sản phẩm" className={railSelect} value={filters.product} onChange={(event) => setFilter("product")(event.target.value)}>
      <option value="">Tất cả sản phẩm</option>{(products.data ?? []).filter((product) => product.statusId === IN_USE || product.id === filters.product).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</SelectBox></FilterGroup>
    <FilterPills legend="Cân" name="lot-weighed" value={filters.weighed} options={[["true", "Đã cân"], ["false", "Chưa cân"]]} onChange={setFilter("weighed")} />
    <FilterPills legend="Lý do đóng" name="lot-close-reason" value={filters.closeReason} options={closeReasons.map((reason) => [reason, closeReasonLabel[reason]] as const)} onChange={setFilter("closeReason")} />
    <FilterPills legend="Kế hoạch thu hoạch" name="lot-has-plan" value={filters.hasPlan} options={[["true", "Có KHT"], ["false", "Không có KHT"]]} onChange={setFilter("hasPlan")} />
  </>;

  return <ManagementLayout storageKey="harvest-lots" icon="product" title="Lô thu hoạch" filters={rail} filterLabel="Bộ lọc lô thu hoạch"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="lô" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm lô thu hoạch" placeholder="Theo mã lô hoặc mã KHT" maxLength={100} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      <Button className="w-auto" variant="secondary" isPending={exportFile.pending} onClick={() => void exportFile.run(() => lotRepository.exportList(query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => store(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {exportFile.error && <div className={listStyles.feedback}><ErrorNotice error={exportFile.error} /></div>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{search || hasFilter ? "Không có lô thu hoạch phù hợp bộ lọc." : "Chưa có lô thu hoạch. Lô được tạo khi thu hoạch theo kế hoạch thu hoạch."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={changed<SortState>(setSort)} className={column.numeric ? issueStyles.num : undefined} />)}
        </tr></thead><tbody>
          <tr className={issueStyles.totalRow} aria-label="Tổng hợp theo bộ lọc"><td />{visible.map((column, index) => <td key={column.key} className={column.numeric ? issueStyles.num : undefined}>{column.total ? column.total(data.totals) : index === 0 ? `Tổng (${fmt(data.total)} lô)` : null}</td>)}</tr>
          {data.items.map((row) => <Fragment key={row.id}>
            <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => toggle(row.id)}>
              <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.lotCode}`} onClick={() => toggle(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map((column) => <td key={column.key} className={column.numeric ? issueStyles.num : undefined}>{column.render(row)}</td>)}
            </OpenableTableRow>
            {expanded === row.id && <DetailRow colSpan={visible.length + 1} className={listStyles.detailCell}><div className={managementStyles.viewWidth}>
              <LotDetailPanel id={row.id} zoneId={row.zoneId} startWeighing={weighLinked && row.lotCode.toLowerCase() === linkedCode.toLowerCase()} onChanged={reload} onRemoved={() => { setExpanded(undefined); reload(); }} />
            </div></DetailRow>}
          </Fragment>)}
        </tbody></table>}
    </ManagementScroller>
  </ManagementLayout>;
}

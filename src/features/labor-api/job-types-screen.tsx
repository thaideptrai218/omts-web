"use client";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { StatusPill } from "@/components/ui/management-page";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { Money, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { jobsPage } from "./contracts";
import { JobTypeCreateDialog } from "./job-types-create-dialog";
import { JobTypeDetailPanel } from "./job-types-detail";
import { IN_USE, NO_RATE, statusLabel, type Job } from "./job-types-model";
import { jobTypesRepository } from "./job-types-write";
import styles from "./job-types-screen.module.css";

type Column = { key: string; label: string; sort?: string; render(job: Job): ReactNode };
const columns: readonly Column[] = [
  { key: "name", label: "Loại công việc", sort: "name", render: job => <span className={styles.name}>{job.name}</span> },
  { key: "rate", label: "Đơn giá hiện tại / giờ", sort: "rate", render: job => job.currentRate ? <Money value={job.currentRate.hourlyRate} /> : "—" },
  { key: "from", label: "Hiệu lực từ", sort: "effectiveFrom", render: job => job.currentRate ? formatVietnameseDate(job.currentRate.effectiveFrom) : NO_RATE },
  { key: "status", label: "Trạng thái", sort: "status", render: job => <StatusPill tone={job.statusId === IN_USE ? "success" : "neutral"}>{statusLabel(job.statusId)}</StatusPill> },
];
const defaultColumns = columns.map(column => column.key).join(",");
const pageSizes = [10, 20, 50] as const;

/** Loại công việc và đơn giá: the management list, with the rate history and in-place edits inside the open row. */
export function JobTypesScreen({ helpHref }: { helpHref?: string }) {
  const context = useApiWorkspace();
  const allowed = (action: string) => operationAllowed("job-types", context.identity, context.permissions.functionPermissions, action);
  const canCreate = allowed("Create"), canEdit = allowed("Edit");
  const [search, setSearch] = useState(""), [term, setTerm] = useState(""), [status, setStatus] = useState("");
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20);
  // No header chosen: the backend keeps its default order (by name).
  const [sort, setSort] = useState<SortState>();
  const [expanded, setExpanded] = useState<string>(), [creating, setCreating] = useState(false), [notice, setNotice] = useState<string>();
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-job-types", defaultColumns);
  const visible = useMemo(() => { const keys = storedColumns.split(","), shown = columns.filter(column => keys.includes(column.key)); return shown.length ? shown : columns; }, [storedColumns]);

  useEffect(() => {
    if (search.trim() === term) return;
    const timer = setTimeout(() => { setTerm(search.trim()); setPage(1); setExpanded(undefined); }, 300);
    return () => clearTimeout(timer);
  }, [search, term]);
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => jobTypesRepository.read("list", { search: term, statusId: status || undefined, page: String(page), pageSize: String(pageSize), sortBy: sort?.key, sortDir: sort?.direction }, jobsPage, signal), [term, status, page, pageSize, sort]));
  // A saved job replaces its row until the next list load, so the open row keeps its subtab and draft after a write.
  const [saved, setSaved] = useState<{ base?: unknown; byId: Record<string, Job> }>({ byId: {} });
  const overrides = saved.base === remote.data ? saved.byId : {};
  const rows = remote.data?.items.map(job => overrides[job.id] ?? job) ?? [];
  const sync = (job: Job) => setSaved({ base: remote.data, byId: { ...overrides, [job.id]: job } });

  const changed = <T,>(apply: (value: T) => void) => (value: T) => { apply(value); setPage(1); setExpanded(undefined); setNotice(undefined); };
  const hasFilter = !!status || !!search;
  function afterStateChange() {
    setExpanded(undefined); setNotice("Đã cập nhật trạng thái loại công việc.");
    if (rows.length === 1 && page > 1) setPage(page - 1); else remote.reload();
  }
  const filters = <>
    <div className={styles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => { changed<void>(() => { setSearch(""); setTerm(""); setStatus(""); })(); }}>Đặt lại</button></div>
    <FilterPills legend="Trạng thái" name="job-type-status" value={status} options={[[String(IN_USE), "Đang dùng"], ["102", "Ngừng dùng"]]} onChange={changed<string>(setStatus)} />
  </>;

  return <ManagementLayout storageKey="job-types" icon="work" title="Loại công việc & đơn giá" filters={filters} filterLabel="Bộ lọc loại công việc"
    footer={<ManagementPagination page={remote.data?.page ?? page} pageSize={pageSize} total={remote.data?.total ?? 0} pageSizes={pageSizes} unit="loại công việc" disabled={remote.loading}
      onPage={next => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm loại công việc" placeholder="Theo tên loại công việc" maxLength={200} value={search} onChange={event => { setSearch(event.target.value); setNotice(undefined); }} />}
    actions={<>
      {canCreate && <Button className="w-auto" onClick={() => setCreating(true)}><InterfaceIcon name="add" className="mr-1 size-4" />Thêm loại công việc</Button>}
      <ColumnPicker columns={columns} visible={visible.map(column => column.key)} onChange={keys => storeColumns(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {notice && <p role="status" className={styles.feedback}>{notice} <button type="button" className={managementStyles.linkButton} onClick={() => setNotice(undefined)}>Đóng</button></p>}
    <ManagementScroller busy={remote.loading}>
      {remote.error ? <ListStateMessage error={remote.error} onRetry={remote.reload} retryLabel="Tải lại" />
        : remote.loading || !remote.data ? <div role="status" aria-label="Đang tải danh sách" className={styles.skeleton}>{[1, 2, 3, 4, 5].map(key => <div key={key} />)}</div>
        : !rows.length ? <ListStateMessage>{hasFilter ? "Không có loại công việc phù hợp bộ lọc." : "Chưa có loại công việc."}</ListStateMessage>
        : <table className={styles.table}><thead><tr>
          <th scope="col" className={styles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map(column => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort ?? { key: "", direction: "asc" }} onSort={changed<SortState>(setSort)} />)}
        </tr></thead><tbody>{rows.map(job => {
          const open = expanded === job.id, toggle = () => setExpanded(value => value === job.id ? undefined : job.id);
          return <Fragment key={job.id}>
            <OpenableTableRow data-selected={open || undefined} onOpen={toggle}>
              <td className={styles.expandCell}><button type="button" aria-expanded={open} aria-label={`${open ? "Thu gọn" : "Mở"} ${job.name}`} onClick={toggle}><InterfaceIcon name={open ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map(column => <td key={column.key}>{column.render(job)}</td>)}
            </OpenableTableRow>
            {open && <tr><td colSpan={visible.length + 1} className={styles.detailCell}><div className={managementStyles.viewWidth}><JobTypeDetailPanel record={job} canEdit={canEdit} onSynced={sync} onStateChanged={afterStateChange} /></div></td></tr>}
          </Fragment>;
        })}</tbody></table>}
    </ManagementScroller>
    {creating && <JobTypeCreateDialog onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setExpanded(undefined); setNotice("Đã thêm loại công việc."); remote.reload(); }} />}
  </ManagementLayout>;
}

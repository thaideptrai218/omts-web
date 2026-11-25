"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, Subtabs, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { useOptionalToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import { CertificationForm, certificationFileHref } from "./certification-form";
import { certificationSchema, type Certification } from "./contracts";
import { certificationRequest } from "./repository";
import { DetailRow } from "@/components/ui/management-screen/detail-pane";

export { CertificationEditor } from "./certification-form";

type State = Certification["state"];
const stateLabel: Record<State, string> = { Valid: "Còn hiệu lực", ExpiringSoon: "Sắp hết hạn", Expired: "Đã hết hạn" };
const stateTone: Record<State, "success" | "danger" | "neutral"> = { Valid: "success", ExpiringSoon: "neutral", Expired: "danger" };
const stateRank: Record<State, number> = { Valid: 0, ExpiringSoon: 1, Expired: 2 };
const dash = (value: string | null) => value || "—";
const date = (value: string | null) => value ? formatVietnameseDate(value) : "—";
const sorters: Record<string, (a: Certification, b: Certification) => number> = {
  name: (a, b) => a.name.localeCompare(b.name, "vi"),
  number: (a, b) => (a.number ?? "").localeCompare(b.number ?? "", "vi"),
  issuer: (a, b) => (a.issuer ?? "").localeCompare(b.issuer ?? "", "vi"),
  expiryDate: (a, b) => (a.expiryDate ?? "").localeCompare(b.expiryDate ?? ""),
  state: (a, b) => stateRank[a.state] - stateRank[b.state],
};
const columns = [
  { key: "name", label: "Chứng nhận", render: (row: Certification) => <span className={listStyles.name}>{row.name}</span> },
  { key: "number", label: "Số", render: (row: Certification) => dash(row.number) },
  // A long issuer name is cut with an ellipsis (full name on hover and in the row detail), so the expiry and validity columns stay in view.
  { key: "issuer", label: "Đơn vị cấp", render: (row: Certification) => <span title={row.issuer ?? undefined} style={{ display: "inline-block", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>{dash(row.issuer)}</span> },
  { key: "expiryDate", label: "Ngày hết hạn", render: (row: Certification) => date(row.expiryDate) },
  { key: "state", label: "Hiệu lực", render: (row: Certification) => <StatusPill tone={stateTone[row.state]}>{stateLabel[row.state]}</StatusPill> },
] as const;
const listLoader = (signal: AbortSignal) => certificationRequest("list", z.array(certificationSchema), undefined, undefined, undefined, signal);

export function CertificationsScreen({ helpHref }: { helpHref?: string }) {
  const context = useApiWorkspace();
  if (context.identity.subjectType !== "CooperativeOwner") return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền quản lý chứng nhận hợp tác xã.</p>;
  return <CertificationList helpHref={helpHref} />;
}

function CertificationList({ helpHref }: { helpHref?: string }) {
  const [search, setSearch] = useState(""), [validity, setValidity] = useState(""), [sort, setSort] = useState<SortState>({ key: "expiryDate", direction: "desc" });
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [refresh, setRefresh] = useState(0);
  const [rows, setRows] = useState<readonly Certification[]>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>();
  const [expanded, setExpanded] = useState<string>(), [creating, setCreating] = useState(false);

  // The whole list is read at once (there is no paging on the server); the rows stay while a reload runs so an open row does not collapse.
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setLoading(true); setError(undefined);
      return listLoader(controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") setRows(result.data); else { setRows(undefined); setError(workspaceError(result)); }
      });
    });
    return () => controller.abort();
  }, [refresh]);

  const shown = useMemo(() => {
    const term = foldVietnamese(search.trim());
    const matching = (rows ?? []).filter((row) => (!validity || row.state === validity) && (!term || foldVietnamese(`${row.name} ${row.number ?? ""} ${row.issuer ?? ""}`).includes(term)));
    const order = sorters[sort.key] ?? sorters.name, sign = sort.direction === "asc" ? 1 : -1;
    return [...matching].sort((a, b) => sign * order(a, b));
  }, [rows, search, validity, sort]);
  const lastPage = Math.max(1, Math.ceil(shown.length / pageSize)), current = Math.min(page, lastPage);
  const pageRows = shown.slice((current - 1) * pageSize, current * pageSize);

  function changed<T>(apply: (value: T) => void) { return (value: T) => { apply(value); setPage(1); setExpanded(undefined); }; }
  const reload = () => setRefresh((value) => value + 1);
  const toggle = (id: string) => setExpanded((value) => value === id ? undefined : id);

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!validity} onClick={() => changed<string>(setValidity)("")}>Đặt lại</button></div>
    <FilterPills legend="Hiệu lực" name="certification-validity" value={validity} options={(Object.keys(stateLabel) as State[]).map((key) => [key, stateLabel[key]] as const)} onChange={changed<string>(setValidity)} />
  </>;

  return <ManagementLayout storageKey="certifications" icon="document" title="Chứng nhận HTX" filters={rail} filterLabel="Bộ lọc chứng nhận"
    footer={<ManagementPagination page={current} pageSize={pageSize} total={shown.length} unit="chứng nhận" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm chứng nhận" placeholder="Theo tên, số hoặc đơn vị cấp" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      <Button className="w-auto" onClick={() => setCreating(true)}><InterfaceIcon name="add" className="mr-1 size-4" />Thêm chứng nhận</Button>
      <HelpLink helpHref={helpHref} />
    </>}>
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !rows ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !shown.length ? <ListStateMessage>{search || validity ? "Không có chứng nhận phù hợp bộ lọc." : "Chưa có chứng nhận. Bấm “Thêm chứng nhận” để tải hồ sơ đầu tiên."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {columns.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.key} sort={sort} onSort={changed<SortState>(setSort)} />)}
        </tr></thead><tbody>{pageRows.map((row) => <Fragment key={row.id}>
          <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => toggle(row.id)}>
            <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.name}`} onClick={() => toggle(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
            {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
          </OpenableTableRow>
          {expanded === row.id && <DetailRow colSpan={columns.length + 1} className={listStyles.detailCell}><div className={managementStyles.viewWidth}>
            <CertificationDetail record={row} onChanged={reload} onRemoved={() => { setExpanded(undefined); reload(); }} />
          </div></DetailRow>}
        </Fragment>)}</tbody></table>}
    </ManagementScroller>
    {creating && <CertificationForm record={null} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); setExpanded(undefined); reload(); }} />}
  </ManagementLayout>;
}

/** The one tab of an open certification: its facts and the attached file, edited in place. */
function CertificationDetail({ record, onChanged, onRemoved }: { record: Certification; onChanged(): void; onRemoved(): void }) {
  const [tab, setTab] = useState<"info">("info"), [editing, setEditing] = useState(false);
  const mutation = useMutation(), confirmation = useActionDialog(), toast = useOptionalToast();
  const href = certificationFileHref(record);
  async function remove() {
    if (mutation.pending || !(await confirmation.confirm(`Xóa chứng nhận “${record.name}” và tệp đính kèm?`))) return;
    const result = await mutation.run(() => certificationRequest("remove", z.object({ messageCode: z.string() }), record.id, { rowVersion: record.rowVersion }));
    if (!result) return;
    toast?.notify({ tone: "success", title: `Đã xóa chứng nhận ${record.name}.` });
    onRemoved();
  }
  const facts: [string, string][] = [["Chứng nhận", record.name], ["Số chứng nhận", dash(record.number)], ["Đơn vị cấp", dash(record.issuer)], ["Ngày hết hạn", date(record.expiryDate)], ["Hiệu lực", stateLabel[record.state]]];
  return <section className={listStyles.detail} aria-label="Chi tiết chứng nhận">
    <Subtabs<"info"> label="Nội dung chứng nhận" tabs={[{ key: "info", label: "Thông tin" }]} value={tab} onChange={setTab} />
    {editing
      ? <div className={listStyles.tabBody}><CertificationForm inline record={record} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} /></div>
      : <div className={listStyles.tabBody}>{confirmation.dialog}
        <dl className={listStyles.facts}>
          {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          <div><dt>Tệp đính kèm</dt><dd>{href ? <a className="text-primary underline" href={href} target="_blank" rel="noopener noreferrer">Mở tệp chứng nhận</a> : "—"}</dd></div>
        </dl>
        <ErrorNotice error={mutation.error} />
        {mutation.blocked && <p role="alert" className="my-3 text-sm text-danger">Hãy tải lại danh sách và đối chiếu kết quả trước khi lập lượt thao tác mới. <button type="button" className={managementStyles.linkButton} onClick={() => { onChanged(); mutation.reviewed(); }}>Tải lại danh sách</button></p>}
        <footer className={listStyles.tabFooter}>
          <div><Button className="w-auto" variant="ghost" isPending={mutation.pending} disabled={mutation.blocked} onClick={() => void remove()}><InterfaceIcon name="trash" className="size-4" />Xóa</Button></div>
          <div><Button className="w-auto" disabled={mutation.pending} onClick={() => setEditing(true)}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button></div>
        </footer>
      </div>}
  </section>;
}

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StaffRoleSummary } from "@/features/personal-api/staff-role-summary";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { DataGrid } from "@/components/ui/data-grid";
import { ManagementHeading, StatusPill } from "@/components/ui/management-page";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/form/form-field";
import { useApiWorkspace } from "./api-workspace-shell";
import { knownRoleNameLabel } from "@/shared/presentation/actor-label";
import { resources, resourceCategoryFilters, resourceAllowed, type ResourceKey } from "./resources";
import { createWorkspaceRepository, type ApiPage, type ApiRecord } from "./workspace-repository";
import { ResourceExtras } from "@/features/farming-api/resource-extras";
import { RecordMap } from "@/features/farming-api/record-map";
import { EmployeeApiScreen } from "@/features/employee-api/employee-screen";
import { workspaceError } from "./workspace-error";
import { ZoneMapDialog } from "@/features/farming-api/zone-map-dialog";
import { loadOptions } from "@/features/operations/lookups";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useDirectoryView } from "@/components/ui/use-directory-view";
export { workspaceError } from "./workspace-error";

const inputClass = "mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 py-2";
const directoryPresentation = {
  customers: { icon: "users", description: "Quản lý hồ sơ khách hàng, thông tin liên hệ và tài khoản thương lái liên kết." },
  zones: { icon: "zone", description: "Tìm vùng nuôi và mở hồ sơ để xem vị trí, bè và thông tin chi tiết." },
  rafts: { icon: "raft", description: "Tra cứu bè trong vùng được cấp và mở hồ sơ làn, vị trí, giấy tờ." },
  suppliers: { icon: "users", description: "Tra cứu nhà cung cấp, liên hệ và trạng thái sử dụng." },
  "input-items": { icon: "document", description: "Tra cứu vật tư, nhóm và đơn vị tính trước khi lập chứng từ." },
  accounts: { icon: "account", description: "Xem tài khoản nội bộ, tình trạng và hồ sơ liên quan." },
  roles: { icon: "roles", description: "Đối chiếu vai trò và quyền hiện hành của hệ thống." },
} as const;
const directoryActions: Partial<Record<ResourceKey, { create: string; open: string }>> = {
  customers: { create: "Thêm khách hàng", open: "Mở khách hàng" },
  suppliers: { create: "Thêm nhà cung cấp", open: "Mở nhà cung cấp" },
  "input-items": { create: "Thêm vật tư", open: "Mở vật tư" },
};
function text(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "object") return Array.isArray(value) ? value.map((entry) => typeof entry === "object" && entry ? String(entry.name ?? entry.roleName ?? entry.role ?? "") : String(entry)).filter(Boolean).join(", ") || "—" : "—";
  return String(value);
}

export function ApiResourceScreen({ resource }: { resource: ResourceKey }) {
  return resource === "employees" ? <EmployeeApiScreen /> : <GenericResourceScreen resource={resource} />;
}
function GenericResourceScreen({ resource }: { resource: ResourceKey }) {
  const context = useApiWorkspace();
  const params = useSearchParams();
  const accountQuery = params.getAll(resource === "accounts" ? "accountId" : "recordId");
  const initialAccountId = ["accounts", "zones", "rafts"].includes(resource) && accountQuery.length === 1 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountQuery[0]) ? accountQuery[0] : undefined;
  const definition = resources[resource];
  const categoryFilter = resourceCategoryFilters[resource];
  const repository = useMemo(() => createWorkspaceRepository(resource), [resource]);
  const [page, setPage] = useState<ApiPage>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [view, setView] = useDirectoryView(resource, "grid", ["grid", "table"] as const);
  const [refresh, setRefresh] = useState(0);
  const [zones, setZones] = useState<ApiRecord[]>([]);
  const [zoneError, setZoneError] = useState<string>();
  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneRefresh, setZoneRefresh] = useState(0);
  const [zoneId, setZoneId] = useState("");
  const [selected, setSelected] = useState<ApiRecord | null>();
  const [editorId, setEditorId] = useState(0);
  const [opening, setOpening] = useState(false);
  const openGeneration = useRef(0);
  const [notice, setNotice] = useState<string>();
  const [mapOpen, setMapOpen] = useState(false);
  const canView = resourceAllowed(resource, context.identity, context.permissions.functionPermissions);
  const canCreate = definition.editable && definition.creatable !== false && resourceAllowed(resource, context.identity, context.permissions.functionPermissions, "Create");
  const canEdit = definition.editable && resourceAllowed(resource, context.identity, context.permissions.functionPermissions, "Edit");

  useEffect(() => {
    if (!initialAccountId || !canView) return;
    const controller = new AbortController(), generation = ++openGeneration.current;
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setOpening(true); setError(undefined);
      const result = await repository.detail(initialAccountId, controller.signal);
      if (controller.signal.aborted || generation !== openGeneration.current) return;
      setOpening(false);
      if (result.status === "success") { if (resource === "rafts" && typeof result.data.zoneId === "string") setZoneId(result.data.zoneId); setSelected(result.data); setEditorId((value) => value + 1); }
      else setError(workspaceError(result));
    });
    return () => { controller.abort(); };
  }, [initialAccountId, canView, repository, resource]);

  useEffect(() => {
    const controller = new AbortController();
    if (definition.zoneRequired && canView) {
      void Promise.resolve().then(async () => {
        if (controller.signal.aborted) return;
        setZoneLoading(true); setZoneError(undefined);
        const result = await loadOptions("zones", controller.signal);
        if (controller.signal.aborted) return;
        setZoneLoading(false);
        if (result.status === "success") {
          setZones(result.data);
          setZoneId((current) => result.data.some((zone) => zone.id === current) ? current : result.data[0]?.id || "");
        } else { setZones([]); setZoneId(""); setZoneError(workspaceError(result)); }
      });
    }
    return () => controller.abort();
  }, [definition.zoneRequired, canView, zoneRefresh]);

  useEffect(() => {
    const controller = new AbortController();
    if (!canView || (definition.zoneRequired && !zoneId)) return () => controller.abort();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void repository.list({ page: String(pageNumber), pageSize: String(pageSize), ...(search ? { search } : {}),
        ...(filter ? { statusId: filter } : {}), ...(category && categoryFilter ? { [categoryFilter.key]: category } : {}), ...(zoneId ? { zoneId } : {}) }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setPage(result.data);
          if (result.data.page !== pageNumber) setPageNumber(result.data.page);
        }
        else { setPage(undefined); setError(workspaceError(result)); }
      });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [repository, resource, search, filter, category, categoryFilter, pageNumber, pageSize, refresh, zoneId, canView, definition]);
  useEffect(() => () => { openGeneration.current++; }, []);

  async function open(record: ApiRecord) {
    const generation = ++openGeneration.current;
    setOpening(true); setError(undefined);
    const result = await repository.detail(record.id);
    if (generation !== openGeneration.current) return;
    setOpening(false);
    if (result.status === "success") { setSelected(result.data); setEditorId((value) => value + 1); }
    else setError(workspaceError(result));
  }
  if (!canView) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;
  const statuses = resource === "accounts" ? [["301", "Hoạt động"], ["302", "Đã khóa"]]
    : resource === "employees" ? [["401", "Đang làm việc"], ["402", "Đã nghỉ việc"]] : [["101", "Đang dùng"], ["102", "Ngừng dùng"]];
  const presentation = directoryPresentation[resource as keyof typeof directoryPresentation];
  const actions = directoryActions[resource];
  const valueLabel = (key: string, row: ApiRecord) => {
    if (resource === "customers" && key === "hasTraderAccount" && row.hasTraderAccount === undefined) return row.traderAccount ? "Có" : "Không";
    if (key === "status") {
      const id = Number(row.statusId);
      if (id === 101) return "Đang dùng";
      if (id === 102) return "Ngừng dùng";
      if (id === 301) return "Hoạt động";
      if (id === 302) return "Đã khóa";
      const status = String(row.status ?? "");
      return ({ Active: "Hoạt động", Locked: "Đã khóa", InUse: "Đang dùng", "In Use": "Đang dùng", Discontinued: "Ngừng dùng" } as Record<string, string>)[status] ?? text(row.status);
    }
    if (key === "supplierType" || key === "group") return ({ Seed: "Giống", Material: "Vật tư", Other: "Khác" } as Record<string, string>)[String(row[key])] ?? text(row[key]);
    if (resource === "roles" && key === "name") return knownRoleNameLabel(String(row.name ?? ""));
    return text(row[key]);
  };
  return <section>
    <ManagementHeading title={definition.title} description={presentation.description} icon={presentation.icon}>
      {resource === "zones" && <Button className="w-auto" variant="secondary" onClick={() => setMapOpen(true)}>Vị trí vùng và bè</Button>}
      {canCreate && <Button className="w-auto" disabled={definition.zoneRequired && !zoneId} onClick={() => { setSelected(null); setEditorId((value) => value + 1); }}>{actions?.create ?? "Thêm mới"}</Button>}
    </ManagementHeading>
    {resource === "roles" && <StaffRoleSummary />}
    {mapOpen && <ZoneMapDialog onClose={() => setMapOpen(false)} />}
    <div className={`grid gap-3 rounded-card border border-border bg-surface p-4 sm:grid-cols-2 ${resource === "suppliers" || resource === "input-items" ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
      <label className="min-w-0 text-sm font-semibold">Tìm kiếm<input type="search" className={inputClass} value={search} onChange={(event) => { setSearch(event.target.value); setPageNumber(1); }} /></label>
      {resource !== "roles" && resource !== "customers" && <label className="min-w-0 text-sm font-semibold">Trạng thái<select className={inputClass} value={filter} onChange={(event) => { setFilter(event.target.value); setPageNumber(1); }}>
        <option value="">Tất cả</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      {categoryFilter && <label className="min-w-0 text-sm font-semibold">{categoryFilter.label}<select className={inputClass} value={category} onChange={(event) => { setCategory(event.target.value); setPageNumber(1); }}>
        <option value="">Tất cả</option>{categoryFilter.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      {definition.zoneRequired && <label className="min-w-0 text-sm font-semibold">Vùng nuôi<select className={inputClass} disabled={zoneLoading || !!zoneError} value={zoneId} onChange={(event) => { setZoneId(event.target.value); setPageNumber(1); }}>
        <option value="">Chọn vùng</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{text(zone.name)}</option>)}</select></label>}
    </div>
    {zoneError && <div role="alert" className="mt-4 rounded-control border border-danger p-4"><p>{zoneError}</p><Button className="mt-3 w-auto" variant="secondary" disabled={zoneLoading} onClick={() => setZoneRefresh((value) => value + 1)}>Tải lại danh mục vùng</Button></div>}
    {zoneLoading && <p role="status" className="mt-3">Đang tải danh mục vùng...</p>}
    {(resource === "zones" || resource === "rafts") && <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-text-muted">{page?.total ?? 0} {resource === "zones" ? "vùng nuôi" : "bè nuôi"}</p><div className="flex gap-1 rounded-control border border-border bg-surface-subtle p-1" role="group" aria-label="Cách hiển thị danh sách"><Button className="size-9 w-auto p-0" title="Dạng lưới" aria-label="Dạng lưới" variant={view === "grid" ? "primary" : "secondary"} aria-pressed={view === "grid"} onClick={() => setView("grid")}><InterfaceIcon name="grid" /></Button><Button className="size-9 w-auto p-0" title="Dạng bảng" aria-label="Dạng bảng" variant={view === "table" ? "primary" : "secondary"} aria-pressed={view === "table"} onClick={() => setView("table")}><InterfaceIcon name="list" /></Button></div></div>}
    {notice && <p role="status" className="mt-4 text-primary">{notice}</p>}
    {error && <div role="alert" className="mt-4 rounded-control border border-danger p-4"><p>{error}</p>
      <Button className="mt-3 w-auto" variant="secondary" onClick={() => setRefresh((value) => value + 1)}>Tải lại</Button></div>}
    {definition.zoneRequired && !zoneId ? <p className="mt-5">Chọn vùng nuôi để xem danh sách bè.</p> : loading ? <div className="mt-5 space-y-3" role="status" aria-label="Đang tải danh sách">{[1, 2, 3, 4].map((value) => <div key={value} className="h-14 animate-pulse rounded-control bg-slate-200" />)}</div>
      : (resource === "zones" || resource === "rafts") && view === "grid" ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{page?.items.length ? page.items.map((row) => <article key={row.id} className="relative min-w-0 rounded-card border border-border bg-surface p-4 transition hover:border-primary/50 hover:shadow-sm"><div className="flex items-start justify-between gap-3"><h2 className="break-words font-semibold">{text(row.name ?? row.code)}</h2><StatusPill tone={Number(row.statusId) === 101 ? "success" : "neutral"}>{valueLabel("status", row)}</StatusPill></div><dl className="mt-4 grid gap-2 text-sm">{definition.columns.filter(([key]) => key !== "status" && (key !== "name" || resource !== "zones")).map(([key, label]) => <div key={key} className="flex justify-between gap-3"><dt className="text-text-muted">{label}</dt><dd className="text-right font-medium">{valueLabel(key, row)}</dd></div>)}</dl><button type="button" className="absolute inset-0 rounded-card focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait" aria-label={`Xem ${text(row.name ?? row.code)}`} disabled={opening} onClick={() => void open(row)}><span className="sr-only">Mở hồ sơ</span></button></article>) : <p className="rounded-card border border-border p-5 text-text-muted md:col-span-2 xl:col-span-3">Không có bản ghi phù hợp bộ lọc.</p>}</div>
      : <div className="mt-4"><DataGrid responsive headings={[...definition.columns.map(([, label]) => label), "Hồ sơ"]} empty={!page?.items.length}>
        {page?.items.map((row) => <tr key={row.id}>{definition.columns.map(([key, label]) => <td key={key} data-label={label} className={key === "code" || key === "username" ? "font-mono tabular-nums" : ""}>{key === "status" ? <StatusPill tone={[101, 301].includes(Number(row.statusId)) || row.status === "Active" ? "success" : "neutral"}>{valueLabel(key, row)}</StatusPill> : valueLabel(key, row)}</td>)}
          <td data-label="Hồ sơ"><button className="font-semibold text-primary underline underline-offset-4 hover:text-primary-hover" disabled={opening} onClick={() => void open(row)}>{actions?.open ?? "Mở hồ sơ"}</button></td></tr>)}
      </DataGrid></div>}
    {page && <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p>{page.total} bản ghi · Trang {page.page}/{Math.max(1, Math.ceil(page.total / page.pageSize))}</p><div className="flex flex-wrap items-center gap-2"><label className="text-sm">Số dòng/trang <select className="ml-2 rounded-control border border-border px-2 py-2" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPageNumber(1); }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label>
      <Button className="w-auto" variant="secondary" disabled={loading || pageNumber <= 1} onClick={() => setPageNumber((value) => value - 1)}>Trước</Button>
      <Button className="w-auto" variant="secondary" disabled={loading || pageNumber * page.pageSize >= page.total} onClick={() => setPageNumber((value) => value + 1)}>Sau</Button></div></div>}
    {selected !== undefined && <ResourceEditor key={editorId} resource={resource} record={selected} canEdit={canEdit} zones={zones} zoneId={zoneId}
      onClose={() => { openGeneration.current++; setSelected(undefined); }} onSaved={(saved) => {
        setSelected(saved); setEditorId((value) => value + 1); setRefresh((value) => value + 1); setNotice("Đã lưu dữ liệu.");
      }} />}
  </section>;
}

function ResourceEditor({ resource, record, canEdit, zones, zoneId, onClose, onSaved }: {
  resource: ResourceKey; record: ApiRecord | null; canEdit: boolean; zones: ApiRecord[]; zoneId: string;
  onClose(): void; onSaved(record: ApiRecord): void;
}) {
  const confirmation = useActionDialog();
  const definition = resources[resource];
  const repository = useMemo(() => createWorkspaceRepository(resource), [resource]);
  const original = useRef(record);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(definition.fields.map((field) => [field.key, record?.[field.key] == null ? "" : String(record[field.key])])));
  const [seedUnit, setSeedUnit] = useState<string | null>();
  const [proposalError, setProposalError] = useState<string>();
  const [proposalRefresh, setProposalRefresh] = useState(0);
  useEffect(() => {
    if (resource !== "input-items" || record || !canEdit) return;
    const controller = new AbortController();
    void repository.proposal(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.status === "success") {
        setSeedUnit(result.data.seedUnit); setProposalError(undefined);
        setValues((current) => ({ ...current, code: current.code || result.data.code,
          unit: current.group === "Seed" && result.data.seedUnit ? result.data.seedUnit : current.unit }));
      } else if (result.httpStatus === 404) {
        // Older backend contracts have no code proposal; the editable code and unit fields remain available.
        setProposalError(undefined);
      } else setProposalError(workspaceError(result));
    });
    return () => controller.abort();
  }, [resource, record, canEdit, repository, proposalRefresh]);
  const discontinued = record?.statusId === 102 && ["suppliers", "input-items"].includes(resource);
  const lockedField = (key: string) => resource === "customers" && key === "phoneNumber" && record?.phoneLocked === true || resource === "input-items" && ((record?.isUsed === true && ["group", "unit"].includes(key)) || key === "unit" && values.group === "Seed" && !!seedUnit);
  const [workingZoneIds, setWorkingZoneIds] = useState<string[]>(() => Array.isArray(record?.workingZones) ? record.workingZones.map((zone) => zone.id) : []);
  const [bank, setBank] = useState<Record<string, string>>(() => record?.bankAccount && typeof record.bankAccount === "object" ? record.bankAccount as Record<string, string> : { bankName: "", accountNumber: "", accountHolderName: "" });
  const [laneCount, setLaneCount] = useState(String(record?.laneCount ?? 1));
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState<string>();
  const [blocked, setBlocked] = useState(false);
  const [problemField, setProblemField] = useState<string>();
  const [duplicateId, setDuplicateId] = useState<string>();
  const [duplicate, setDuplicate] = useState<ApiRecord>();
  const [latest, setLatest] = useState<ApiRecord>();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const dirty = definition.fields.some((field) => values[field.key] !== (record?.[field.key] == null ? "" : String(record[field.key])))
    || resource === "employees" && (JSON.stringify(workingZoneIds) !== JSON.stringify(Array.isArray(record?.workingZones) ? record.workingZones.map((zone) => zone.id) : [])
      || JSON.stringify(bank) !== JSON.stringify(record?.bankAccount ?? { bankName: "", accountNumber: "", accountHolderName: "" }))
    || resource === "rafts" && laneCount !== String(record?.laneCount ?? 1);
  const statusEditable = definition.editable && (record ? canEdit : true);
  const editable = statusEditable && !discontinued && !(resource === "customers" && record?.mergedIntoCustomerId);
  async function mutate(action: "create" | "update" | "discontinue" | "reactivate" | "lock" | "unlock", reason?: string) {
    if (pendingRef.current || blocked || ((action === "create" || action === "update") && !editable)) return;
    pendingRef.current = true; setPending(true); setError(undefined); setProblemField(undefined); setDuplicateId(undefined); setDuplicate(undefined);
    const body: Record<string, unknown> = action === "lock" || action === "unlock" ? { reason }
      : action === "discontinue" || action === "reactivate" ? { rowVersion: original.current?.rowVersion }
      : Object.fromEntries(definition.fields.map((field) => [field.key, field.type === "number" ? values[field.key] === "" ? null : Number(values[field.key]) : values[field.key] || null]));
    if (action === "update") body.rowVersion = original.current?.rowVersion;
    if (resource === "employees" && (action === "create" || action === "update")) {
      body.workingZoneIds = workingZoneIds;
      body.bankAccount = Object.values(bank).some(Boolean) ? bank : null;
      body.accountId = record?.account && typeof record.account === "object" && "id" in record.account ? record.account.id : null;
    }
    if (resource === "rafts" && (action === "create" || action === "update")) {
      body.laneCount = Number(laneCount);
    }
    const result = await repository.mutate(action, body, record?.id, zoneId || undefined);
    pendingRef.current = false;
    if (!mounted.current) return;
    setPending(false);
    if (result.status === "success") onSaved(result.data);
    else {
      setError(workspaceError(result)); setBlocked(result.uncertain || result.code === "MSG06");
      setProblemField(result.catalogueProblem?.field); setDuplicateId(result.catalogueProblem?.existingId);
    }
  }
  return <Dialog open title={`${record ? "Hồ sơ" : "Thêm mới"} · ${definition.title}`} size="lg" dismissible={!pending} onOpenChange={async (open) => {
    if (!open && !pendingRef.current && (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) onClose();
  }}>{confirmation.dialog}
    <form onSubmit={(event) => { event.preventDefault(); void mutate(record ? "update" : "create"); }}>
      {discontinued && <p className="mb-4">Khôi phục sử dụng trước khi chỉnh sửa hồ sơ.</p>}
      {resource === "customers" && record?.phoneLocked === true && <p className="mb-4 text-sm text-text-muted">Số điện thoại được đồng bộ từ tài khoản thương lái và không chỉnh sửa tại hồ sơ khách hàng.</p>}
      {resource === "customers" && !!record?.mergedIntoCustomerId && <p className="mb-4">Hồ sơ đã được gộp vào khách hàng khác, chỉ được xem.</p>}
      {proposalError && <div role="alert"><p>{proposalError}</p><Button variant="secondary" onClick={() => setProposalRefresh((value) => value + 1)}>Tải lại mã gợi ý và đơn vị giống</Button></div>}
      {error && <p role="alert" className="mb-4 rounded-control border border-danger p-4">{error}</p>}
      {problemField && <p role="alert">Kiểm tra trường: {definition.fields.find((field) => field.key === problemField)?.label ?? "Thông tin danh mục"}.</p>}
      {duplicateId && <section className="my-4 space-y-3"><Button variant="secondary" disabled={pending} onClick={async () => {
        if (pendingRef.current) return; pendingRef.current = true; setPending(true);
        const result = await repository.detail(duplicateId); pendingRef.current = false;
        if (!mounted.current) return; setPending(false);
        if (result.status === "success") setDuplicate(result.data); else setError(workspaceError(result));
      }}>Xem bản ghi trùng</Button>{duplicate && <dl>{definition.fields.map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{text(duplicate[field.key])}</dd></div>)}</dl>}</section>}
      <fieldset disabled={pending || !editable} className="grid gap-4 sm:grid-cols-2">
        {definition.fields.map((field) => field.type === "select" ? <label key={field.key} className="text-sm font-semibold">{field.label}<select required={field.required} className={inputClass}
          value={values[field.key]} disabled={lockedField(field.key)} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value,
            ...(field.key === "group" && event.target.value === "Seed" && seedUnit ? { unit: seedUnit } : {}) }))}>
          <option value="">Chọn</option>{field.options?.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          : field.type === "textarea" ? <label key={field.key} className="text-sm font-semibold sm:col-span-2">{field.label}<textarea className={inputClass} rows={3} value={values[field.key]}
            onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /></label>
          : <FormField key={field.key} id={`api-${field.key}`} label={field.label} type={field.type === "number" || field.type === "date" ? field.type : "text"}
            disabled={lockedField(field.key)} required={field.required || resource === "customers" && field.key === "phoneNumber" && record?.phoneLocked !== true} step={field.type === "number" ? "any" : undefined} value={values[field.key]} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />)}
        {resource === "employees" && <>
          <fieldset className="rounded-control border border-border p-4 sm:col-span-2"><legend>Vùng làm việc</legend>{zones.map((zone) => <label className="mr-4 inline-flex items-center gap-2 py-2" key={zone.id}>
            <input type="checkbox" checked={workingZoneIds.includes(zone.id)} onChange={(event) => setWorkingZoneIds((current) => event.target.checked ? [...current, zone.id] : current.filter((value) => value !== zone.id))} />{text(zone.name)}</label>)}</fieldset>
          {[["bankName", "Ngân hàng"], ["accountNumber", "Số tài khoản"], ["accountHolderName", "Chủ tài khoản"]].map(([key, label]) => <FormField key={key} id={`api-${key}`} label={label} value={bank[key] ?? ""} onChange={(event) => setBank((current) => ({ ...current, [key]: event.target.value }))} />)}
        </>}
        {resource === "rafts" && <div className="sm:col-span-2"><FormField id="api-lane-count" label="Số làn đang dùng" type="number" min="1" step="1" required value={laneCount} onChange={(event) => setLaneCount(event.target.value)} /></div>}
      </fieldset>
      {record && <div className="mt-5 rounded-control border border-border p-4"><dl className="grid gap-3 sm:grid-cols-2">{definition.columns.map(([key, label]) => <div key={key}><dt className="text-sm text-text-muted">{label}</dt><dd>{text(resource === "rafts" && key === "laneCount" && record[key] == null && Array.isArray(record.lanes) ? record.lanes.length : record[key])}</dd></div>)}
        {resource === "customers" && <><div><dt className="text-sm text-text-muted">Công nợ hiện tại</dt><dd>{typeof record.currentDebt === "number" ? `${record.currentDebt.toLocaleString("vi-VN")} ₫` : "—"}</dd></div><div><dt className="text-sm text-text-muted">Tài khoản thương lái</dt><dd>{record.traderAccount && typeof record.traderAccount === "object" && "displayName" in record.traderAccount ? String(record.traderAccount.displayName) : "Chưa liên kết"}</dd></div></>}
        {resource === "employees" && <div><dt className="text-sm text-text-muted">Tài khoản đăng nhập</dt><dd>{record.account && typeof record.account === "object" && "username" in record.account ? String(record.account.username) : "Chưa liên kết"}</dd></div>}</dl>
        {Array.isArray(record.lanes) && <ul className="mt-3">{record.lanes.map((lane) => <li key={lane.laneNumber}>Làn {lane.laneNumber}: {lane.statusId === 101 ? "Đang dùng" : "Đã ngừng"}</li>)}</ul>}
        {Array.isArray(record.permissions) && <ul className="mt-3 space-y-2">{record.permissions.map((permission) => <li key={permission.functionCode}>{permission.functionCode}: {permission.actions?.join(", ")}</li>)}</ul>}
      </div>}
      {blocked && record && <div className="mt-4 rounded-control border border-border p-4"><Button className="w-auto" variant="secondary" isPending={pending} onClick={async () => {
        if (pendingRef.current) return; setPending(true); pendingRef.current = true;
        const result = await repository.detail(record.id); pendingRef.current = false;
        if (!mounted.current) return; setPending(false);
        if (result.status === "success") setLatest(result.data); else setError(workspaceError(result));
      }}>Tải dữ liệu mới để đối chiếu</Button>
        {latest && <div className="mt-4"><p className="font-semibold">Dữ liệu hiện tại trên hệ thống</p><dl>{definition.fields.map((field) => <div key={field.key} className="mt-2"><dt className="text-sm text-text-muted">{field.label}</dt><dd>{text(latest[field.key])}</dd></div>)}</dl>
          <Button className="mt-4 w-auto" variant="secondary" onClick={async () => { if (await confirmation.confirm("Dùng dữ liệu mới và bỏ bản nháp đang mở?")) onSaved(latest); }}>Dùng dữ liệu mới</Button></div>}
      </div>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button className="w-auto" variant="secondary" disabled={pending} onClick={async () => { if (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?")) onClose(); }}>Đóng</Button>
        {editable && <Button className="w-auto" type="submit" isPending={pending} disabled={blocked || (record !== null && !dirty)}>Lưu</Button>}
        {statusEditable && record && ["zones", "suppliers", "input-items", "rafts"].includes(resource) && <Button className="w-auto" variant="secondary" disabled={pending || dirty || blocked} onClick={async () => {
          const action = record.statusId === 102 ? "reactivate" : "discontinue";
          if (await confirmation.confirm(action === "reactivate" ? "Khôi phục sử dụng bản ghi này?" : "Ngừng sử dụng bản ghi này?")) void mutate(action);
        }}>{record.statusId === 102 ? "Khôi phục" : "Ngừng dùng"}</Button>}
        {editable && record && resource === "accounts" && <Button className="w-auto" variant="secondary" disabled={pending || dirty || blocked} onClick={async () => {
          const action = record.status === "Locked" ? "unlock" : "lock";
          const reason = await confirmation.prompt(action === "lock" ? "Lý do khóa tài khoản" : "Lý do mở khóa tài khoản");
          if (reason?.trim()) void mutate(action, reason.trim());
        }}>{record.status === "Locked" ? "Mở khóa" : "Khóa tài khoản"}</Button>}
      </div>
    </form>
    {record && <><RecordMap resource={resource} record={record} /><ResourceExtras resource={resource} record={record} busy={pending} dirty={dirty} blocked={blocked} onSaved={onSaved} /></>}
  </Dialog>;
}

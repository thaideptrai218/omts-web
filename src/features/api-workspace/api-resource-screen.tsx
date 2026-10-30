"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/form/form-field";
import { useApiWorkspace } from "./api-workspace-shell";
import { resources, resourceCategoryFilters, resourceAllowed, type ResourceKey } from "./resources";
import { createWorkspaceRepository, type ApiPage, type ApiRecord } from "./workspace-repository";
import { ResourceExtras } from "@/features/farming-api/resource-extras";
import { EmployeeApiScreen } from "@/features/employee-api/employee-screen";
import { workspaceError } from "./workspace-error";
import { ZoneMapDialog } from "@/features/farming-api/zone-map-dialog";
import { loadOptions } from "@/features/operations/lookups";
export { workspaceError } from "./workspace-error";

const inputClass = "mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 py-2";
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
  const accountQuery = useSearchParams().getAll("accountId");
  const initialAccountId = resource === "accounts" && accountQuery.length === 1 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountQuery[0]) ? accountQuery[0] : undefined;
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
      if (result.status === "success") { setSelected(result.data); setEditorId((value) => value + 1); }
      else setError(workspaceError(result));
    });
    return () => { controller.abort(); };
  }, [initialAccountId, canView, repository]);

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
      void repository.list({ page: String(pageNumber), pageSize: "20", ...(search ? { search } : {}),
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
  }, [repository, resource, search, filter, category, categoryFilter, pageNumber, refresh, zoneId, canView, definition]);
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
  return <section>
    {resource === "zones" && <><Button className="mb-4 w-auto" variant="secondary" onClick={() => setMapOpen(true)}>Vị trí vùng và bè</Button>{mapOpen && <ZoneMapDialog onClose={() => setMapOpen(false)} />}</>}
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-semibold">{definition.title}</h1>
      {canCreate && <Button className="w-auto" disabled={definition.zoneRequired && !zoneId} onClick={() => { setSelected(null); setEditorId((value) => value + 1); }}>Thêm mới</Button>}</div>
    <div className="mt-5 flex flex-wrap gap-3">
      <label className="min-w-48 flex-1 text-sm">Tìm kiếm<input className={inputClass} value={search} onChange={(event) => { setSearch(event.target.value); setPageNumber(1); }} /></label>
      <label className="text-sm">Trạng thái<select className={inputClass} value={filter} onChange={(event) => { setFilter(event.target.value); setPageNumber(1); }}>
        <option value="">Tất cả</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {categoryFilter && <label className="text-sm">{categoryFilter.label}<select className={inputClass} value={category} onChange={(event) => { setCategory(event.target.value); setPageNumber(1); }}>
        <option value="">Tất cả</option>{categoryFilter.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      {definition.zoneRequired && <label className="text-sm">Vùng nuôi<select className={inputClass} disabled={zoneLoading || !!zoneError} value={zoneId} onChange={(event) => { setZoneId(event.target.value); setPageNumber(1); }}>
        <option value="">Chọn vùng</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{text(zone.name)}</option>)}</select></label>}
    </div>
    {zoneError && <div role="alert" className="mt-4 rounded-control border border-danger p-4"><p>{zoneError}</p><Button className="mt-3 w-auto" variant="secondary" disabled={zoneLoading} onClick={() => setZoneRefresh((value) => value + 1)}>Tải lại danh mục vùng</Button></div>}
    {zoneLoading && <p role="status" className="mt-3">Đang tải danh mục vùng...</p>}
    {notice && <p role="status" className="mt-4 text-primary">{notice}</p>}
    {error && <div role="alert" className="mt-4 rounded-control border border-danger p-4"><p>{error}</p>
      <Button className="mt-3 w-auto" variant="secondary" onClick={() => setRefresh((value) => value + 1)}>Tải lại</Button></div>}
    {definition.zoneRequired && !zoneId ? <p className="mt-5">Chọn vùng nuôi để xem danh sách bè.</p> : loading ? <div className="mt-5 space-y-3" role="status" aria-label="Đang tải danh sách">{[1, 2, 3, 4].map((value) => <div key={value} className="h-14 animate-pulse rounded-control bg-slate-200" />)}</div>
      : <div className="mt-5 overflow-x-auto rounded-card border border-border bg-surface"><table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-primary-soft"><tr>{definition.columns.map(([key, label]) => <th key={key} className="p-4">{label}</th>)}<th className="p-4">Hồ sơ</th></tr></thead>
        <tbody>{page?.items.map((row) => <tr key={row.id} className="border-b border-border last:border-0">{definition.columns.map(([key]) => <td key={key} className="p-4">{text(row[key])}</td>)}
          <td className="p-4"><button className="font-semibold text-primary underline" disabled={opening} onClick={() => void open(row)}>Mở hồ sơ</button></td></tr>)}</tbody>
      </table>{!page?.items.length && <p className="p-6 text-text-muted">Không có dữ liệu phù hợp.</p>}</div>}
    {page && <div className="mt-4 flex items-center justify-between gap-3"><p>{page.total} bản ghi · Trang {pageNumber}</p><div className="flex gap-2">
      <Button className="w-auto" variant="secondary" disabled={loading || pageNumber <= 1} onClick={() => setPageNumber((value) => value - 1)}>Trước</Button>
      <Button className="w-auto" variant="secondary" disabled={loading || pageNumber * 20 >= page.total} onClick={() => setPageNumber((value) => value + 1)}>Sau</Button></div></div>}
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
  const definition = resources[resource];
  const repository = useMemo(() => createWorkspaceRepository(resource), [resource]);
  const original = useRef(record);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(definition.fields.map((field) => [field.key, record?.[field.key] == null ? "" : String(record[field.key])])));
  const [workingZoneIds, setWorkingZoneIds] = useState<string[]>(() => Array.isArray(record?.workingZones) ? record.workingZones.map((zone) => zone.id) : []);
  const [bank, setBank] = useState<Record<string, string>>(() => record?.bankAccount && typeof record.bankAccount === "object" ? record.bankAccount as Record<string, string> : { bankName: "", accountNumber: "", accountHolderName: "" });
  const [lanes, setLanes] = useState<{ laneNumber: number; length: string; markerA: string; markerB: string }[]>(() => Array.isArray(record?.lanes)
    ? record.lanes.map((lane) => ({ laneNumber: lane.laneNumber, length: String(lane.length ?? ""), markerA: lane.markerA ?? "", markerB: lane.markerB ?? "" }))
    : [{ laneNumber: 1, length: "", markerA: "A", markerB: "B" }]);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState<string>();
  const [blocked, setBlocked] = useState(false);
  const [latest, setLatest] = useState<ApiRecord>();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const dirty = definition.fields.some((field) => values[field.key] !== (record?.[field.key] == null ? "" : String(record[field.key])))
    || resource === "employees" && (JSON.stringify(workingZoneIds) !== JSON.stringify(Array.isArray(record?.workingZones) ? record.workingZones.map((zone) => zone.id) : [])
      || JSON.stringify(bank) !== JSON.stringify(record?.bankAccount ?? { bankName: "", accountNumber: "", accountHolderName: "" }))
    || resource === "rafts" && JSON.stringify(lanes) !== JSON.stringify(Array.isArray(record?.lanes) ? record.lanes.map((lane) => ({ laneNumber: lane.laneNumber, length: String(lane.length ?? ""), markerA: lane.markerA ?? "", markerB: lane.markerB ?? "" })) : []);
  const editable = definition.editable && (record ? canEdit : true);
  async function mutate(action: "create" | "update" | "discontinue" | "reactivate" | "lock" | "unlock", reason?: string) {
    if (pendingRef.current || blocked) return;
    pendingRef.current = true; setPending(true); setError(undefined);
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
      body.lanes = lanes.map((lane) => ({ ...lane, length: lane.length === "" ? null : Number(lane.length) }));
      body.layoutDrawing = record?.layoutDrawing ?? null;
    }
    const result = await repository.mutate(action, body, record?.id, zoneId || undefined);
    pendingRef.current = false;
    if (!mounted.current) return;
    setPending(false);
    if (result.status === "success") onSaved(result.data);
    else { setError(workspaceError(result)); setBlocked(result.uncertain || result.code === "MSG06"); }
  }
  return <Dialog open title={`${record ? "Hồ sơ" : "Thêm mới"} · ${definition.title}`} size="lg" dismissible={!pending} onOpenChange={(open) => {
    if (!open && !pendingRef.current && (!dirty || window.confirm("Bỏ các thay đổi chưa lưu?"))) onClose();
  }}>
    <form onSubmit={(event) => { event.preventDefault(); void mutate(record ? "update" : "create"); }}>
      {error && <p role="alert" className="mb-4 rounded-control border border-danger p-4">{error}</p>}
      <fieldset disabled={pending || !editable} className="grid gap-4 sm:grid-cols-2">
        {definition.fields.map((field) => field.type === "select" ? <label key={field.key} className="text-sm font-semibold">{field.label}<select required={field.required} className={inputClass}
          value={values[field.key]} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>
          <option value="">Chọn</option>{field.options?.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          : field.type === "textarea" ? <label key={field.key} className="text-sm font-semibold sm:col-span-2">{field.label}<textarea className={inputClass} rows={3} value={values[field.key]}
            onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /></label>
          : <FormField key={field.key} id={`api-${field.key}`} label={field.label} required={field.required} type={field.type === "number" || field.type === "date" ? field.type : "text"}
            step={field.type === "number" ? "any" : undefined} value={values[field.key]} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />)}
        {resource === "employees" && <>
          <fieldset className="rounded-control border border-border p-4 sm:col-span-2"><legend>Vùng làm việc</legend>{zones.map((zone) => <label className="mr-4 inline-flex items-center gap-2 py-2" key={zone.id}>
            <input type="checkbox" checked={workingZoneIds.includes(zone.id)} onChange={(event) => setWorkingZoneIds((current) => event.target.checked ? [...current, zone.id] : current.filter((value) => value !== zone.id))} />{text(zone.name)}</label>)}</fieldset>
          {[["bankName", "Ngân hàng"], ["accountNumber", "Số tài khoản"], ["accountHolderName", "Chủ tài khoản"]].map(([key, label]) => <FormField key={key} id={`api-${key}`} label={label} value={bank[key] ?? ""} onChange={(event) => setBank((current) => ({ ...current, [key]: event.target.value }))} />)}
        </>}
        {resource === "rafts" && <fieldset className="space-y-3 rounded-control border border-border p-4 sm:col-span-2"><legend>Sơ đồ làn</legend>
          {lanes.map((lane, index) => <div key={lane.laneNumber} className="grid grid-cols-3 gap-3"><FormField id={`lane-${index}-length`} label={`Làn ${lane.laneNumber} · chiều dài (m)`} type="number" step="any" min="0.01" required value={lane.length}
            onChange={(event) => setLanes((current) => current.map((entry, at) => at === index ? { ...entry, length: event.target.value } : entry))} />
            <FormField id={`lane-${index}-a`} label="Mốc A" value={lane.markerA} onChange={(event) => setLanes((current) => current.map((entry, at) => at === index ? { ...entry, markerA: event.target.value } : entry))} />
            <FormField id={`lane-${index}-b`} label="Mốc B" value={lane.markerB} onChange={(event) => setLanes((current) => current.map((entry, at) => at === index ? { ...entry, markerB: event.target.value } : entry))} /></div>)}
          <div className="flex gap-2"><Button className="w-auto" variant="secondary" onClick={() => setLanes((current) => [...current, { laneNumber: current.length + 1, length: "", markerA: "A", markerB: "B" }])}>Thêm làn</Button>
            <Button className="w-auto" variant="secondary" disabled={lanes.length <= 1} onClick={() => setLanes((current) => current.slice(0, -1))}>Bỏ làn cuối</Button></div>
        </fieldset>}
      </fieldset>
      {record && <div className="mt-5 rounded-control border border-border p-4"><dl className="grid gap-3 sm:grid-cols-2">{definition.columns.map(([key, label]) => <div key={key}><dt className="text-sm text-text-muted">{label}</dt><dd>{text(record[key])}</dd></div>)}
        {resource === "employees" && <div><dt className="text-sm text-text-muted">Tài khoản đăng nhập</dt><dd>{record.account && typeof record.account === "object" && "username" in record.account ? String(record.account.username) : "Chưa liên kết"}</dd></div>}</dl>
        {Array.isArray(record.lanes) && <ul className="mt-3">{record.lanes.map((lane) => <li key={lane.laneNumber}>Làn {lane.laneNumber}: {lane.length ?? "—"} m · {lane.markerA} → {lane.markerB}</li>)}</ul>}
        {Array.isArray(record.permissions) && <ul className="mt-3 space-y-2">{record.permissions.map((permission) => <li key={permission.functionCode}>{permission.functionCode}: {permission.actions?.join(", ")}</li>)}</ul>}
      </div>}
      {blocked && record && <div className="mt-4 rounded-control border border-border p-4"><Button className="w-auto" variant="secondary" isPending={pending} onClick={async () => {
        if (pendingRef.current) return; setPending(true); pendingRef.current = true;
        const result = await repository.detail(record.id); pendingRef.current = false;
        if (!mounted.current) return; setPending(false);
        if (result.status === "success") setLatest(result.data); else setError(workspaceError(result));
      }}>Tải dữ liệu mới để đối chiếu</Button>
        {latest && <div className="mt-4"><p className="font-semibold">Dữ liệu hiện tại trên hệ thống</p><dl>{definition.fields.map((field) => <div key={field.key} className="mt-2"><dt className="text-sm text-text-muted">{field.label}</dt><dd>{text(latest[field.key])}</dd></div>)}</dl>
          <Button className="mt-4 w-auto" variant="secondary" onClick={() => { if (window.confirm("Dùng dữ liệu mới và bỏ bản nháp đang mở?")) onSaved(latest); }}>Dùng dữ liệu mới</Button></div>}
      </div>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => { if (!dirty || window.confirm("Bỏ các thay đổi chưa lưu?")) onClose(); }}>Đóng</Button>
        {editable && <Button className="w-auto" type="submit" isPending={pending} disabled={blocked || (record !== null && !dirty)}>Lưu</Button>}
        {editable && record && ["zones", "suppliers", "input-items", "rafts"].includes(resource) && <Button className="w-auto" variant="secondary" disabled={pending || dirty || blocked} onClick={() => {
          const action = record.statusId === 102 ? "reactivate" : "discontinue";
          if (window.confirm(action === "reactivate" ? "Khôi phục sử dụng bản ghi này?" : "Ngừng sử dụng bản ghi này?")) void mutate(action);
        }}>{record.statusId === 102 ? "Khôi phục" : "Ngừng dùng"}</Button>}
        {editable && record && resource === "accounts" && <Button className="w-auto" variant="secondary" disabled={pending || dirty || blocked} onClick={() => {
          const action = record.status === "Locked" ? "unlock" : "lock";
          const reason = window.prompt(action === "lock" ? "Lý do khóa tài khoản" : "Lý do mở khóa tài khoản");
          if (reason?.trim()) void mutate(action, reason.trim());
        }}>{record.status === "Locked" ? "Mở khóa" : "Khóa tài khoản"}</Button>}
      </div>
    </form>
    {record && <ResourceExtras resource={resource} record={record} busy={pending} dirty={dirty} blocked={blocked} onSaved={onSaved} />}
  </Dialog>;
}

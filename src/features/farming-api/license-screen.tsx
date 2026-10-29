"use client";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { createOperationsRepository } from "@/features/operations/repository";
import { loadOptions } from "@/features/operations/lookups";
import { businessToday, DataTable, ErrorNotice, Field, Note, Select, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { licenseOverviewSchema, licenseSchema, licenseTypeLabel, licenseTypes, saveLicenseSchema, stateLabel, type License, type LicenseOverview } from "./contracts";

const date = (value: string | null) => value ? value.split("-").reverse().join("/") : "—";
type Editor = { mode: "create" | "update" | "replace" | "view"; record: License | null };
export function LicenseWorkspace({ zoneId, zoneName, onClose }: { zoneId: string; zoneName: string; onClose(): void }) {
  const repository = useMemo(() => createOperationsRepository("zone-licenses"), []);
  const [asOf, setAsOf] = useState(businessToday), [editor, setEditor] = useState<Editor>(), [serial, setSerial] = useState(0), [notice, setNotice] = useState<string>();
  const overview = useRemote(useCallback((signal: AbortSignal) => repository.read("list", { zoneId, asOf }, licenseOverviewSchema, signal), [repository, zoneId, asOf]));
  const zones = useRemote(useCallback((signal: AbortSignal) => loadOptions("zones", signal), []));
  const opening = useMutation();
  async function open(id: string) {
    const record = await opening.run(() => repository.read("detail", { id, asOf }, licenseSchema), true);
    if (record) { setEditor({ mode: "view", record }); setSerial((value) => value + 1); }
  }
  return <Dialog open title={`Giấy tờ vùng · ${zoneName}`} size="xl" dismissible={!opening.pending && !editor} onOpenChange={(open) => { if (!open && !opening.busy() && !editor) onClose(); }}>
    <div className="flex flex-wrap items-end justify-between gap-3"><Field label="Ngày xem tình trạng" type="date" required value={asOf} onChange={(event) => { if (event.target.value) setAsOf(event.target.value); }} />
      <Button className="w-auto" disabled={opening.pending || zones.loading || !zones.data} onClick={() => { setEditor({ mode: "create", record: null }); setSerial((value) => value + 1); }}>Thêm giấy tờ</Button></div>
    {notice && <p role="status" className="mt-4 text-primary">{notice}</p>}
    <ErrorNotice error={overview.error || zones.error || opening.error} />
    {(overview.error || zones.error) && <Button className="w-auto" variant="secondary" onClick={() => { overview.reload(); zones.reload(); }}>Tải lại hồ sơ</Button>}
    {overview.loading ? <Skeleton /> : overview.data && <>
      {overview.data.licenses.some((row) => row.state === "Missing") && <p className="mt-4 rounded-control border border-warning p-3">Thiếu hồ sơ còn hiệu lực tại ngày {date(overview.data.asOf)}.</p>}
      <DataTable headings={["Loại giấy tờ", "Số", "Hiệu lực từ", "Hết hạn", "Tình trạng", "Hồ sơ"]} empty={!overview.data.licenses.length}>
        {overview.data.licenses.map((row, index) => <tr key={row.documentId ?? `${row.documentType}-${index}`}><td>{licenseTypeLabel(row.documentType)}</td><td>{row.documentNumber ?? "—"}</td><td>{date(row.effectiveDate)}</td><td>{date(row.expiryDate)}</td><td>{stateLabel(row.state)}</td>
          <td>{row.documentId && <button className="text-primary underline" disabled={opening.pending} onClick={() => void open(row.documentId!)}>Xem giấy tờ {row.documentNumber}</button>}</td></tr>)}
      </DataTable></>}
    <Button className="w-auto" variant="secondary" disabled={opening.pending || !!editor} onClick={onClose}>Đóng hồ sơ giấy tờ</Button>
    {editor && <LicenseEditor key={serial} {...editor} zoneId={zoneId} zones={zones.data ?? []} onClose={() => setEditor(undefined)} onMode={(mode) => { setEditor({ ...editor, mode }); setSerial((value) => value + 1); }}
      onNavigate={(record) => { setEditor({ mode: "view", record }); setSerial((value) => value + 1); }} onSaved={(record) => { setEditor({ mode: "view", record }); setSerial((value) => value + 1); overview.reload(); setNotice("Đã lưu giấy tờ."); }} />}
  </Dialog>;
}

export function LicenseEditor({ mode, record, zoneId, zones, onClose, onMode, onNavigate, onSaved }: Editor & { zoneId: string; zones: ApiRecord[];
  onClose(): void; onMode(mode: Editor["mode"]): void; onNavigate(record: License): void; onSaved(record: License): void }) {
  const repository = useMemo(() => createOperationsRepository("zone-licenses"), []), mutation = useMutation();
  const view = mode === "view";
  const initial = { documentType: record?.documentType ?? "AQUACULTURE_LICENSE", documentNumber: mode === "replace" ? "" : record?.documentNumber ?? "", effectiveDate: mode === "replace" ? businessToday() : record?.effectiveDate ?? businessToday(),
    expiryDate: mode === "replace" ? "" : record?.expiryDate ?? "", issuingAuthority: record?.issuingAuthority ?? "", holder: record?.holder ?? "", legalScope: record?.legalScope ?? "" };
  const [values, setValues] = useState(initial), [zoneIds, setZoneIds] = useState(record?.zones.map((zone) => zone.id) ?? [zoneId]), [file, setFile] = useState<File>(), [fileError, setFileError] = useState<string>();
  const [baseline, setBaseline] = useState(record), [latest, setLatest] = useState<License>(), [discard, setDiscard] = useState(false);
  const [reconciliation, setReconciliation] = useState<LicenseOverview>();
  const dirty = !view && (JSON.stringify(values) !== JSON.stringify(initial) || !!file || JSON.stringify(zoneIds) !== JSON.stringify(record?.zones.map((zone) => zone.id) ?? [zoneId]));
  function close() { if (mutation.busy()) return; if (dirty) setDiscard(true); else onClose(); }
  async function save() {
    if (view || mutation.busy() || mutation.blocked) return;
    const parsed = saveLicenseSchema.safeParse({ ...values, expiryDate: values.expiryDate || null, issuingAuthority: values.issuingAuthority || null,
      holder: values.holder || null, legalScope: values.legalScope || null, zoneIds, ...(mode === "update" ? { rowVersion: baseline?.rowVersion } : {}) });
    if (!parsed.success) { setFileError(parsed.error.issues[0]?.message === "Ngày hết hạn phải sau ngày hiệu lực." ? parsed.error.issues[0].message : "Kiểm tra các trường bắt buộc, độ dài và phạm vi vùng."); return; }
    if (mode !== "update" && !file) { setFileError("Chọn tệp PDF, JPEG hoặc PNG để lưu giấy tờ."); return; }
    setFileError(undefined);
    const saved = await mutation.run(() => repository.upload(mode, file ? [file] : [], parsed.data, licenseSchema, record?.id));
    if (saved) onSaved(saved);
  }
  async function navigate(id: string) {
    const next = await mutation.run(() => repository.read("detail", { id, asOf: record?.asOf }, licenseSchema), true);
    if (next) onNavigate(next);
  }
  const fields = [["documentNumber", "Số giấy tờ *", 100], ["issuingAuthority", "Cơ quan cấp", 200], ["holder", "Chủ thể được cấp", 200]] as const;
  const scopeOptions = [...zones, ...(record?.zones ?? []).filter((zone) => !zones.some((option) => option.id === zone.id))];
  return <Dialog open title={view ? `Giấy tờ · ${record?.documentNumber}` : mode === "replace" ? "Gia hạn / thay thế giấy tờ" : mode === "update" ? "Sửa giấy tờ" : "Thêm giấy tờ vùng"} size="lg" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) close(); }}>
    <ErrorNotice error={mutation.error || fileError} />
    {view && record && <div className="mb-4 space-y-3"><p>Tình trạng tại {date(record.asOf)}: <strong>{stateLabel(record.state)}</strong></p>
      {record.fileUrl && <a className="text-primary underline" href={record.fileUrl} target="_blank" rel="noreferrer">Tải tệp giấy tờ</a>}
      <div className="flex flex-wrap gap-3">{!record.replacedByDocumentId && <><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => onMode("update")}>Sửa giấy tờ</Button><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => onMode("replace")}>Gia hạn / thay thế</Button></>}
        {record.replacesDocumentId && <Button className="w-auto" variant="secondary" isPending={mutation.pending} onClick={() => void navigate(record.replacesDocumentId!)}>Xem giấy tờ trước</Button>}
        {record.replacedByDocumentId && <Button className="w-auto" variant="secondary" isPending={mutation.pending} onClick={() => void navigate(record.replacedByDocumentId!)}>Xem giấy tờ thay thế</Button>}</div></div>}
    {mode === "replace" && <p className="mb-4">Giấy mới thay thế số {record?.documentNumber}. Bản cũ được giữ trong lịch sử.</p>}
    <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={view || mutation.pending || mutation.blocked} className="space-y-4">
        <Select label="Loại giấy tờ *" value={values.documentType} onChange={(event) => setValues({ ...values, documentType: event.target.value as typeof values.documentType })}>{licenseTypes.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</Select>
        {fields.map(([key, label, maxLength]) => <Field key={key} label={label} required={key === "documentNumber"} maxLength={maxLength} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />)}
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Ngày hiệu lực *" type="date" required value={values.effectiveDate} onChange={(event) => setValues({ ...values, effectiveDate: event.target.value })} />
          <Field label="Ngày hết hạn" type="date" value={values.expiryDate} onChange={(event) => setValues({ ...values, expiryDate: event.target.value })} /></div>
        <Note label="Phạm vi pháp lý" maxLength={1000} value={values.legalScope} onChange={(event) => setValues({ ...values, legalScope: event.target.value })} />
        <fieldset className="rounded-control border border-border p-3"><legend className="font-semibold">Vùng được giấy tờ bao phủ *</legend>{scopeOptions.map((zone) => <label key={zone.id} className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={zoneIds.includes(zone.id)} onChange={(event) => setZoneIds((current) => event.target.checked ? [...current, zone.id] : current.filter((id) => id !== zone.id))} />{String(zone.code)} · {String(zone.name)}</label>)}</fieldset>
        {!view && <Field label={mode === "update" ? "Đổi tệp (không chọn để giữ tệp hiện tại)" : "Tệp giấy tờ *"} type="file" accept="application/pdf,image/jpeg,image/png" required={mode !== "update"} onChange={(event) => {
          const selected = event.target.files?.[0]; setFile(undefined); setFileError(undefined);
          if (selected && (selected.size < 1 || selected.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(selected.type))) { setFileError("Tệp phải là PDF, JPEG hoặc PNG, tối đa 10 MB."); event.target.value = ""; } else setFile(selected);
        }} />}
      </fieldset>
      {mutation.blocked && <div className="my-4 rounded-control border border-border p-4"><p>Bản nháp được giữ. Chưa gửi lại thao tác lưu.</p>
        <Button className="mt-3 w-auto" variant="secondary" isPending={mutation.pending} onClick={async () => {
          if (mode === "update" && record) { const current = await mutation.run(() => repository.read("detail", { id: record.id }, licenseSchema), true); if (current) setLatest(current); }
          else { const current = await mutation.run(() => repository.read("list", { zoneId }, licenseOverviewSchema), true); if (current) setReconciliation(current); }
        }}>Tải hồ sơ mới để đối chiếu</Button>
        {latest && <div className="mt-3 space-y-2"><p className="font-semibold">Giấy tờ hiện tại trên hệ thống</p><p>{licenseTypeLabel(latest.documentType)} · {latest.documentNumber} · {date(latest.effectiveDate)} – {date(latest.expiryDate)}</p>
          <p>{latest.issuingAuthority || "—"} · {latest.holder || "—"}</p><p>{latest.legalScope || "—"}</p><p>Vùng: {latest.zones.map((zone) => zone.code).join(", ")}</p><p>{stateLabel(latest.state)} {latest.replacedByDocumentId ? "· Đã có giấy thay thế" : ""}</p>
          {latest.fileUrl && <a className="block text-primary underline" href={latest.fileUrl} target="_blank" rel="noreferrer">Tải tệp hiện tại</a>}
          {!mutation.uncertain && !latest.replacedByDocumentId && <Button className="w-auto" variant="secondary" onClick={() => { setBaseline(latest); setLatest(undefined); mutation.reviewed(); }}>Đã đối chiếu, giữ bản nháp để sửa tiếp</Button>}
          <Button className="w-auto" variant="secondary" onClick={() => onNavigate(latest)}>Dùng dữ liệu đã lưu</Button></div>}
        {reconciliation && <ul className="mt-3 space-y-2">{reconciliation.licenses.map((row, i) => <li key={row.documentId ?? i}>{row.documentNumber ?? licenseTypeLabel(row.documentType)} · {stateLabel(row.state)} {row.documentId && <button className="text-primary underline" type="button" disabled={mutation.pending} onClick={async () => {
          const current = await mutation.run(() => repository.read("detail", { id: row.documentId! }, licenseSchema), true); if (current) setLatest(current);
        }}>Đối chiếu bản {row.documentNumber}</button>}</li>)}</ul>}
      </div>}
      {discard && <div className="my-4 rounded-control border border-border p-4"><p>Bỏ các thay đổi chưa lưu?</p><div className="mt-3 flex flex-wrap gap-3"><Button className="w-auto" variant="secondary" onClick={() => setDiscard(false)}>Tiếp tục sửa</Button><Button className="w-auto" onClick={onClose}>Bỏ bản nháp</Button></div></div>}
      <div className="mt-6 flex flex-wrap justify-end gap-3"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Đóng giấy tờ</Button>
        {!view && <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Lưu giấy tờ</Button>}</div>
    </form>
  </Dialog>;
}

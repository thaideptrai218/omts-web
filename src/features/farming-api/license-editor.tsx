"use client";
import { useEffect, useMemo, useState, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, ErrorNotice, Field, Note, Select, useMutation } from "@/features/operations/ui";
import { licenseOverviewSchema, licenseSchema, licenseTypeLabel, licenseTypes, saveLicenseSchema, stateLabel, type License, type LicenseOverview } from "./contracts";

const date = (value: string | null) => value ? value.split("-").reverse().join("/") : "—";
type Editor = { mode: "create" | "update" | "replace" | "view"; record: License | null };
export function LicenseEditor({ mode, record, zoneId, zones, onClose, onMode, onNavigate, onSaved, dirtyRef }: Editor & { zoneId: string; zones: ApiRecord[]; dirtyRef?: RefObject<boolean>;
  onClose(): void; onMode(mode: Editor["mode"]): void; onNavigate(record: License): void; onSaved(record: License): void }) {
  const repository = useMemo(() => createOperationsRepository("zone-licenses"), []), mutation = useMutation();
  const view = mode === "view", { notify } = useToast();
  const initial = { documentType: record?.documentType ?? "AQUACULTURE_LICENSE", documentNumber: mode === "replace" ? "" : record?.documentNumber ?? "", effectiveDate: mode === "replace" ? businessToday() : record?.effectiveDate ?? businessToday(),
    expiryDate: mode === "replace" ? "" : record?.expiryDate ?? "", issuingAuthority: record?.issuingAuthority ?? "", holder: record?.holder ?? "", legalScope: record?.legalScope ?? "" };
  const [values, setValues] = useState(initial), [zoneIds, setZoneIds] = useState(record?.zones.map((zone) => zone.id) ?? [zoneId]), [file, setFile] = useState<File>(), [fileError, setFileError] = useState<string>();
  const [baseline, setBaseline] = useState(record), [latest, setLatest] = useState<License>(), [discard, setDiscard] = useState(false);
  const [reconciliation, setReconciliation] = useState<LicenseOverview>();
  const dirty = !view && (JSON.stringify(values) !== JSON.stringify(initial) || !!file || JSON.stringify(zoneIds) !== JSON.stringify(record?.zones.map((zone) => zone.id) ?? [zoneId]));
  useEffect(() => { if (dirtyRef) dirtyRef.current = dirty; return () => { if (dirtyRef) dirtyRef.current = false; }; }, [dirty, dirtyRef]);
  function close() { if (mutation.busy()) return; if (dirty) setDiscard(true); else onClose(); }
  async function save() {
    if (view || mutation.busy() || mutation.blocked) return;
    if (!values.expiryDate) { setFileError("Nhập ngày hết hạn của giấy tờ."); return; }
    if (zoneIds.length !== 1) { setFileError("Mỗi giấy tờ chỉ gắn với một vùng nuôi. Chọn vùng nuôi."); return; }
    const parsed = saveLicenseSchema.safeParse({ ...values, expiryDate: values.expiryDate || null, issuingAuthority: values.issuingAuthority || null,
      holder: values.holder || null, legalScope: values.legalScope || null, zoneIds, ...(mode === "update" ? { rowVersion: baseline?.rowVersion } : {}) });
    if (!parsed.success) { setFileError(parsed.error.issues[0]?.message === "Ngày hết hạn phải sau ngày hiệu lực." ? parsed.error.issues[0].message : "Kiểm tra các trường bắt buộc, độ dài và phạm vi vùng."); return; }
    if (mode !== "update" && !file) { setFileError("Chọn tệp PDF, JPEG hoặc PNG để lưu giấy tờ."); return; }
    setFileError(undefined);
    const saved = await mutation.run(() => repository.upload(mode, file ? [file] : [], parsed.data, licenseSchema, record?.id));
    if (saved) { notify({ tone: "success", title: `Đã lưu giấy tờ ${saved.documentNumber}.` }); onSaved(saved); }
  }
  async function navigate(id: string) {
    const next = await mutation.run(() => repository.read("detail", { id, asOf: record?.asOf }, licenseSchema), true);
    if (next) onNavigate(next);
  }
  const fields = [["documentNumber", "Số giấy tờ *", 100], ["issuingAuthority", "Cơ quan cấp", 200], ["holder", "Chủ thể được cấp", 200]] as const;
  const scopeOptions = [...zones, ...(record?.zones ?? []).filter((zone) => !zones.some((option) => option.id === zone.id))];
  return <LicenseEditorFrame mode={mode} pending={mutation.pending} close={close}> 
    <ErrorNotice error={mutation.error || fileError} />
    {view && record && <div className="mb-4 space-y-3"><p>Tình trạng tại {date(record.asOf)}: <strong>{stateLabel(record.state)}</strong></p>
      {record.fileUrl && <a className="text-primary underline" href={record.fileUrl} download>Tải tệp giấy tờ</a>}
      <div className="flex flex-wrap gap-3">{!record.replacedByDocumentId && <><Button type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => onMode("update")}>Sửa giấy tờ</Button><Button type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => onMode("replace")}>Gia hạn / thay thế</Button></>}
        {record.replacesDocumentId && <Button type="button" className="w-auto" variant="secondary" isPending={mutation.pending} onClick={() => void navigate(record.replacesDocumentId!)}>Xem giấy tờ trước</Button>}
        {record.replacedByDocumentId && <Button type="button" className="w-auto" variant="secondary" isPending={mutation.pending} onClick={() => void navigate(record.replacedByDocumentId!)}>Xem giấy tờ thay thế</Button>}</div></div>}
    {mode === "replace" && <p className="mb-4">Giấy mới thay thế số {record?.documentNumber}. Bản cũ được giữ trong lịch sử.</p>}
    <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={view || mutation.pending || mutation.blocked} className="space-y-4">
        <CollapsibleSection title="Giấy tờ" description="Loại, số và đơn vị cấp giấy tờ." columns={2}>
        <Select label="Loại giấy tờ *" value={values.documentType} onChange={(event) => setValues({ ...values, documentType: event.target.value as typeof values.documentType })}>{licenseTypes.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</Select>
        {fields.map(([key, label, maxLength]) => <Field key={key} label={label} required={key === "documentNumber"} maxLength={maxLength} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />)}
        </CollapsibleSection>
        <CollapsibleSection title="Hiệu lực và phạm vi" description="Thời hạn và vùng nuôi được giấy tờ bao phủ." columns={1}>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Ngày hiệu lực *" type="date" required value={values.effectiveDate} onChange={(event) => setValues({ ...values, effectiveDate: event.target.value })} />
          <Field label="Ngày hết hạn *" type="date" required value={values.expiryDate} onChange={(event) => setValues({ ...values, expiryDate: event.target.value })} /></div>
        <Note label="Phạm vi pháp lý" maxLength={1000} value={values.legalScope} onChange={(event) => setValues({ ...values, legalScope: event.target.value })} />
        <Select key="license-zone" label="Vùng nuôi được giấy tờ bao phủ *" required value={zoneIds[0] ?? ""} onChange={event => setZoneIds(event.target.value ? [event.target.value] : [])}><option value="">Chọn vùng nuôi</option>{scopeOptions.map(zone => <option key={zone.id} value={zone.id}>{String(zone.code)} · {String(zone.name)}</option>)}</Select>
        </CollapsibleSection>
        {!view && <Field label={mode === "update" ? "Đổi tệp (không chọn để giữ tệp hiện tại)" : "Tệp giấy tờ *"} type="file" accept="application/pdf,image/jpeg,image/png" required={mode !== "update"} onChange={(event) => {
          const selected = event.target.files?.[0]; setFile(undefined); setFileError(undefined);
          if (selected && (selected.size < 1 || selected.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(selected.type))) { setFileError("Tệp phải là PDF, JPEG hoặc PNG, tối đa 10 MB."); event.target.value = ""; } else setFile(selected);
        }} />}
      </fieldset>
      {mutation.blocked && <div className="my-4 rounded-control border border-border p-4"><p>Bản nháp được giữ. Chưa gửi lại thao tác lưu.</p>
        <Button type="button" className="mt-3 w-auto" variant="secondary" isPending={mutation.pending} onClick={async () => {
          if (mode === "update" && record) { const current = await mutation.run(() => repository.read("detail", { id: record.id }, licenseSchema), true); if (current) setLatest(current); }
          else { const current = await mutation.run(() => repository.read("list", { zoneId }, licenseOverviewSchema), true); if (current) setReconciliation(current); }
        }}>Tải hồ sơ mới để đối chiếu</Button>
        {latest && <div className="mt-3 space-y-2"><p className="font-semibold">Giấy tờ hiện tại trên hệ thống</p><p>{licenseTypeLabel(latest.documentType)} · {latest.documentNumber} · {date(latest.effectiveDate)} – {date(latest.expiryDate)}</p>
          <p>{latest.issuingAuthority || "—"} · {latest.holder || "—"}</p><p>{latest.legalScope || "—"}</p><p>Vùng: {latest.zones.map((zone) => zone.code).join(", ")}</p><p>{stateLabel(latest.state)} {latest.replacedByDocumentId ? "· Đã có giấy thay thế" : ""}</p>
          {latest.fileUrl && <a className="block text-primary underline" href={latest.fileUrl} download>Tải tệp hiện tại</a>}
          {!mutation.uncertain && !latest.replacedByDocumentId && <Button type="button" className="w-auto" variant="secondary" onClick={() => { setBaseline(latest); setLatest(undefined); mutation.reviewed(); }}>Đã đối chiếu, giữ bản nháp để sửa tiếp</Button>}
          <Button type="button" className="w-auto" variant="secondary" onClick={() => onNavigate(latest)}>Dùng dữ liệu đã lưu</Button></div>}
        {reconciliation && <ul className="mt-3 space-y-2">{reconciliation.licenses.map((row, i) => <li key={row.documentId ?? i}>{row.documentNumber ?? licenseTypeLabel(row.documentType)} · {stateLabel(row.state)} {row.documentId && <button className="text-primary underline" type="button" disabled={mutation.pending} onClick={async () => {
          const current = await mutation.run(() => repository.read("detail", { id: row.documentId! }, licenseSchema), true); if (current) setLatest(current);
        }}>Đối chiếu bản {row.documentNumber}</button>}</li>)}</ul>}
      </div>}
      {discard && <div className="my-4 rounded-control border border-border p-4"><p>Bỏ các thay đổi chưa lưu?</p><div className="mt-3 flex flex-wrap gap-3"><Button type="button" className="w-auto" variant="secondary" onClick={() => setDiscard(false)}>Tiếp tục sửa</Button><Button type="button" className="w-auto" onClick={onClose}>Bỏ bản nháp</Button></div></div>}
      <div className="mt-6 flex flex-wrap justify-end gap-3"><Button type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Bỏ qua</Button>
        {!view && <Button key="save-license" className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Lưu</Button>}</div>
    </form>
  </LicenseEditorFrame>;
}

function LicenseEditorFrame({ mode, pending, close, children }: { mode: Editor["mode"]; pending: boolean; close(): void; children: ReactNode }) {
  return mode === "update" || mode === "view" ? <section aria-label={mode === "update" ? "Sửa giấy tờ" : "Giấy tờ"}>{children}</section> : <Dialog open title={mode === "replace" ? "Gia hạn / thay thế giấy tờ" : "Thêm giấy tờ vùng"} size="lg" dismissible={!pending} onOpenChange={open => { if (!open) close(); }}>{children}</Dialog>;
}

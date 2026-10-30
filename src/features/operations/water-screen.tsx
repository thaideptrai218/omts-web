"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "./permissions";
import * as c from "./contracts";
import { createOperationsRepository, type Query } from "./repository";
import { loadOptions } from "./lookups";
import { DataTable, ErrorNotice, Field, Note, Paging, Select, Skeleton, businessTime, displayTime, statusLabel, toApiTime, useMutation, useRemote } from "./ui";

const repository = createOperationsRepository("water");
const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);
type Recognition = z.infer<typeof c.recognitionSchema>["ocr"];
type Chart = z.infer<typeof c.waterChartSchema>;
type ZoneThresholds = z.infer<typeof c.zoneThresholdsSchema>;

export function WaterScreen() {
  const context = useApiWorkspace(), zones = useRemote(loadZones);
  const [zoneId, setZoneId] = useState(""), [filters, setFilters] = useState({ from: "", to: "", status: "Confirmed" }), [page, setPage] = useState(1), [groupBy, setGroupBy] = useState("month");
  const [selected, setSelected] = useState<c.WaterMeasurement | null>(), [serial, setSerial] = useState(0), [ocr, setOcr] = useState<Recognition>(), [thresholdsOpen, setThresholdsOpen] = useState(false), [notice, setNotice] = useState<string>();
  const query = useMemo<Query>(() => ({ ...filters, zoneId, page: String(page), pageSize: "20" }), [filters, zoneId, page]);
  const history = useRemote(useMemo(() => (signal: AbortSignal) => zoneId ? repository.read("list", query, c.waterHistorySchema, signal)
    : Promise.resolve({ status: "success" as const, data: undefined as c.WaterHistory | undefined }), [query, zoneId]));
  const chart = useRemote(useMemo(() => (signal: AbortSignal) => zoneId ? repository.read("chart", { zoneId, from: filters.from, to: filters.to, groupBy }, c.waterChartSchema, signal)
    : Promise.resolve({ status: "success" as const, data: undefined as Chart | undefined }), [zoneId, filters.from, filters.to, groupBy]));
  const mutation = useMutation();
  const availableZones = zones.data?.filter((row) => operationAllowed("water", context.identity, context.permissions.functionPermissions, "View", row.id)) ?? [];
  const currentZone = availableZones.find((row) => row.id === zoneId);
  const canCreate = !!zoneId && currentZone?.statusId === 101 && operationAllowed("water", context.identity, context.permissions.functionPermissions, "Create", zoneId);
  async function open(id: string) { const result = await mutation.run(() => repository.read("detail", { id }, c.waterSchema), true); if (result) { setSelected(result); setOcr(undefined); setSerial((value) => value + 1); } }
  function saved(record: c.WaterMeasurement, recognized?: Recognition) { setSelected(record); setOcr(recognized); setSerial((value) => value + 1); history.reload(); chart.reload(); setNotice("Đã lưu phép đo."); }
  return <section><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-semibold">Đo nước</h1><div className="flex flex-wrap gap-2">
    {canCreate && <Button className="w-auto" onClick={() => { setSelected(null); setOcr(undefined); setSerial((value) => value + 1); }}>Ghi phép đo</Button>}
    <Button className="w-auto" variant="secondary" disabled={!zoneId || mutation.pending} onClick={() => setThresholdsOpen(true)}>Ngưỡng nước</Button>
    {zoneId && operationAllowed("water", context.identity, context.permissions.functionPermissions, "Export", zoneId) && <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => void mutation.run(() => repository.download(query), true)}>Xuất Excel</Button>}
  </div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Select label="Vùng nuôi *" value={zoneId} onChange={(e) => { setZoneId(e.target.value); setPage(1); }}><option value="">Chọn vùng được cấp</option>{availableZones.map((row) => <option key={row.id} value={row.id}>{String(row.name)}{row.statusId === 102 ? " (ngừng dùng)" : ""}</option>)}</Select>
      <Field label="Từ ngày" type="date" value={filters.from} onChange={(e) => { setFilters((value) => ({ ...value, from: e.target.value })); setPage(1); }} /><Field label="Đến ngày" type="date" value={filters.to} onChange={(e) => { setFilters((value) => ({ ...value, to: e.target.value })); setPage(1); }} />
      <Select label="Trạng thái" value={filters.status} onChange={(e) => { setFilters((value) => ({ ...value, status: e.target.value })); setPage(1); }}>{[["Confirmed", "Đã xác nhận"], ["Draft", "Nháp"], ["Corrected", "Đã hiệu chỉnh"], ["Voided", "Đã hủy"], ["All", "Tất cả"]].map(([key, title]) => <option key={key} value={key}>{title}</option>)}</Select>
    </div>
    <ErrorNotice error={zones.error || history.error || mutation.error} />{notice && <p role="status" className="mt-4 text-primary">{notice}</p>}
    {!zoneId ? <p className="mt-6 rounded-card border border-border bg-surface p-6">Chọn vùng để xem lịch sử đo nước.</p> : <>
      <Button className="mt-4 w-auto" variant="secondary" disabled={history.loading} onClick={() => { history.reload(); chart.reload(); }}>Tải lại dữ liệu</Button>
      <p className="mt-3 text-sm text-text-muted">Khi chưa chọn kỳ: lịch sử gồm 3 tháng gần đây, biểu đồ gồm 12 tháng. Thời gian hiển thị theo giờ Việt Nam.</p>
      {history.loading ? <Skeleton /> : history.data && <><DataTable headings={["Thời điểm", "pH", "Độ mặn (‰)", "Trạng thái", "Cảnh báo", "Người đo", "Chi tiết"]} empty={!history.data.items.length}>{history.data.items.map((row) => <tr key={row.id}><td>{displayTime(row.measuredAt)}</td><td>{row.ph ?? "—"}</td><td>{row.salinity ?? "—"}</td><td>{statusLabel(row.statusCode)} · v{row.recordVersion}</td><td>{statusLabel(row.alertState)}{row.violatedValues && <p className="mt-1 text-danger">{row.violatedValues}</p>}</td><td>{row.measuredBy?.name ?? "—"}</td><td><button className="text-primary underline" disabled={mutation.pending} onClick={() => void open(row.id)}>Mở phép đo</button></td></tr>)}</DataTable><Paging page={page} total={history.data.total} onChange={setPage} /></>}
      <div className="mt-8 flex flex-wrap items-end justify-between gap-3"><h2 className="text-xl font-semibold">Biểu đồ nước đã xác nhận</h2><Select label="Gộp theo" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}><option value="month">Tháng</option><option value="day">Ngày</option></Select></div>
      <ErrorNotice error={chart.error} />{chart.loading ? <Skeleton /> : chart.data && <WaterChart data={chart.data} />}
    </>}
    {selected !== undefined && (selected ? <MeasurementEditor key={`${selected.id}:${serial}`} record={selected} ocr={ocr} onClose={() => setSelected(undefined)} onSaved={saved} onOpen={open} />
      : <NewMeasurement key={`new:${serial}`} zoneId={zoneId} zoneName={String(currentZone?.name ?? "")} onClose={() => setSelected(undefined)} onSaved={saved} />)}
    {thresholdsOpen && <ThresholdDialog zoneId={zoneId} owner={context.identity.subjectType === "CooperativeOwner"} onClose={() => setThresholdsOpen(false)} onSaved={() => { chart.reload(); setThresholdsOpen(false); setNotice("Đã lưu ngưỡng nước. Ngưỡng mới áp dụng cho các phép đo xác nhận sau đó."); }} />}
  </section>;
}

export function NewMeasurement({ zoneId, zoneName, onClose, onSaved }: { zoneId: string; zoneName: string; onClose(): void; onSaved(record: c.WaterMeasurement, ocr?: Recognition): void }) {
  const confirmation = useActionDialog();
  const [initialValues] = useState(() => ({ measuredAt: businessTime(), ph: "", salinity: "" }));
  const [mode, setMode] = useState("manual"), [photo, setPhoto] = useState<File>(), [values, setValues] = useState(initialValues);
  const [clientOperationId] = useState(() => crypto.randomUUID()), [review, setReview] = useState<c.WaterHistory>();
  const attempt = useRef<{ mode: string; photo?: File; payload: z.infer<typeof c.recordWaterSchema> }>(undefined);
  const mutation = useMutation();
  const dirty = !!photo || mode !== "manual" || JSON.stringify(values) !== JSON.stringify(initialValues);
  const close = async () => { if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ phép đo chưa xác nhận? Nếu lần gửi trước chưa rõ kết quả, hãy kiểm tra lịch sử nháp trước khi tạo phép đo mới."))) onClose(); };
  async function save(confirm: boolean) {
    if (!mutation.uncertain) attempt.current = { mode, photo, payload: { clientOperationId, measuredAt: toApiTime(values.measuredAt), ph: values.ph === "" ? null : Number(values.ph), salinity: values.salinity === "" ? null : Number(values.salinity), confirm } };
    const current = attempt.current;
    if (!current) return;
    if (current.mode === "ocr" && current.photo) {
      const result = await mutation.run(() => repository.upload("recognize", [current.photo!], { clientOperationId }, c.recognitionSchema, undefined, zoneId));
      if (result) onSaved(result.measurement, result.ocr);
    } else {
      const result = await mutation.run(() => current.photo ? repository.upload("record-photo", [current.photo], current.payload, c.waterSchema, undefined, zoneId)
        : repository.write("record", current.payload, c.waterSchema, undefined, zoneId));
      if (result) onSaved(result);
    }
  }
  return <Dialog open title={`Ghi phép đo · ${zoneName}`} size="lg" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) close(); }}>
    {confirmation.dialog}
    <ErrorNotice error={mutation.error} /><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === "confirm"); }}>
      <fieldset disabled={mutation.pending || mutation.uncertain} className="space-y-4"><Select label="Cách ghi" value={mode} onChange={(e) => setMode(e.target.value)}><option value="manual">Nhập tay</option><option value="ocr">Nhận dạng từ ảnh</option></Select>
        <Field label={mode === "ocr" ? "Ảnh máy đo * (JPEG/PNG, tối đa 10 MB)" : "Ảnh máy đo (không bắt buộc)"} type="file" required={mode === "ocr"} accept="image/jpeg,image/png" onChange={(e) => setPhoto(e.target.files?.[0])} />
        {mode === "manual" && <><Field label="Thời điểm đo (giờ Việt Nam)" type="datetime-local" value={values.measuredAt} onChange={(e) => setValues((current) => ({ ...current, measuredAt: e.target.value }))} /><Field label="pH (0–14)" type="number" min="0" max="14" step="0.01" value={values.ph} onChange={(e) => setValues((current) => ({ ...current, ph: e.target.value }))} /><Field label="Độ mặn (0–100 ‰)" type="number" min="0" max="100" step="0.01" value={values.salinity} onChange={(e) => setValues((current) => ({ ...current, salinity: e.target.value }))} /></>}
      </fieldset>
      <div className="flex flex-wrap gap-3">{mutation.uncertain ? <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Xác nhận lại lượt đang chờ</Button> : mode === "ocr" ? <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked || !photo}>Nhận dạng và lưu nháp</Button> : <>
        <Button className="w-auto" type="submit" value="draft" isPending={mutation.pending} disabled={mutation.blocked}>Lưu nháp</Button><Button className="w-auto" type="submit" value="confirm" disabled={mutation.pending || mutation.blocked || !values.measuredAt || values.ph === "" || values.salinity === ""}>Lưu và xác nhận</Button></>}</div>
    </form>
    {mutation.blocked && <div className="my-4 rounded-control border border-border p-4"><p>Chưa gửi lại phép đo. Bản nháp trên màn hình vẫn được giữ.</p><Button className="mt-3 w-auto" variant="secondary" disabled={mutation.pending} onClick={async () => { const result = await mutation.run(() => repository.read("list", { zoneId, status: "All", page: "1", pageSize: "100" }, c.waterHistorySchema), true); if (result) setReview(result); }}>Tải lịch sử để đối chiếu</Button>
      {review && <><DataTable headings={["Thời gian", "pH", "Độ mặn", "Trạng thái"]}>{review.items.map((row) => <tr key={row.id}><td>{displayTime(row.measuredAt)}</td><td>{row.ph ?? "—"}</td><td>{row.salinity ?? "—"}</td><td>{statusLabel(row.statusCode)}</td></tr>)}</DataTable><p>Đang xem {review.items.length}/{review.total} phép đo mới nhất.</p><Button className="mt-3 w-auto" variant="secondary" onClick={mutation.reviewed}>Đã đối chiếu, cho phép xác nhận lại phép đo đang nhập</Button></>}
    </div>}
    <Button className="mt-5 w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Đóng</Button>
  </Dialog>;
}

export function MeasurementEditor({ record, ocr, onClose, onSaved, onOpen }: { record: c.WaterMeasurement; ocr?: Recognition; onClose(): void; onSaved(record: c.WaterMeasurement, ocr?: Recognition): void; onOpen(id: string): Promise<void> }) {
  const confirmation = useActionDialog();
  const context = useApiWorkspace();
  const canCreate = operationAllowed("water", context.identity, context.permissions.functionPermissions, "Create", record.zoneId);
  const canEdit = operationAllowed("water", context.identity, context.permissions.functionPermissions, "Edit", record.zoneId);
  const [mode, setMode] = useState<"view" | "confirm" | "correct" | "void">(record.statusCode === "DRAFT" && canCreate ? "confirm" : "view");
  const [values, setValues] = useState({ measuredAt: businessTime(record.measuredAt), ph: record.ph == null ? "" : String(record.ph), salinity: record.salinity == null ? "" : String(record.salinity), reason: "" });
  const [initial] = useState(() => JSON.stringify(values));
  const [baseline, setBaseline] = useState(record);
  const mutation = useMutation();
  const [latest, setLatest] = useState<c.WaterMeasurement>(), [editors, setEditors] = useState(record.currentEditors), [presenceError, setPresenceError] = useState(false);
  const dirty = JSON.stringify(values) !== initial;
  useEffect(() => {
    if (!canEdit || mode !== "correct" && mode !== "void") return;
    let active = true;
    let inFlight: Promise<unknown> = Promise.resolve();
    const heartbeat = () => { inFlight = repository.write("editing", {}, c.editingSchema, baseline.id).then((result) => {
      if (!active) return; setPresenceError(result.status !== "success"); if (result.status === "success") setEditors(result.data.otherEditors);
    }); };
    heartbeat(); const timer = setInterval(heartbeat, 4 * 60_000);
    return () => { active = false; clearInterval(timer); void inFlight.finally(() => repository.write("stop-editing", {}, z.object({ stopped: z.literal(true) }), baseline.id)); };
  }, [canEdit, mode, baseline.id]);
  const close = async () => { if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các giá trị chưa lưu?"))) onClose(); };
  async function save() {
    const original = baseline;
    const valuesBody = { measuredAt: toApiTime(values.measuredAt), ph: values.ph === "" ? null : Number(values.ph), salinity: values.salinity === "" ? null : Number(values.salinity) };
    const body = mode === "void" ? { reason: values.reason, recordVersion: original.recordVersion } : mode === "correct" ? { ...valuesBody, reason: values.reason, recordVersion: original.recordVersion } : valuesBody;
    if (mode === "void" && !await confirmation.confirm("Hủy phép đo này? Phép đo sẽ bị loại khỏi dữ liệu đang sử dụng.")) return;
    const result = await mutation.run(() => repository.write(mode, body, c.waterSchema, original.id));
    if (result) onSaved(result);
  }
  return <Dialog open title={`Phép đo ${record.zoneCode} · ${statusLabel(record.statusCode)} · v${record.recordVersion}`} size="lg" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) close(); }}>
    {confirmation.dialog}
    <ErrorNotice error={mutation.error} />
    {baseline.id !== record.id && <p className="my-3">Bản nháp đang dựa trên phiên bản v{baseline.recordVersion} vừa được đối chiếu.</p>}
    {record.thresholdExceeded && <p role="alert" className="mb-4 rounded-control border border-danger p-4 text-danger">Vượt ngưỡng: {record.violatedValues}</p>}
    {ocr?.status === "Failed" && <p role="status" className="mb-4 rounded-control bg-primary-soft p-4">Ảnh và bản nháp đã được lưu. Chưa đọc được số đo từ ảnh; hãy nhập tay, đối chiếu ảnh rồi xác nhận.</p>}
    {ocr && [ocr.ph?.uncertain && "pH", ocr.salinity?.uncertain && "độ mặn", ocr.measuredAt?.uncertain && "thời điểm"].some(Boolean) && <p className="mb-4">OCR chưa chắc chắn ở: {[ocr.ph?.uncertain && "pH", ocr.salinity?.uncertain && "độ mặn", ocr.measuredAt?.uncertain && "thời điểm"].filter(Boolean).join(", ")}. Hãy đối chiếu ảnh.</p>}
    {record.photoUrl && <a href={record.photoUrl} target="_blank" rel="noreferrer" className="block"><Image src={record.photoUrl} alt="Ảnh máy đo nước gốc" width={900} height={500} unoptimized className="max-h-80 w-full rounded-control border border-border object-contain" /></a>}
    <dl className="my-5 grid gap-3 sm:grid-cols-2">{[["Vùng", record.zoneName], ["Điểm đo", record.measurementPoint ?? "—"], ["Người đo", record.measuredBy?.name ?? "—"], ["Người xác nhận", record.confirmedBy?.name ?? "—"], ["Nguồn nhập", record.inputSource === "Ocr" ? "OCR" : "Nhập tay"], ["OCR ban đầu", `pH ${record.ocrDraft.ph ?? "—"} · Độ mặn ${record.ocrDraft.salinity ?? "—"} ‰`]].map(([label, value]) => <div key={label}><dt className="text-sm text-text-muted">{label}</dt><dd>{value}</dd></div>)}</dl>
    {editors.length > 0 && <p role="status" className="my-4 rounded-control bg-primary-soft p-4">Đang có người sửa: {editors.map((editor) => `${editor.name} từ ${displayTime(editor.startedAt)}`).join("; ")}. Bạn vẫn có thể sửa; khi lưu hệ thống kiểm tra phiên bản mới nhất.</p>}
    {presenceError && <p role="status" className="my-3">Chưa tải được thông tin người đang sửa.</p>}
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(); }}><fieldset disabled={mutation.pending || mode === "view"} className="grid gap-4 sm:grid-cols-2">
      <Field label="Thời điểm đo (giờ Việt Nam) *" required type="datetime-local" disabled={mode === "view" || mode === "void"} value={values.measuredAt} onChange={(e) => setValues((current) => ({ ...current, measuredAt: e.target.value }))} />
      <Field label="pH *" required type="number" min="0" max="14" step="0.01" disabled={mode === "view" || mode === "void"} value={values.ph} onChange={(e) => setValues((current) => ({ ...current, ph: e.target.value }))} />
      <Field label="Độ mặn (‰) *" required type="number" min="0" max="100" step="0.01" disabled={mode === "view" || mode === "void"} value={values.salinity} onChange={(e) => setValues((current) => ({ ...current, salinity: e.target.value }))} />
      {(mode === "correct" || mode === "void") && <Note label={mode === "correct" ? "Lý do hiệu chỉnh *" : "Lý do hủy *"} required maxLength={1000} value={values.reason} onChange={(e) => setValues((current) => ({ ...current, reason: e.target.value }))} />}
    </fieldset>
      {mode !== "view" && <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>{mode === "confirm" ? "Xác nhận số đo" : mode === "correct" ? "Lưu bản hiệu chỉnh" : "Xác nhận hủy phép đo"}</Button>}
    </form>
    <div className="my-5 flex flex-wrap gap-2">{record.statusCode === "CONFIRMED" && record.isLatestVersion && canEdit && <Button className="w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked} onClick={() => setMode("correct")}>Hiệu chỉnh</Button>}
      {["DRAFT", "CONFIRMED"].includes(record.statusCode) && record.isLatestVersion && canEdit && <Button className="w-auto" variant="danger" disabled={mutation.pending || mutation.blocked} onClick={() => setMode("void")}>Hủy phép đo</Button>}
      {record.statusCode === "DRAFT" && record.photoUrl && record.ocrDraft.ph === null && record.ocrDraft.salinity === null && canCreate && <Button className="w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked || dirty} onClick={async () => { const result = await mutation.run(() => repository.write("recognize-again", {}, c.recognitionSchema, record.id)); if (result) onSaved(result.measurement, result.ocr); }}>Nhận dạng lại ảnh</Button>}
    </div>
    {record.thresholdsUsed && <div className="my-4 rounded-control bg-primary-soft p-4"><h3 className="font-semibold">Ngưỡng đã dùng khi xác nhận</h3><p>pH: {record.thresholdsUsed.phMin ?? "—"} — {record.thresholdsUsed.phMax ?? "—"}; độ mặn: {record.thresholdsUsed.salinityMin ?? "—"} — {record.thresholdsUsed.salinityMax ?? "—"} ‰</p></div>}
    {record.correctionReason && <p className="my-3">Lý do hiệu chỉnh: {record.correctionReason}</p>}{record.voidReason && <p className="my-3">Lý do hủy: {record.voidReason}</p>}
    <h3 className="mt-6 font-semibold">Lịch sử phiên bản</h3><DataTable headings={["Phiên bản", "Thời điểm đo", "pH", "Độ mặn", "Trạng thái", "Lý do"]}>{record.versions.map((row) => <tr key={row.id}><td><button className="text-primary underline" disabled={mutation.pending} onClick={async () => { if (!dirty || await confirmation.confirm("Bỏ các giá trị chưa lưu để xem phiên bản này?")) void onOpen(row.id); }}>v{row.recordVersion}</button></td><td>{displayTime(row.measuredAt)}</td><td>{row.ph ?? "—"}</td><td>{row.salinity ?? "—"}</td><td>{statusLabel(row.statusCode)}</td><td>{row.correctionReason ?? row.voidReason ?? "—"}</td></tr>)}</DataTable>
    {mutation.blocked && <div className="my-4 rounded-control border border-border p-4"><p>Bản đang nhập được giữ. Hãy đối chiếu phiên bản mới nhất.</p><Button className="mt-3 w-auto" variant="secondary" disabled={mutation.pending} onClick={async () => {
      const result = await mutation.run(async () => { const current = await repository.read("detail", { id: record.id }, c.waterSchema); if (current.status !== "success" || current.data.isLatestVersion) return current;
        const newest = [...current.data.versions].sort((a, b) => b.recordVersion - a.recordVersion)[0]; return newest ? repository.read("detail", { id: newest.id }, c.waterSchema) : current; }, true);
      if (result) setLatest(result);
    }}>Tải bản mới để đối chiếu</Button>{latest && <div className="mt-4 space-y-3"><p>v{latest.recordVersion} · {statusLabel(latest.statusCode)} · {displayTime(latest.measuredAt)} · pH {latest.ph ?? "—"} · Độ mặn {latest.salinity ?? "—"} ‰</p><p>Lý do: {latest.correctionReason ?? latest.voidReason ?? "—"}</p>
      {mode === "correct" && latest.isLatestVersion && latest.statusCode === "CONFIRMED" && <Button className="w-auto" variant="secondary" onClick={() => { setBaseline(latest); mutation.reviewed(); setLatest(undefined); }}>Đã đối chiếu, giữ nháp để hiệu chỉnh bản mới</Button>}
      <Button className="w-auto" variant="secondary" onClick={async () => { if (!dirty || await confirmation.confirm("Bỏ bản đang nhập và dùng dữ liệu mới?")) onSaved(latest); }}>Dùng bản mới</Button></div>}</div>}
    <Button className="mt-4 w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Đóng</Button>
  </Dialog>;
}

function ThresholdDialog({ zoneId, owner, onClose, onSaved }: { zoneId: string; owner: boolean; onClose(): void; onSaved(): void }) {
  const thresholds = useRemote(useMemo(() => (signal: AbortSignal) => repository.read("thresholds", { zoneId }, c.zoneThresholdsSchema, signal), [zoneId]));
  if (thresholds.data) return <ThresholdEditor record={thresholds.data} owner={owner} onClose={onClose} onSaved={onSaved} />;
  return <Dialog open title="Ngưỡng nước" size="lg" onOpenChange={(open) => { if (!open) onClose(); }}><ErrorNotice error={thresholds.error} />{thresholds.loading ? <Skeleton /> : <Button className="w-auto" variant="secondary" onClick={thresholds.reload}>Tải lại ngưỡng</Button>}</Dialog>;
}
function ThresholdEditor({ record, owner, onClose, onSaved }: { record: ZoneThresholds; owner: boolean; onClose(): void; onSaved(): void }) {
  const confirmation = useActionDialog();
  const [values, setValues] = useState(Object.fromEntries(Object.entries(record.thresholds).map(([key, value]) => [key, value == null ? "" : String(value)]))), [allZones, setAllZones] = useState(false);
  const [initial] = useState(() => JSON.stringify(values));
  const [localError, setLocalError] = useState<string>(), [latest, setLatest] = useState<ZoneThresholds[]>();
  const mutation = useMutation();
  const close = async () => { if (!mutation.busy() && (JSON.stringify(values) === initial && !allZones || await confirmation.confirm("Bỏ các ngưỡng chưa lưu?"))) onClose(); };
  return <Dialog open title="Ngưỡng nước" size="lg" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) close(); }}>{confirmation.dialog}<form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setLocalError(undefined); const body = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === "" ? null : Number(value)]));
    if (!c.setThresholdsSchema.safeParse(body).success) { setLocalError("Mỗi chỉ số cần đủ hai ngưỡng hoặc để trống cả hai; tối thiểu phải nhỏ hơn tối đa."); return; }
    if (!await confirmation.confirm(allZones ? "Áp dụng các ngưỡng này cho tất cả vùng đang dùng?" : `Lưu ngưỡng mới cho ${record.zoneName}?`)) return;
    void mutation.run(() => repository.write<ZoneThresholds | ZoneThresholds[]>("set-thresholds", body, allZones ? z.array(c.zoneThresholdsSchema) : c.zoneThresholdsSchema, undefined, allZones ? undefined : record.zoneId)).then((result) => { if (result) onSaved(); });
  }}><p className="font-semibold">{record.zoneName}</p><p className="text-sm text-text-muted">Ngưỡng mới áp dụng cho phép đo xác nhận sau khi lưu. Phép đo và cảnh báo cũ giữ ngưỡng đã dùng.</p><ErrorNotice error={localError || mutation.error} />
    <fieldset disabled={!owner || mutation.pending || mutation.blocked} className="grid gap-4 sm:grid-cols-2">{[["phMin", "pH tối thiểu", "14"], ["phMax", "pH tối đa", "14"], ["salinityMin", "Độ mặn tối thiểu (‰)", "100"], ["salinityMax", "Độ mặn tối đa (‰)", "100"]].map(([key, label, max]) => <Field key={key} label={label} type="number" min="0" max={max} step="0.01" value={values[key]} onChange={(e) => setValues((current) => ({ ...current, [key]: e.target.value }))} />)}
      {owner && <label className="flex items-start gap-3 sm:col-span-2"><input type="checkbox" checked={allZones} onChange={(e) => setAllZones(e.target.checked)} /><span>Áp dụng cho tất cả vùng đang sử dụng</span></label>}</fieldset>
    {mutation.blocked && <div className="space-y-3"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={async () => { const result = await mutation.run(async () => {
      if (allZones) return repository.read("thresholds", {}, z.array(c.zoneThresholdsSchema));
      const response = await repository.read("thresholds", { zoneId: record.zoneId }, c.zoneThresholdsSchema);
      return response.status === "success" ? { status: "success" as const, data: [response.data] } : response;
    }, true); if (result) setLatest(result); }}>Tải ngưỡng hiện tại để đối chiếu</Button>{latest && <><DataTable headings={["Vùng", "pH", "Độ mặn (‰)"]}>{latest.map((row) => <tr key={row.zoneId}><td>{row.zoneName}</td><td>{row.thresholds.phMin ?? "—"} — {row.thresholds.phMax ?? "—"}</td><td>{row.thresholds.salinityMin ?? "—"} — {row.thresholds.salinityMax ?? "—"}</td></tr>)}</DataTable><Button className="w-auto" variant="secondary" onClick={mutation.reviewed}>Đã đối chiếu, sửa tiếp bản đang nhập</Button></>}</div>}
    <div className="flex flex-wrap gap-3">{owner && <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Lưu ngưỡng</Button>}<Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Đóng</Button></div>
  </form></Dialog>;
}

function WaterChart({ data }: { data: Chart }) {
  return <><p className="my-4 text-sm text-text-muted">{data.from} — {data.to} · Trung bình, nhỏ nhất/lớn nhất và số lần đo. Kỳ thiếu dữ liệu không được nối thành số 0.</p><div className="grid gap-4 xl:grid-cols-2"><IndicatorChart data={data} indicator="ph" title="pH" min={data.thresholds.phMin} max={data.thresholds.phMax} /><IndicatorChart data={data} indicator="salinity" title="Độ mặn (‰)" min={data.thresholds.salinityMin} max={data.thresholds.salinityMax} /></div>
    <DataTable headings={["Kỳ", "pH TB / min / max", "Số lần", "Độ mặn TB / min / max (‰)", "Số lần"]}>{data.periods.map((period) => <tr key={period.period}><td>{period.period}{period.missing ? " · Thiếu dữ liệu" : ""}</td><td>{period.ph.average ?? "—"} / {period.ph.minimum ?? "—"} / {period.ph.maximum ?? "—"}</td><td>{period.ph.count}</td><td>{period.salinity.average ?? "—"} / {period.salinity.minimum ?? "—"} / {period.salinity.maximum ?? "—"}</td><td>{period.salinity.count}</td></tr>)}</DataTable></>;
}
function IndicatorChart({ data, indicator, title, min, max }: { data: Chart; indicator: "ph" | "salinity"; title: string; min: number | null; max: number | null }) {
  const top = Math.max(1, ...data.periods.flatMap((period) => [period[indicator].maximum ?? 0]), max ?? 0) * 1.1;
  const x = (index: number) => 42 + index * 510 / Math.max(1, data.periods.length - 1), y = (value: number) => 185 - value * 160 / top;
  let path = "", previous = false;
  data.periods.forEach((period, index) => { const average = period[indicator].average; if (period.missing || average === null) { previous = false; return; } path += `${previous ? " L" : " M"}${x(index)} ${y(average)}`; previous = true; });
  return <figure className="min-w-0 rounded-card border border-border bg-surface p-4"><figcaption className="font-semibold">{title}</figcaption><svg className="mt-3 w-full" viewBox="0 0 600 230" role="img" aria-label={`${title}: đường trung bình và khoảng nhỏ nhất/lớn nhất; ngưỡng hiện tại ${min ?? "chưa đặt"} đến ${max ?? "chưa đặt"}`}>
    <line x1="42" y1="25" x2="42" y2="185" stroke="#64748b" /><line x1="42" y1="185" x2="552" y2="185" stroke="#64748b" /><text x="2" y="32" fontSize="12">{top.toFixed(1)}</text><text x="16" y="190" fontSize="12">0</text>
    {[min, max].map((bound, index) => bound !== null && <g key={index}><line x1="42" x2="552" y1={y(bound)} y2={y(bound)} stroke="#b45309" strokeDasharray="6 4" /><text x="556" y={y(bound) + 4} fontSize="11">{bound}</text></g>)}
    {data.periods.map((period, index) => !period.missing && period[indicator].minimum !== null && period[indicator].maximum !== null && <line key={period.period} x1={x(index)} x2={x(index)} y1={y(period[indicator].minimum!)} y2={y(period[indicator].maximum!)} stroke="#7dd3fc" strokeWidth="5"><title>{period.period}: {period[indicator].minimum} — {period[indicator].maximum}</title></line>)}
    <path d={path} fill="none" stroke="#0369a1" strokeWidth="2" />{data.periods.map((period, index) => !period.missing && period[indicator].average !== null && <circle key={period.period} cx={x(index)} cy={y(period[indicator].average!)} r="3" fill="#0369a1"><title>{period.period}: {period[indicator].average}</title></circle>)}
    <text x="42" y="215" fontSize="12">{data.periods[0]?.period ?? ""}</text><text x="552" y="215" textAnchor="end" fontSize="12">{data.periods.at(-1)?.period ?? ""}</text>
  </svg></figure>;
}

"use client";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { operationAllowed } from "./permissions";
import * as c from "./contracts";
import { createOperationsRepository, type Query } from "./repository";
import { loadOptions } from "./lookups";
import { control, DataTable, ErrorNotice, Field, MethodOptions, Money, Note, Paging, Select, Skeleton, businessToday, methodLabel, statusLabel, useMutation, useRemote } from "./ui";

const repository = createOperationsRepository("purchase-receipts");
const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);
const loadSuppliers = (signal: AbortSignal) => loadOptions("suppliers", signal);
const loadItems = (signal: AbortSignal) => loadOptions("input-items", signal);
type Lines = { key: string; itemId: string; quantity: string; unitPrice: string; supplierLotCode: string; actualSource: string }[];
const blankLine = () => ({ key: crypto.randomUUID(), itemId: "", quantity: "", unitPrice: "", supplierLotCode: "", actualSource: "" });
function ReceiptTotals({ record }: { record: Pick<c.Receipt, "payable" | "paid" | "returned" | "outstanding"> }) {
  return <dl className="my-4 grid gap-4 rounded-control bg-primary-soft p-4 sm:grid-cols-4">{[["Phải trả", record.payable], ["Đã trả", record.paid], ["Hàng trả", record.returned], ["Còn nợ", record.outstanding]].map(([label, value]) => <div key={label}><dt className="text-sm">{label}</dt><dd className="mt-1 font-semibold"><Money value={Number(value)} /></dd></div>)}</dl>;
}
export function ReceiptScreen() {
  const context = useApiWorkspace();
  const [filters, setFilters] = useState({ code: "", zoneId: "", supplierId: "", raftId: "", itemId: "", itemGroup: "", statusId: "", from: businessToday().slice(0, 4) + "-01-01", to: businessToday() });
  const [page, setPage] = useState(1), [selected, setSelected] = useState<c.Receipt | null>(), [costs, setCosts] = useState<z.infer<typeof c.raftCostsSchema>>();
  const [editorSerial, setEditorSerial] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState<{ receiptId: string; files: File[] }>();
  const [notice, setNotice] = useState<string>();
  const zones = useRemote(loadZones), suppliers = useRemote(loadSuppliers), items = useRemote(loadItems);
  const query = useMemo<Query>(() => ({ ...filters, page: String(page), pageSize: "20" }), [filters, page]);
  const list = useRemote(useMemo(() => (signal: AbortSignal) => repository.read("list", query, c.receiptSearchSchema, signal), [query]));
  const rafts = useRemote(useMemo(() => (signal: AbortSignal) => filters.zoneId ? loadOptions("rafts", signal, { zoneId: filters.zoneId })
    : Promise.resolve({ status: "success" as const, data: [] as ApiRecord[] }), [filters.zoneId]));
  const mutation = useMutation();
  const canCreate = operationAllowed("purchase-receipts", context.identity, context.permissions.functionPermissions, "Create");
  const filter = (key: keyof typeof filters, value: string) => { setFilters((current) => ({ ...current, [key]: value, ...(key === "zoneId" ? { raftId: "" } : {}) })); setPage(1); };
  async function open(id: string) { const result = await mutation.run(() => repository.read("detail", { id }, c.receiptSchema), true); if (result) { setPendingInvoices(undefined); setSelected(result); setEditorSerial((value) => value + 1); } }
  return <section><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-semibold">Phiếu nhập</h1><div className="flex flex-wrap gap-2">
    {canCreate && <Button className="w-auto" disabled={mutation.pending} onClick={() => { setPendingInvoices(undefined); setSelected(null); }}>Tạo phiếu nhập</Button>}
    <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={async () => { const result = await mutation.run(() => repository.read("costs", query, c.raftCostsSchema), true); if (result) setCosts(result); }}>Chi phí vật tư bè</Button>
    {operationAllowed("purchase-receipts", context.identity, context.permissions.functionPermissions, "Export", filters.zoneId || undefined) && <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => void mutation.run(() => repository.download(query), true)}>Xuất Excel</Button>}
  </div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Field label="Mã phiếu" value={filters.code} onChange={(e) => filter("code", e.target.value)} />
      <Select label="Vùng nuôi" value={filters.zoneId} onChange={(e) => filter("zoneId", e.target.value)}><option value="">Tất cả vùng được cấp</option>{zones.data?.map((row) => <option key={row.id} value={row.id}>{String(row.name)}</option>)}</Select>
      <Select label="Nhà cung cấp" value={filters.supplierId} onChange={(e) => filter("supplierId", e.target.value)}><option value="">Tất cả</option>{suppliers.data?.map((row) => <option key={row.id} value={row.id}>{String(row.name)}</option>)}</Select>
      <Select label="Trạng thái" value={filters.statusId} onChange={(e) => filter("statusId", e.target.value)}><option value="">Tất cả</option>{[1701, 1702, 1703].map((id) => <option key={id} value={id}>{statusLabel(id)}</option>)}</Select>
      <Field label="Từ ngày" type="date" value={filters.from} onChange={(e) => filter("from", e.target.value)} /><Field label="Đến ngày" type="date" value={filters.to} onChange={(e) => filter("to", e.target.value)} />
      <Select label="Nhóm vật tư" value={filters.itemGroup} onChange={(e) => filter("itemGroup", e.target.value)}><option value="">Tất cả</option><option value="Seed">Giống</option><option value="RaftMaterial">Vật tư bè</option><option value="Other">Khác</option></Select>
      <Select label="Vật tư" value={filters.itemId} onChange={(e) => filter("itemId", e.target.value)}><option value="">Tất cả</option>{items.data?.map((row) => <option key={row.id} value={row.id}>{String(row.name)}</option>)}</Select>
      {filters.zoneId && <Select label="Bè" value={filters.raftId} onChange={(e) => filter("raftId", e.target.value)}><option value="">Tất cả bè</option>{rafts.data?.map((row) => <option key={row.id} value={row.id}>{String(row.code)}</option>)}</Select>}
    </div>
    <ErrorNotice error={list.error || mutation.error || zones.error || suppliers.error || items.error || rafts.error} />
    <Button className="mt-4 w-auto" variant="secondary" disabled={list.loading} onClick={list.reload}>Tải lại danh sách</Button>
    {notice && <p role="status" className="mt-3 text-primary">{notice}</p>}
    {list.loading ? <Skeleton /> : list.data && <>
      <ReceiptTotals record={list.data.totals} /><p className="text-sm text-text-muted">Tổng tiền tính trên {list.data.totals.completedCount} phiếu hoàn thành · {list.data.from} — {list.data.to}</p>
      <DataTable headings={["Mã phiếu", "Ngày nhập", "Nhà cung cấp", "Vùng / bè", "Trạng thái", "Phải trả", "Còn nợ", "Chi tiết"]} empty={!list.data.page.items.length}>{list.data.page.items.map((row) => <tr key={row.id}>
        <td>{row.code}</td><td>{row.receiptDate ?? "—"}</td><td>{row.supplier.name}</td><td>{row.zone.name}{row.raft ? ` / ${row.raft.code}` : ""}</td><td>{statusLabel(row.statusId)}</td><td><Money value={row.payable} /></td><td><Money value={row.outstanding} /></td>
        <td><button className="font-semibold text-primary underline" disabled={mutation.pending} onClick={() => void open(row.id)}>Mở phiếu</button></td></tr>)}</DataTable>
      <Paging page={page} total={list.data.page.total} disabled={list.loading} onChange={setPage} />
    </>}
    {selected !== undefined && <ReceiptEditor key={`${selected?.id ?? "new"}:${editorSerial}`} record={selected} zones={zones.data ?? []} suppliers={suppliers.data ?? []} items={items.data ?? []}
      initialFiles={pendingInvoices?.receiptId === selected?.id ? pendingInvoices?.files : undefined}
      onClose={() => { setPendingInvoices(undefined); setSelected(undefined); }} onSaved={(saved, files = []) => { setPendingInvoices(files.length ? { receiptId: saved.id, files } : undefined); setSelected(saved); setEditorSerial((value) => value + 1); list.reload(); setNotice(`Đã cập nhật phiếu ${saved.code}.`); }} />}
    {costs && <Dialog open title="Chi phí vật tư bè" size="lg" onOpenChange={(open) => { if (!open) setCosts(undefined); }}><DataTable headings={["Vùng", "Bè", "Chi phí", "Phiếu nhập"]} empty={!costs.length}>{costs.map((row) => <tr key={row.raft.id}><td>{row.zone.name}</td><td>{row.raft.code}</td><td><Money value={row.materialCost} /></td><td>{row.receipts.map((receipt) => <button key={receipt.receiptId} className="mr-3 text-primary underline" onClick={() => { setCosts(undefined); void open(receipt.receiptId); }}>{receipt.code}</button>)}</td></tr>)}</DataTable></Dialog>}
  </section>;
}

export function ReceiptEditor({ record, zones, suppliers, items, initialFiles = [], onClose, onSaved }: { record: c.Receipt | null; zones: ApiRecord[]; suppliers: ApiRecord[]; items: ApiRecord[]; initialFiles?: File[]; onClose(): void; onSaved(record: c.Receipt, pendingFiles?: File[]): void }) {
  const confirmation = useActionDialog();
  const context = useApiWorkspace();
  const initial = { supplierId: record?.supplier.id ?? "", zoneId: record?.zone.id ?? "", raftId: record?.raft?.id ?? "", receiptDate: record?.receiptDate ?? businessToday(),
    discountAmount: String(record?.discountAmount ?? 0), amountPaidNow: String(record?.amountPaidNow ?? 0), paidNowMethod: record?.paidNowMethod ?? "", notes: record?.notes ?? "" };
  const initialLines: Lines = record?.lines.map((row) => ({ key: row.id, itemId: row.itemId, quantity: row.quantity ? String(row.quantity) : "", unitPrice: String(row.unitPrice), supplierLotCode: row.supplierLotCode ?? "", actualSource: row.actualSource ?? "" })) ?? [blankLine()];
  const [values, setValues] = useState(initial), [lines, setLines] = useState(initialLines), [localError, setLocalError] = useState<string>();
  const [latest, setLatest] = useState<c.Receipt>(), [mode, setMode] = useState<"cancel" | "return">(), [files, setFiles] = useState<File[]>(initialFiles);
  const [returnDetail, setReturnDetail] = useState<z.infer<typeof c.returnSchema>>();
  const [initialSnapshot] = useState(() => JSON.stringify({ values: initial, lines: initialLines }));
  const baseline = useRef(record), invoicePicker = useRef<HTMLInputElement>(null), mutation = useMutation();
  const dirty = JSON.stringify({ values, lines }) !== initialSnapshot;
  const editable = !record || record.statusId === 1701;
  const action = record ? "Edit" : "Create";
  const canEdit = editable && operationAllowed("purchase-receipts", context.identity, context.permissions.functionPermissions, action, values.zoneId || undefined);
  const allowedZones = zones.filter((zone) => zone.statusId === 101 && operationAllowed("purchase-receipts", context.identity, context.permissions.functionPermissions, action, zone.id));
  const activeSuppliers = suppliers.filter((row) => row.statusId === 101), activeItems = items.filter((row) => row.statusId === 101);
  const rafts = useRemote(useMemo(() => (signal: AbortSignal) => values.zoneId ? loadOptions("rafts", signal, { zoneId: values.zoneId, statusId: "101" })
    : Promise.resolve({ status: "success" as const, data: [] as ApiRecord[] }), [values.zoneId]));
  const change = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value, ...(key === "zoneId" ? { raftId: "" } : {}) }));
  const changeLine = (key: string, field: keyof Lines[number], value: string) => setLines((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row));
  async function save(complete: boolean) {
    setLocalError(undefined);
    if (complete && files.length) { setLocalError("Hãy tải hóa đơn đã chọn lên hoặc bỏ chọn tệp trước khi hoàn thành phiếu."); return; }
    const payload = { ...values, raftId: values.raftId || null, receiptDate: values.receiptDate || null, discountAmount: Number(values.discountAmount || 0), amountPaidNow: Number(values.amountPaidNow || 0),
      paidNowMethod: values.paidNowMethod || null, notes: values.notes || null, complete, rowVersion: baseline.current?.rowVersion ?? null,
      lines: lines.filter((row) => row.itemId || row.quantity || row.unitPrice || row.supplierLotCode || row.actualSource).map((row) => ({ itemId: row.itemId, quantity: row.quantity === "" ? null : Number(row.quantity), unitPrice: row.unitPrice === "" ? null : Number(row.unitPrice), supplierLotCode: row.supplierLotCode || null, actualSource: row.actualSource || null })) };
    if (complete && (!values.receiptDate || !payload.lines.length || payload.lines.some((row) => !row.itemId || row.quantity === null || row.unitPrice === null))) { setLocalError("Để hoàn thành, cần ngày nhập và ít nhất một dòng có đủ vật tư, số lượng, đơn giá."); return; }
    const result = await mutation.run(() => repository.write(record ? "update" : "create", payload, c.receiptSchema, record?.id));
    if (result) onSaved(result, result.statusId === 1701 ? files : undefined);
  }
  const close = async () => { if (!mutation.busy() && (!dirty && !mode && !files.length || await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) onClose(); };
  return <Dialog open size="xl" title={record ? `Phiếu ${record.code} · ${statusLabel(record.statusId)}` : "Tạo phiếu nhập"} dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) close(); }}>
    {confirmation.dialog}
    <ErrorNotice error={localError || mutation.error || rafts.error} />
    {files.length > 0 && <p role="status" id="receipt-pending-invoices" className="my-3 rounded-control border border-border p-3">Có {files.length} hóa đơn chưa tải lên. Hãy tải lên hoặc bỏ chọn tệp trước khi hoàn thành hoặc hủy phiếu.</p>}
    {record && <ReceiptTotals record={record} />}
    <form onSubmit={(e) => { e.preventDefault(); const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; void save(submitter?.value === "complete"); }}>
      <fieldset disabled={mutation.pending || !canEdit} className="grid gap-4 sm:grid-cols-2">
        <Select label="Nhà cung cấp *" required value={values.supplierId} onChange={(e) => change("supplierId", e.target.value)}><option value="">Chọn nhà cung cấp</option>{record && !activeSuppliers.some((row) => row.id === record.supplier.id) && values.supplierId === record.supplier.id && <option value={record.supplier.id}>{record.supplier.name} (ngừng dùng)</option>}{activeSuppliers.map((row) => <option key={row.id} value={row.id}>{String(row.name)}</option>)}</Select>
        <Select label="Vùng nuôi *" required value={values.zoneId} onChange={(e) => change("zoneId", e.target.value)}><option value="">Chọn vùng nuôi</option>{record && !allowedZones.some((row) => row.id === record.zone.id) && <option value={record.zone.id}>{record.zone.name}</option>}{allowedZones.map((row) => <option key={row.id} value={row.id}>{String(row.name)}</option>)}</Select>
        <Field label="Ngày nhập" type="date" max={businessToday()} value={values.receiptDate} onChange={(e) => change("receiptDate", e.target.value)} />
        <Select label="Bè (bắt buộc với vật tư bè)" value={values.raftId} onChange={(e) => change("raftId", e.target.value)}><option value="">Chưa chọn bè</option>{record?.raft && values.raftId === record.raft.id && values.zoneId === record.zone.id && !rafts.data?.some((row) => row.id === record.raft?.id) && <option value={record.raft.id}>{record.raft.code}</option>}{rafts.data?.map((row) => <option key={row.id} value={row.id}>{String(row.code)}</option>)}</Select>
        <Field label="Chiết khấu (đồng)" type="number" min="0" step="1000" value={values.discountAmount} onChange={(e) => change("discountAmount", e.target.value)} />
        <Field label="Trả ngay (đồng)" type="number" min="0" step="1000" value={values.amountPaidNow} onChange={(e) => change("amountPaidNow", e.target.value)} />
        <Select label="Hình thức trả ngay" value={values.paidNowMethod} onChange={(e) => change("paidNowMethod", e.target.value)}><option value="">Chọn nếu có trả ngay</option><MethodOptions /></Select>
        <Note label="Ghi chú" maxLength={1000} value={values.notes} onChange={(e) => change("notes", e.target.value)} />
        <fieldset className="space-y-4 rounded-control border border-border p-4 sm:col-span-2"><legend>Hàng nhập</legend>{lines.map((row, index) => <div className="grid gap-3 border-b border-border pb-4 sm:grid-cols-3" key={row.key}>
          <Select label={`Dòng ${index + 1} · Vật tư`} value={row.itemId} onChange={(e) => changeLine(row.key, "itemId", e.target.value)}><option value="">Chọn vật tư</option>{row.itemId && !activeItems.some((item) => item.id === row.itemId) && <option value={row.itemId}>{record?.lines.find((line) => line.itemId === row.itemId)?.itemName ?? "Vật tư đã ngừng dùng"} (ngừng dùng)</option>}{activeItems.map((item) => <option key={item.id} value={item.id}>{String(item.code)} · {String(item.name)} ({String(item.unit)})</option>)}</Select>
          <Field label="Số lượng" type="number" min="0.001" max="1000000000" step="0.001" value={row.quantity} onChange={(e) => changeLine(row.key, "quantity", e.target.value)} />
          <Field label="Đơn giá (đồng)" type="number" min="0" step="1" value={row.unitPrice} onChange={(e) => changeLine(row.key, "unitPrice", e.target.value)} />
          <Field label="Mã lô nhà cung cấp" maxLength={100} value={row.supplierLotCode} onChange={(e) => changeLine(row.key, "supplierLotCode", e.target.value)} /><Field label="Nguồn thực tế" maxLength={500} value={row.actualSource} onChange={(e) => changeLine(row.key, "actualSource", e.target.value)} />
          <Button className="self-end" variant="secondary" onClick={() => setLines((current) => current.filter((line) => line.key !== row.key))}>Bỏ dòng {index + 1}</Button>
        </div>)}<Button className="w-auto" variant="secondary" onClick={() => setLines((current) => [...current, blankLine()])}>Thêm dòng hàng</Button></fieldset>
      </fieldset>
      {canEdit && <div className="mt-5 flex flex-wrap justify-end gap-3"><Button className="w-auto" type="submit" value="draft" isPending={mutation.pending} disabled={mutation.blocked}>Lưu nháp</Button>
        <Button className="w-auto" type="submit" value="complete" aria-describedby={files.length ? "receipt-pending-invoices" : undefined} disabled={mutation.pending || mutation.blocked || files.length > 0}>Lưu và hoàn thành</Button></div>}
    </form>
    {record && <>
      <DataTable headings={["Vật tư", "Số lượng", "Thành tiền", "Lô giống", "Đã thả", "Đã trả", "Còn được trả"]}>{record.lines.map((row) => <tr key={row.id}><td>{row.itemName}</td><td>{row.quantity} {row.unit}</td><td><Money value={row.lineAmount} /></td><td>{row.seedLotCode ?? "—"}</td><td>{row.stocked}</td><td>{row.returnedQuantity}</td><td>{row.returnable}</td></tr>)}</DataTable>
      <div className="my-5 flex flex-wrap gap-2">
        {record.statusId === 1701 && operationAllowed("purchase-receipts", context.identity, context.permissions.functionPermissions, "Edit", record.zone.id) && <Button className="w-auto" variant="secondary" aria-describedby={files.length ? "receipt-pending-invoices" : undefined} disabled={mutation.pending || mutation.blocked || dirty || files.length > 0} onClick={async () => { if (files.length) return; if (await confirmation.confirm("Hoàn thành phiếu đã lưu? Công nợ, lô giống và khoản trả ngay sẽ được ghi nhận.")) { const saved = await mutation.run(() => repository.write("complete", { rowVersion: baseline.current?.rowVersion }, c.receiptSchema, record.id)); if (saved) onSaved(saved); } }}>Hoàn thành phiếu đã lưu</Button>}
        {record.statusId !== 1703 && operationAllowed("purchase-receipts", context.identity, context.permissions.functionPermissions, "Delete", record.zone.id) && <Button className="w-auto" variant="danger" aria-describedby={files.length ? "receipt-pending-invoices" : undefined} disabled={mutation.pending || mutation.blocked || dirty || files.length > 0} onClick={() => setMode("cancel")}>Hủy phiếu</Button>}
        {record.statusId !== 1701 && operationAllowed("purchase-receipts", context.identity, context.permissions.functionPermissions, "Create", record.zone.id) && <Button className="w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked} onClick={async () => { const saved = await mutation.run(() => repository.write("copy", {}, c.receiptSchema, record.id)); if (saved) onSaved(saved); }}>Sao chép thành nháp</Button>}
        {record.statusId === 1702 && operationAllowed("purchase-receipts", context.identity, context.permissions.functionPermissions, "Create", record.zone.id) && <Button className="w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked} onClick={() => setMode("return")}>Trả hàng</Button>}
      </div>
      {mode && <ReceiptAction key={mode} mode={mode} record={record} disabled={mutation.pending || mutation.blocked || mode === "cancel" && files.length > 0} onCancel={() => setMode(undefined)} onSubmit={async (action, body) => {
        if (action === "cancel" && files.length) { setLocalError("Hãy tải hóa đơn đã chọn lên hoặc bỏ chọn tệp trước khi hủy phiếu."); return; }
        const payload = action === "cancel" ? { ...body, rowVersion: baseline.current?.rowVersion ?? record.rowVersion } : body;
        const saved = await mutation.run(() => repository.write(action, payload, c.receiptSchema, record.id)); if (saved) onSaved(saved);
      }} />}
      <h3 className="mt-6 font-semibold">Hóa đơn</h3><ul className="my-3 space-y-2">{record.invoicePhotoUrls.map((url, index) => <li key={index}><a className="text-primary underline" href={url} download>Tải hóa đơn {index + 1}</a></li>)}</ul>
      {record.statusId === 1701 && operationAllowed("purchase-receipts", context.identity, context.permissions.functionPermissions, "Edit", record.zone.id) && <div className="space-y-3"><Field ref={invoicePicker} label="Thêm hóa đơn (JPEG, PNG, PDF; tối đa 10 tệp, 10 MB/tệp)" type="file" accept="image/jpeg,image/png,application/pdf" multiple disabled={mutation.pending || mutation.blocked || dirty} onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
        {files.length > 0 && <section aria-label="Hóa đơn chưa tải lên" className="min-w-0 space-y-2 rounded-control border border-border p-3"><p>Đã chọn {files.length} tệp, chưa tải lên. Lưu nháp phiếu giữ các tệp trong trang này; tải lại trang sẽ mất lựa chọn.</p><ul className="space-y-1">{files.map((file, index) => <li className="break-all text-sm" key={`${file.name}:${index}`}>{file.name}</li>)}</ul><Button className="w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked} onClick={async () => { if (await confirmation.confirm("Bỏ các tệp hóa đơn đã chọn nhưng chưa tải lên?")) { setFiles([]); if (invoicePicker.current) invoicePicker.current.value = ""; } }}>Bỏ chọn tệp</Button></section>}
        <Button className="w-auto" variant="secondary" disabled={!files.length || mutation.pending || mutation.blocked || dirty} onClick={async () => { const saved = await mutation.run(() => repository.upload("invoice-photos", files, {}, c.receiptSchema, record.id)); if (saved) onSaved(saved); }}>Tải hóa đơn lên</Button></div>}
      <h3 className="mt-6 font-semibold">Lịch sử thanh toán</h3><DataTable headings={["Ngày", "Số tiền", "Hình thức", "Trạng thái"]} empty={!record.payments.length}>{record.payments.map((row) => <tr key={row.id}><td>{row.paymentDate}</td><td><Money value={row.amount} /></td><td>{methodLabel(row.method)}</td><td>{statusLabel(row.statusId)}</td></tr>)}</DataTable>
      <h3 className="font-semibold">Lịch sử trả hàng</h3><DataTable headings={["Phiếu trả", "Ngày", "Lý do", "Giá trị", "Hoàn tiền", "Giảm nợ"]} empty={!record.returns.length}>{record.returns.map((row) => <tr key={row.id}><td><button className="text-primary underline" disabled={mutation.pending} onClick={async () => { const detail = await mutation.run(() => repository.read("return-detail", { id: row.id }, c.returnSchema), true); if (detail) setReturnDetail(detail); }}>{row.code}</button></td><td>{row.returnDate}</td><td>{row.reason}</td><td><Money value={row.returnValue} /></td><td><Money value={row.refundAmount} /></td><td><Money value={row.debtReductionAmount} /></td></tr>)}</DataTable>
      {record.cancelReason && <p className="my-3">Lý do hủy: {record.cancelReason}</p>}
    </>}
    {returnDetail && <div className="my-4 rounded-control border border-border p-4"><h3 className="font-semibold">Chi tiết {returnDetail.code}</h3><DataTable headings={["Vật tư", "Số lượng", "Giá trị trả"]}>{returnDetail.lines.map((row) => <tr key={row.receiptLineId}><td>{row.itemName}</td><td>{row.quantity} {row.unit}</td><td><Money value={row.returnValue} /></td></tr>)}</DataTable></div>}
    {mutation.blocked && <div className="my-4 rounded-control border border-border p-4"><p>Bản nháp đang được giữ. Hãy đối chiếu kết quả trước khi tiếp tục.</p>{record ? <>
      <Button className="mt-3 w-auto" variant="secondary" disabled={mutation.pending} onClick={async () => { const value = await mutation.run(() => repository.read("detail", { id: record.id }, c.receiptSchema), true); if (value) setLatest(value); }}>Tải bản mới để đối chiếu</Button>
      {latest && <div className="mt-4"><p>{latest.code} · {statusLabel(latest.statusId)} · {latest.notes || "Không có ghi chú"}</p><p className="mt-2">{latest.supplier.name} · {latest.zone.name} · Bè {latest.raft?.code ?? "chưa chọn"} · Ngày {latest.receiptDate ?? "chưa nhập"}</p><p>Chiết khấu <Money value={latest.discountAmount} /> · Trả ngay <Money value={latest.amountPaidNow} /> · {latest.paidNowMethod ? methodLabel(latest.paidNowMethod) : "Chưa chọn hình thức"}</p><ReceiptTotals record={latest} /><DataTable headings={["Vật tư mới", "Số lượng", "Đơn giá", "Mã lô NCC", "Nguồn thực tế"]}>{latest.lines.map((row) => <tr key={row.id}><td>{row.itemName}</td><td>{row.quantity}</td><td><Money value={row.unitPrice} /></td><td>{row.supplierLotCode ?? "—"}</td><td>{row.actualSource ?? "—"}</td></tr>)}</DataTable>
        <div className="flex flex-wrap gap-2">{latest.statusId === 1701 && <Button className="w-auto" variant="secondary" onClick={() => { baseline.current = latest; mutation.reviewed(); setLatest(undefined); }}>Đã đối chiếu, giữ bản nháp để sửa tiếp</Button>}
          <Button className="w-auto" variant="secondary" onClick={async () => { if (await confirmation.confirm("Bỏ bản nháp và dùng dữ liệu mới?")) onSaved(latest); }}>Dùng bản mới</Button></div></div>}
    </> : <a className="mt-3 block text-primary underline" href="/operations/purchase-receipts" target="_blank" rel="noreferrer">Mở danh sách ở tab khác để kiểm tra</a>}</div>}
    <Button className="mt-6 w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Đóng</Button>
  </Dialog>;
}

function ReceiptAction({ mode, record, disabled, onCancel, onSubmit }: { mode: "cancel" | "return"; record: c.Receipt; disabled: boolean; onCancel(): void; onSubmit(action: "cancel" | "return", body: Record<string, unknown>): Promise<void> }) {
  const confirmation = useActionDialog();
  const [reason, setReason] = useState(""), [date, setDate] = useState(businessToday()), [cancelPayments, setCancelPayments] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({}), [refund, setRefund] = useState("0"), [reduction, setReduction] = useState("0"), [method, setMethod] = useState("Cash");
  return <form className="my-5 space-y-4 rounded-control border border-border p-4" onSubmit={async (e) => {
    e.preventDefault(); if (!await confirmation.confirm(mode === "cancel" ? "Hủy phiếu với lý do và cách xử lý tiền đã chọn?" : "Ghi nhận trả hàng và các khoản hoàn tiền/giảm nợ đã nhập?")) return;
    void onSubmit(mode, mode === "cancel" ? { reason, rowVersion: record.rowVersion, cancelPayments: cancelPayments === "" ? null : cancelPayments === "cancel" }
      : { reason, returnDate: date, refundAmount: Number(refund), debtReductionAmount: Number(reduction), refundMethod: Number(refund) > 0 ? method : null,
        lines: record.lines.filter((row) => Number(quantities[row.id]) > 0).map((row) => ({ receiptLineId: row.id, quantity: Number(quantities[row.id]) })) });
  }}>{confirmation.dialog}<h3 className="font-semibold">{mode === "cancel" ? "Hủy phiếu nhập" : "Trả hàng nhà cung cấp"}</h3><fieldset disabled={disabled} className="space-y-4">
    <Note label="Lý do *" required maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
    {mode === "cancel" ? record.payments.some((row) => row.statusId === 1801) && <Select label="Xử lý khoản đã trả *" required value={cancelPayments} onChange={(e) => setCancelPayments(e.target.value)}><option value="">Chọn cách xử lý</option><option value="cancel">Hủy các khoản thanh toán của phiếu</option><option value="keep">Giữ thành khoản chưa phân bổ của nhà cung cấp</option></Select> : <>
      <Field label="Ngày trả *" required type="date" min={record.receiptDate ?? undefined} max={businessToday()} value={date} onChange={(e) => setDate(e.target.value)} />
      <DataTable headings={["Hàng", "Còn được trả", "Số lượng trả"]}>{record.lines.map((row) => <tr key={row.id}><td>{row.itemName}</td><td>{row.returnable} {row.unit}</td><td><input aria-label={`Số lượng trả ${row.itemName}`} className={control} type="number" min="0" max={row.returnable} step="0.001" disabled={row.returnable <= 0} value={quantities[row.id] ?? ""} onChange={(e) => setQuantities((current) => ({ ...current, [row.id]: e.target.value }))} /></td></tr>)}</DataTable>
      <p className="text-sm text-text-muted">Giá trị trả tính theo giá trị hàng sau chiết khấu và làm tròn tiền của phiếu. Tiền hoàn cộng giảm nợ phải khớp giá trị trả.</p>
      <Field label="Tiền hoàn nhận lại (đồng)" required type="number" min="0" step="1000" value={refund} onChange={(e) => setRefund(e.target.value)} /><Select label="Hình thức hoàn tiền" value={method} onChange={(e) => setMethod(e.target.value)}><MethodOptions /></Select>
      <Field label="Giảm công nợ (đồng)" required type="number" min="0" step="1000" value={reduction} onChange={(e) => setReduction(e.target.value)} />
    </>}
    <div className="flex flex-wrap gap-2"><Button className="w-auto" type="submit">{mode === "cancel" ? "Xác nhận hủy phiếu" : "Ghi nhận trả hàng"}</Button><Button className="w-auto" variant="secondary" onClick={onCancel}>Quay lại</Button></div>
  </fieldset></form>;
}

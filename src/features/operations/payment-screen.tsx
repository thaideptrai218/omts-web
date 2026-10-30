"use client";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "./permissions";
import * as c from "./contracts";
import { createOperationsRepository, type Query } from "./repository";
import { DataTable, ErrorNotice, Field, MethodOptions, Money, Paging, Select, Skeleton, businessToday, methodLabel, statusLabel, useMutation, useRemote } from "./ui";

const repository = createOperationsRepository("supplier-payments");
const loadDebts = (signal: AbortSignal) => repository.read("debts", {}, c.debtsSchema, signal);
type Debt = z.infer<typeof c.debtSchema>;
type Debts = z.infer<typeof c.debtsSchema>;
export function PaymentScreen() {
  const context = useApiWorkspace();
  const [filters, setFilters] = useState({ supplierId: "", receiptId: "", method: "", statusId: "", from: "", to: "" });
  const [page, setPage] = useState(1), [editor, setEditor] = useState<c.Payment | null>(), [notice, setNotice] = useState<string>();
  const debts = useRemote(loadDebts);
  const query = useMemo<Query>(() => ({ ...filters, page: String(page), pageSize: "20" }), [filters, page]);
  const history = useRemote(useMemo(() => (signal: AbortSignal) => repository.read("list", query, c.paymentSearchSchema, signal), [query]));
  const supplierDebt = useRemote(useMemo(() => (signal: AbortSignal) => filters.supplierId ? repository.read("debt", { supplierId: filters.supplierId }, c.debtSchema, signal)
    : Promise.resolve({ status: "success" as const, data: undefined as Debt | undefined }), [filters.supplierId]));
  const canCreate = operationAllowed("supplier-payments", context.identity, context.permissions.functionPermissions, "Create");
  const filter = (key: keyof typeof filters, value: string) => { setFilters((current) => ({ ...current, [key]: value, ...(key === "supplierId" ? { receiptId: "" } : {}) })); setPage(1); };
  function reload() { history.reload(); debts.reload(); supplierDebt.reload(); }
  return <section><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-semibold">Thanh toán nhà cung cấp</h1>{canCreate && <Button className="w-auto" onClick={() => setEditor(null)}>Ghi nhận thanh toán</Button>}</div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Select label="Nhà cung cấp" value={filters.supplierId} onChange={(e) => filter("supplierId", e.target.value)}><option value="">Tất cả</option>{debts.data?.map((row) => <option key={row.supplierId} value={row.supplierId}>{row.supplierName}</option>)}</Select>
      <Select label="Phiếu nhập" value={filters.receiptId} disabled={!filters.supplierId} onChange={(e) => filter("receiptId", e.target.value)}><option value="">Tất cả phiếu</option>{supplierDebt.data?.receipts.map((row) => <option key={row.receiptId} value={row.receiptId}>{row.code}</option>)}</Select>
      <Select label="Hình thức" value={filters.method} onChange={(e) => filter("method", e.target.value)}><option value="">Tất cả</option><MethodOptions /></Select>
      <Select label="Trạng thái" value={filters.statusId} onChange={(e) => filter("statusId", e.target.value)}><option value="">Tất cả</option><option value="1801">Đã ghi nhận</option><option value="1802">Đã hủy</option></Select>
      <Field label="Từ ngày" type="date" value={filters.from} onChange={(e) => filter("from", e.target.value)} /><Field label="Đến ngày" type="date" value={filters.to} onChange={(e) => filter("to", e.target.value)} />
    </div>
    <ErrorNotice error={history.error || debts.error || supplierDebt.error} /><Button className="mt-4 w-auto" variant="secondary" disabled={history.loading} onClick={reload}>Tải lại dữ liệu</Button>
    {notice && <p role="status" className="mt-4 text-primary">{notice}</p>}
    {history.loading ? <Skeleton /> : history.data && <><p className="mt-5 font-semibold">Tổng thanh toán trong bộ lọc: <Money value={history.data.totalAmount} /></p>
      <DataTable headings={["Ngày", "Nhà cung cấp", "Phiếu nhập", "Số tiền", "Hình thức", "Mã tham chiếu", "Trạng thái", "Chi tiết"]} empty={!history.data.page.items.length}>{history.data.page.items.map((row) => <tr key={row.id}>
        <td>{row.paymentDate}</td><td>{row.supplier.name}</td><td>{row.receiptCode ?? "Chưa phân bổ"}</td><td><Money value={row.amount} /></td><td>{methodLabel(row.method)}</td><td>{row.referenceCode ?? "—"}</td><td>{statusLabel(row.statusId)}</td><td><button className="text-primary underline" onClick={() => setEditor(row)}>Mở khoản tiền</button></td></tr>)}</DataTable>
      <Paging page={page} total={history.data.page.total} onChange={setPage} />
    </>}
    <h2 className="mt-8 text-xl font-semibold">Công nợ nhà cung cấp</h2>
    {debts.loading ? <Skeleton /> : <DataTable headings={["Nhà cung cấp", "Phải trả", "Hàng trả", "Đã trả", "Hoàn lại", "Chưa phân bổ", "Còn nợ", "Theo phiếu"]} empty={!debts.data?.length}>{debts.data?.filter((row) => !filters.supplierId || row.supplierId === filters.supplierId).map((row) => <tr key={row.supplierId}><td>{row.supplierName}</td><td><Money value={row.payable} /></td><td><Money value={row.returned} /></td><td><Money value={row.paid} /></td><td><Money value={row.refunded} /></td><td><Money value={row.unallocated} /></td><td><Money value={row.outstanding} /></td><td><button className="text-primary underline" onClick={() => filter("supplierId", row.supplierId)}>Xem theo phiếu</button></td></tr>)}</DataTable>}
    {supplierDebt.data && <><h3 className="font-semibold">Các phiếu của {supplierDebt.data.totals.supplierName}</h3><DataTable headings={["Phiếu", "Ngày nhập", "Phải trả", "Đã trả", "Hàng trả", "Còn nợ"]} empty={!supplierDebt.data.receipts.length}>{supplierDebt.data.receipts.map((row) => <tr key={row.receiptId}><td>{row.code}</td><td>{row.receiptDate}</td><td><Money value={row.payable} /></td><td><Money value={row.paid} /></td><td><Money value={row.returned} /></td><td><Money value={row.outstanding} /></td></tr>)}</DataTable></>}
    {editor !== undefined && <PaymentEditor key={editor?.id ?? "new"} payment={editor} suppliers={debts.data ?? []} canCreate={canCreate} initialSupplierId={filters.supplierId} onClose={() => setEditor(undefined)} onSaved={(saved) => {
      setEditor(undefined); reload(); setNotice(`Đã ghi nhận khoản ${saved.receiptCode ?? "chưa phân bổ"} cho ${saved.supplier.name}.`);
    }} />}
  </section>;
}

export function PaymentEditor({ payment, suppliers, canCreate, initialSupplierId, onClose, onSaved }: { payment: c.Payment | null; suppliers: Debts; canCreate: boolean; initialSupplierId: string; onClose(): void; onSaved(payment: c.Payment): void }) {
  const confirmation = useActionDialog();
  const [initialDraft] = useState(() => ({ supplierId: payment?.supplier.id ?? initialSupplierId, date: businessToday() }));
  const [supplierId, setSupplierId] = useState(initialDraft.supplierId), [receiptId, setReceiptId] = useState(""), [amount, setAmount] = useState("");
  const [date, setDate] = useState(initialDraft.date), [method, setMethod] = useState("Cash"), [reference, setReference] = useState("");
  const [deduplicationKey] = useState(() => crypto.randomUUID()), [review, setReview] = useState<z.infer<typeof c.paymentSearchSchema>>();
  const [confirming, setConfirming] = useState(false);
  const frozen = useRef<unknown>(undefined), mutation = useMutation();
  const debt = useRemote(useMemo(() => (signal: AbortSignal) => supplierId ? repository.read("debt", { supplierId }, c.debtSchema, signal)
    : Promise.resolve({ status: "success" as const, data: undefined as Debt | undefined }), [supplierId]));
  const canAllocate = payment?.statusId === 1801 && payment.receiptId === null && canCreate;
  const target = debt.data?.receipts.find((row) => row.receiptId === receiptId);
  const dirty = !payment && (supplierId !== initialDraft.supplierId || !!receiptId || !!amount || !!reference || date !== initialDraft.date || method !== "Cash") || canAllocate && !!receiptId;
  const close = async () => { if (!mutation.busy() && (!dirty || await confirmation.confirm("Đóng và bỏ thông tin chưa xác nhận? Nếu lần gửi trước chưa rõ kết quả, hãy đối chiếu lịch sử trước khi lập khoản mới."))) onClose(); };
  async function submit() {
    const body = canAllocate ? { receiptId } : { supplierId, receiptId, amount: Number(amount), paymentDate: date, method, referenceCode: reference || null, deduplicationKey };
    if (!mutation.uncertain) frozen.current = body;
    const saved = await mutation.run(() => repository.write(payment ? "allocate" : "record", mutation.uncertain ? frozen.current : body, c.paymentSchema, payment?.id));
    if (saved) onSaved(saved);
  }
  return <Dialog open title={payment ? "Khoản thanh toán nhà cung cấp" : "Ghi nhận thanh toán"} size="lg" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) close(); }}>
    {confirmation.dialog}
    <ErrorNotice error={mutation.error || debt.error} />
    {debt.error && <Button className="mb-3 w-auto" variant="secondary" disabled={mutation.pending || debt.loading} onClick={debt.reload}>Tải lại công nợ theo phiếu</Button>}
    {payment && <dl className="mb-5 grid gap-4 sm:grid-cols-2">{[["Nhà cung cấp", payment.supplier.name], ["Phiếu nhập", payment.receiptCode ?? "Chưa phân bổ"], ["Ngày trả", payment.paymentDate], ["Hình thức", methodLabel(payment.method)], ["Số tiền", <Money key="amount" value={payment.amount} />], ["Trạng thái", statusLabel(payment.statusId)], ["Mã tham chiếu", payment.referenceCode ?? "—"], ["Lý do hủy", payment.cancelReason ?? "—"]].map(([label, value]) => <div key={String(label)}><dt className="text-sm text-text-muted">{label}</dt><dd>{value}</dd></div>)}</dl>}
    {(!payment && canCreate || canAllocate) && <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setConfirming(true); }}>
      <fieldset disabled={mutation.pending || mutation.uncertain || confirming} className="space-y-4">
        {!payment && <Select label="Nhà cung cấp *" required value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setReceiptId(""); }}><option value="">Chọn nhà cung cấp</option>{suppliers.map((row) => <option key={row.supplierId} value={row.supplierId}>{row.supplierName}</option>)}</Select>}
        {debt.loading && supplierId ? <Skeleton /> : <Select label="Phiếu nhập hoàn thành *" required value={receiptId} onChange={(e) => setReceiptId(e.target.value)}><option value="">Chọn phiếu</option>{debt.data?.receipts.filter((row) => row.outstanding > 0).map((row) => <option key={row.receiptId} value={row.receiptId}>{row.code} · Còn nợ {new Intl.NumberFormat("vi-VN").format(row.outstanding)} đồng</option>)}</Select>}
        {target && <p className="rounded-control bg-primary-soft p-3">Còn nợ trên phiếu: <strong><Money value={target.outstanding} /></strong></p>}
        {!payment && <><Field label="Số tiền đã trả (đồng) *" type="number" min="1000" max={target?.outstanding} step="1000" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Field label="Ngày trả *" type="date" max={businessToday()} required value={date} onChange={(e) => setDate(e.target.value)} /><Select label="Hình thức *" value={method} onChange={(e) => setMethod(e.target.value)}><MethodOptions /></Select>
          <Field label="Mã tham chiếu" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} /></>}
      </fieldset>
      {mutation.blocked && <div className="rounded-control border border-border p-4"><p>Chưa gửi lại khoản tiền. Hãy đối chiếu lịch sử nhà cung cấp.</p><Button className="mt-3 w-auto" variant="secondary" disabled={mutation.pending} onClick={async () => { const result = await mutation.run(() => repository.read("list", { supplierId, page: "1", pageSize: "100" }, c.paymentSearchSchema), true); if (result) setReview(result); }}>Tải lịch sử để đối chiếu</Button>
        {review && <><DataTable headings={["Ngày", "Phiếu", "Số tiền", "Mã tham chiếu", "Trạng thái"]} empty={!review.page.items.length}>{review.page.items.map((row) => <tr key={row.id}><td>{row.paymentDate}</td><td>{row.receiptCode ?? "Chưa phân bổ"}</td><td><Money value={row.amount} /></td><td>{row.referenceCode ?? "—"}</td><td>{statusLabel(row.statusId)}</td></tr>)}</DataTable><p className="text-sm">Hiển thị {review.page.items.length}/{review.page.total} khoản mới nhất. Có thể mở danh sách ở tab khác để xem toàn bộ.</p>
          {!payment && <Button className="mt-3 w-auto" variant="secondary" onClick={() => mutation.reviewed()}>Đã đối chiếu, cho phép xác nhận lại khoản đang nhập</Button>}
          <a className="mt-3 block text-primary underline" target="_blank" rel="noreferrer" href="/operations/supplier-payments">Mở danh sách thanh toán</a></>}
      </div>}
      {confirming ? <section aria-label="Xác nhận thanh toán" className="space-y-3 rounded-control border border-primary bg-primary-soft p-4"><h3 className="font-semibold">Đối chiếu trước khi ghi nhận</h3>
        <p>{payment?.supplier.name ?? suppliers.find((row) => row.supplierId === supplierId)?.supplierName} · Phiếu {target?.code ?? "—"}</p>
        <p>Số tiền: <strong><Money value={payment?.amount ?? Number(amount)} /></strong></p>
        {!payment && <p>Ngày {date} · {methodLabel(method)} · Tham chiếu {reference || "không có"}</p>}
        <div className="flex flex-wrap gap-2"><Button className="w-auto" isPending={mutation.pending} disabled={mutation.blocked} onClick={() => { setConfirming(false); void submit(); }}>Đồng ý ghi nhận</Button><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => setConfirming(false)}>Quay lại chỉnh sửa</Button></div>
      </section> : <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked || !receiptId}>{payment ? "Phân bổ vào phiếu" : "Xác nhận ghi nhận thanh toán"}</Button>}
    </form>}
    <Button className="mt-5 w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Đóng</Button>
  </Dialog>;
}

"use client";
import { SelectBox } from "@/components/ui/select-box";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { ListStateMessage, ManagementPagination, Subtabs, managementStyles } from "@/components/ui/management-screen/management-table";
import { toQueryDate } from "@/components/ui/management-screen/time-range-model";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { DataTable, ErrorNotice, Money, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { fmt, viDate, viDateTime } from "@/features/purchase-documents/document-parts";
import { DISCONTINUED, genderLabel, kindLabel, methodLabel, typeLabel, type CustomerDetail, type DebtEntry } from "./contracts";
import { invoiceHref } from "./customer-links";
import { CustomerMergeDialog } from "./customer-merge-dialog";
import { AdjustmentDialog, CustomerPaymentDialog, CustomerPaymentView } from "./customer-payment-dialogs";
import { CustomerQrDialog } from "./customer-qr-dialog";
import { customerError, customerRepository, errorText } from "./repository";
import styles from "./customers.module.css";
import listStyles from "@/features/suppliers-api/suppliers.module.css";

export type CustomerAccess = { edit: boolean; remove: boolean; history: boolean; requests: boolean; debt: boolean; pay: boolean; adjust: boolean; confirm: boolean; exportDebt: boolean };
type Tab = "info" | "sales" | "requests" | "debt";
const invoiceStatus: Record<number, string> = { 3501: "Hoàn thành", 3502: "Đã hủy" };
const requestStatus: Record<number, string> = { 3201: "Chờ phản hồi", 3202: "Đã chấp nhận", 3203: "Đã từ chối", 3204: "Đã hủy", 3205: "Hoàn thành" };
const signed = (value: number) => value < 0 ? `-${fmt(-value)}` : fmt(value);

export function CustomerDetailPanel({ id, access, onEdit, onChanged, onRemoved }: { id: string; access: CustomerAccess; onEdit(record: CustomerDetail): void; onChanged(): void; onRemoved(): void }) {
  const [tab, setTab] = useState<Tab>("info");
  const tabs = useMemo(() => [{ key: "info" as const, label: "Thông tin" }, ...(access.history ? [{ key: "sales" as const, label: "Lịch sử bán" }] : []),
    ...(access.requests ? [{ key: "requests" as const, label: "Yêu cầu mua" }] : []), ...(access.debt ? [{ key: "debt" as const, label: "Nợ cần thu" }] : [])], [access.history, access.requests, access.debt]);
  return <section className={listStyles.detail} aria-label="Chi tiết khách hàng">
    <Subtabs<Tab> label="Nội dung khách hàng" tabs={tabs} value={tab} onChange={setTab} />
    {tab === "info" && <InfoTab id={id} access={access} onEdit={onEdit} onChanged={onChanged} onRemoved={onRemoved} />}
    {tab === "sales" && <SalesTab id={id} withCuts={access.debt} />}
    {tab === "requests" && <RequestsTab id={id} />}
    {tab === "debt" && <DebtTab id={id} access={access} onChanged={onChanged} />}
  </section>;
}

function InfoTab({ id, access, onEdit, onChanged, onRemoved }: { id: string; access: CustomerAccess; onEdit(record: CustomerDetail): void; onChanged(): void; onRemoved(): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => customerRepository.detail(id, signal), [id]));
  const confirmation = useActionDialog(), { notify } = useToast(), [error, setError] = useState<string>(), [pending, setPending] = useState(false), [merging, setMerging] = useState(false);
  const record = remote.data;
  if (remote.loading) return <Skeleton />;
  if (remote.error || !record) return <ListStateMessage error={remote.error ?? "Không tải được hồ sơ."} onRetry={remote.reload} retryLabel="Tải lại hồ sơ" />;
  const discontinued = record.statusId === DISCONTINUED;
  async function toggle() {
    const action = discontinued ? "resume" : "discontinue";
    if (pending || !(await confirmation.confirm(discontinued ? `Sử dụng lại ${record!.name}?` : `Ngừng hoạt động ${record!.name}? Hóa đơn và phiếu đã có không thay đổi; hồ sơ không còn được chọn khi lập hóa đơn mới.`))) return;
    setPending(true); setError(undefined);
    const result = await customerRepository.setStatus(action, id);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: discontinued ? `Đã sử dụng lại ${record!.code}.` : `Đã ngừng hoạt động ${record!.code}.` }); remote.reload(); onChanged(); } else setError(errorText(result));
  }
  async function remove() {
    if (pending || !(await confirmation.confirm(`Xóa ${record!.name} (${record!.code})? Thao tác này không thể hoàn tác.`))) return;
    setPending(true); setError(undefined);
    const result = await customerRepository.remove(id);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã xóa khách hàng ${record!.code}.` }); onRemoved(); return; }
    const used = result.problem?.references?.map((item) => `${item.name}: ${item.count}`).join(", ");
    setError(result.problem?.canDiscontinue ? `${record!.name} đã có dữ liệu liên quan${used ? ` (${used})` : ""} nên không xóa được. Hãy dùng Ngừng hoạt động.` : customerError(result));
  }
  const facts: [string, string | null | undefined][] = [["Mã khách hàng", record.code], ["Loại khách", typeLabel(record.customerType)], ["Giới tính", genderLabel(record.gender)], ["Sinh nhật", record.birthDate ? viDate(record.birthDate) : null],
    ["Điện thoại 1", record.phoneNumber], ["Điện thoại 2", record.phoneNumber2], ["Email", record.email], ["Facebook", record.facebook], ["Địa chỉ", record.address], ["Tỉnh/thành", record.province], ["Phường/xã", record.ward],
    ["Tên đơn vị", record.companyName], ["Mã số thuế", record.taxCode], ["Số CCCD", record.identityNumber], ["Ngân hàng", record.bankName], ["Số tài khoản", record.bankAccountNumber],
    ...(access.debt ? [["Nợ hiện tại", record.currentDebt == null ? null : signed(record.currentDebt)] as [string, string | null]] : []),
    ["Người tạo", record.createdBy], ["Ngày tạo", viDateTime(record.createdAt)], ["Ghi chú", record.note]];
  const initials = record.name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
  return <div className={listStyles.tabBody}>{confirmation.dialog}
    <header className={styles.infoHead}>
      <span className={`${styles.photo} ${styles.infoPhoto}`}>{record.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- address signed by the storage and valid for a short time, not for the image optimiser of Next
        <img src={record.photoUrl} alt={`Ảnh ${record.name}`} referrerPolicy="no-referrer" />
      ) : initials}</span>
      <h3>{record.name}</h3><StatusPill tone={discontinued ? "neutral" : "success"}>{discontinued ? "Ngừng hoạt động" : "Đang hoạt động"}</StatusPill>
      {record.traderAccount && <span className={`${styles.badge} ${styles.badgeWarn}`} title={`Tài khoản ${record.traderAccount.username ?? record.traderAccount.displayName}`}>Tài khoản thương lái</span>}
    </header>
    <dl className={listStyles.facts}>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>
    <ErrorNotice error={error} />
    {access.edit || access.remove ? <footer className={listStyles.tabFooter}>
      <div>
        {access.remove && !record.isUsed && <Button className="w-auto" variant="ghost" isPending={pending} onClick={() => void remove()}><InterfaceIcon name="trash" className="size-4" />Xóa</Button>}
        {access.edit && !discontinued && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => setMerging(true)}><InterfaceIcon name="users" className="size-4" />Gộp hồ sơ</Button>}
      </div>
      {access.edit && <div>
        {!discontinued && <Button className="w-auto" onClick={() => onEdit(record)}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>}
        <Button className="w-auto" variant="secondary" isPending={pending} onClick={() => void toggle()}><InterfaceIcon name="lock" className="size-4" />{discontinued ? "Sử dụng lại" : "Ngừng hoạt động"}</Button>
      </div>}
    </footer> : null}
    {merging && <CustomerMergeDialog kept={record} onClose={() => setMerging(false)} onMerged={() => { setMerging(false); remote.reload(); onChanged(); }} />}
  </div>;
}

/** The five years the sales list can cover in one request. */
function fiveYears() { const to = new Date(), from = new Date(to); from.setFullYear(to.getFullYear() - 5); return { from: toQueryDate(from), to: toQueryDate(to) }; }

function SalesTab({ id, withCuts }: { id: string; withCuts: boolean }) {
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), period = useMemo(() => fiveYears(), []);
  const remote = useRemote(useCallback((signal: AbortSignal) => customerRepository.invoices({ customerId: id, ...period, page, pageSize }, signal), [id, period, page, pageSize]));
  const cuts = useRemote(useCallback((signal: AbortSignal) => withCuts ? customerRepository.debt(id, { kinds: ["PriceCut"], page: 1, pageSize: 50 }, signal) : Promise.resolve({ status: "success" as const, data: undefined }), [id, withCuts]));
  const items = remote.data?.page.items ?? [];
  return <div className={listStyles.tabBody}>
    {remote.loading ? <Skeleton /> : remote.error ? <ListStateMessage error={remote.error} onRetry={remote.reload} /> : remote.data && <>
      <DataTable responsive headings={["Mã hóa đơn", "Thời gian", "Giá trị", "Còn phải thu", "Trạng thái"]} empty={!items.length}>{items.map((row) => <tr key={row.id}>
        <td data-label="Mã hóa đơn"><Link className={styles.link} href={invoiceHref(row.code)}>{row.code}</Link></td><td data-label="Thời gian">{viDateTime(row.invoicedAt)}</td><td data-label="Giá trị"><Money value={row.total} /></td>
        <td data-label="Còn phải thu"><Money value={row.unpaidAmount} /></td><td data-label="Trạng thái">{invoiceStatus[row.statusId] ?? row.status}</td></tr>)}</DataTable>
      <ManagementPagination page={remote.data.page.page} pageSize={remote.data.page.pageSize} total={remote.data.page.total} unit="hóa đơn" onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} /></>}
    {withCuts && cuts.data && cuts.data.entries.items.length > 0 && <>
      <h4 className="mt-4 text-sm font-semibold">Giảm giá sau bán</h4>
      <DataTable responsive headings={["Hóa đơn", "Thời gian", "Giá trị giảm", "Lý do"]}>{cuts.data.entries.items.map((entry) => <tr key={`${entry.id}:${entry.date}`}>
        <td data-label="Hóa đơn"><Link className={styles.link} href={invoiceHref(entry.invoiceCode ?? entry.code)}>{entry.invoiceCode ?? entry.code}</Link></td><td data-label="Thời gian">{entry.at ? viDateTime(entry.at) : viDate(entry.date)}</td>
        <td data-label="Giá trị giảm"><Money value={entry.amount} /></td><td data-label="Lý do">{entry.note ?? "—"}</td></tr>)}</DataTable></>}
  </div>;
}

function RequestsTab({ id }: { id: string }) {
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15);
  const remote = useRemote(useCallback((signal: AbortSignal) => customerRepository.requests(id, page, pageSize, signal), [id, page, pageSize]));
  return <div className={listStyles.tabBody}>
    {remote.loading ? <Skeleton /> : remote.error ? <ListStateMessage error={remote.error} onRetry={remote.reload} /> : remote.data && <>
      <DataTable responsive headings={["Gửi lúc", "Sản phẩm", "Số lượng (kg)", "Ngày lấy", "Trạng thái", "Mã DH", ""]} empty={!remote.data.items.length}>{remote.data.items.map((row) => <tr key={row.id}>
        <td data-label="Gửi lúc">{viDateTime(row.sentAt)}</td><td data-label="Sản phẩm">{row.productName}</td><td data-label="Số lượng (kg)">{fmt(row.requestedKg)}</td><td data-label="Ngày lấy">{viDate(row.pickupDate)}</td>
        <td data-label="Trạng thái">{requestStatus[row.statusId] ?? row.status}</td>
        <td data-label="Mã DH">{row.salesOrderCode ? <Link className={styles.link} href={`/sales/orders?code=${encodeURIComponent(row.salesOrderCode)}`}>{row.salesOrderCode}</Link> : "—"}</td><td><Link className={styles.link} href={`/operations/purchase-requests/${row.id}`}>Mở</Link></td></tr>)}</DataTable>
      <ManagementPagination page={remote.data.page} pageSize={remote.data.pageSize} total={remote.data.total} unit="yêu cầu" onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} /></>}
  </div>;
}

type Dialog = { kind: "pay" | "discount" | "adjust" | "qr" } | { kind: "payment"; id: string } | { kind: "reprint"; id: string };
const filterKinds = ["Invoice", "PriceCut", "Payment", "Discount", "PaidBack", "Adjustment"] as const;

function DebtTab({ id, access, onChanged }: { id: string; access: CustomerAccess; onChanged(): void }) {
  const [kind, setKind] = useState(""), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [dialog, setDialog] = useState<Dialog>();
  const remote = useRemote(useCallback((signal: AbortSignal) => customerRepository.debt(id, { kinds: kind ? [kind] : [], page, pageSize }, signal), [id, kind, page, pageSize]));
  const exportFile = useMutation(), confirmation = useActionDialog(), { notify } = useToast(), [error, setError] = useState<string>(), [busyId, setBusyId] = useState<string>();
  const done = () => { setDialog(undefined); remote.reload(); onChanged(); };

  async function run(entry: DebtEntry, action: () => Promise<{ status: "success" } | { status: "error" }>, title: string, fail: () => string | undefined) {
    setBusyId(entry.id); setError(undefined);
    const result = await action();
    setBusyId(undefined);
    if (result.status === "success") { notify({ tone: "success", title }); remote.reload(); onChanged(); } else setError(fail());
  }
  async function cancelEntry(entry: DebtEntry) {
    const adjustment = entry.kind === "Adjustment";
    const reason = await confirmation.prompt(adjustment ? `Hủy phiếu điều chỉnh ${entry.code}? Công nợ sẽ được tính lại.` : `Hủy phiếu thu ${entry.code}?${entry.pending ? "" : " Công nợ sẽ được tính lại."}`);
    if (!reason) return;
    if (adjustment) { const result = await customerRepository.cancelAdjustment(entry.id, reason); return run(entry, async () => result, `Đã hủy phiếu điều chỉnh ${entry.code}.`, () => errorText(result)); }
    // A payment is cancelled with the version it was read in: read it again so that the cancel is of the payment as it is now.
    const current = await customerRepository.payment(entry.id);
    if (current.status !== "success") { setError(errorText(current)); return; }
    const result = await customerRepository.cancelPayment(entry.id, reason, current.data.rowVersion);
    return run(entry, async () => result, `Đã hủy phiếu thu ${entry.code}.`, () => errorText(result));
  }
  const confirmEntry = async (entry: DebtEntry) => { const result = await customerRepository.confirmPayment(entry.id); return run(entry, async () => result, `Đã xác nhận phiếu thu ${entry.code}.`, () => errorText(result)); };

  const data = remote.data;
  const codeCell = (entry: DebtEntry) => {
    if (entry.kind === "Invoice" || entry.kind === "PriceCut" || entry.kind === "Return") return <Link className={styles.link} href={invoiceHref(entry.invoiceCode ?? entry.code)}>{entry.invoiceCode ?? entry.code}</Link>;
    if (entry.kind === "Adjustment") return entry.code;
    return <button type="button" className={managementStyles.linkButton} onClick={() => setDialog({ kind: "payment", id: entry.id })}>{entry.code}</button>;
  };
  return <div className={listStyles.tabBody}>{confirmation.dialog}
    {remote.loading ? <Skeleton /> : remote.error || !data ? <ListStateMessage error={remote.error ?? "Không tải được công nợ."} onRetry={remote.reload} /> : <>
      <div className={styles.debtTop}>
        <p>{data.debt < 0 ? "Hợp tác xã còn nợ khách" : "Nợ hiện tại"} <strong className={data.debt < 0 ? styles.neg : undefined}>{fmt(Math.abs(data.debt))}</strong>{data.debtAgeDays != null && data.debt > 0 && <span className={styles.muted}> · nợ {data.debtAgeDays} ngày</span>}
          {data.awaitingConfirmationCount > 0 && <span className={`${styles.badge} ${styles.badgeWarn}`}>{data.awaitingConfirmationCount} chờ xác nhận</span>}
          {data.pendingTransferCount > 0 && <span className={`${styles.badge} ${styles.badgeWarn}`}>{data.pendingTransferCount} chờ chuyển khoản</span>}</p>
        <label>Loại giao dịch<SelectBox aria-label="Loại giao dịch" className="h-8 rounded-control border border-border-strong px-2 text-sm" value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}>
          <option value="">Tất cả giao dịch</option>{filterKinds.map((key) => <option key={key} value={key}>{kindLabel[key]}</option>)}</SelectBox></label>
      </div>
      {!!data.reservedAdvances?.length && <p className={styles.muted}>{data.reservedAdvances.map((reserved, index) => <span key={reserved.salesOrderId}>{index > 0 && " · "}Tiền ứng của <Link className={styles.link} href={`/sales/orders?code=${encodeURIComponent(reserved.salesOrderCode)}`}>{reserved.salesOrderCode}</Link>: {fmt(reserved.amount)}</span>)} (giữ riêng cho đơn, chỉ trừ vào hóa đơn của đơn đó)</p>}
      <div className={styles.entryScroll}><table className={styles.entryTable}><thead><tr><th>Mã phiếu</th><th>Thời gian</th><th>Loại</th><th className={styles.num}>Giá trị</th><th className={styles.num}>Nợ cần thu</th><th>Trạng thái</th><th /></tr></thead>
        <tbody>{data.entries.items.map((entry, index) => {
          const payment = entry.kind === "Payment" || entry.kind === "PaidBack" || entry.kind === "Discount";
          return <tr key={`${entry.kind}:${entry.id}:${index}`} className={entry.cancelled ? styles.entryCancelled : undefined}>
            <td>{codeCell(entry)}</td><td>{entry.at ? viDateTime(entry.at) : viDate(entry.date)}</td>
            <td>{kindLabel[entry.kind]}{entry.method && payment && entry.kind !== "Discount" ? <small className={styles.muted}> · {methodLabel(entry.method)}</small> : null}</td>
            <td className={styles.num}>{fmt(entry.amount)}</td><td className={styles.num}>{signed(entry.debtAfter)}</td>
            <td>{entry.cancelled ? <span className={`${styles.state} ${styles.stateOff}`}>Đã hủy</span> : entry.pending ? <span className={`${styles.state} ${styles.stateWait}`}>Chờ chuyển khoản</span>
              : entry.reservedForOrder && entry.salesOrderCode ? <span className={`${styles.state} ${styles.stateWait}`}>Giữ riêng cho {entry.salesOrderCode}</span> : entry.awaitingConfirmation ? <span className={`${styles.state} ${styles.stateWait}`}>Chờ xác nhận</span> : entry.note ? <span className={styles.muted} title={entry.note}>{entry.note.length > 40 ? `${entry.note.slice(0, 40)}…` : entry.note}</span> : null}</td>
            <td><div className={styles.rowActions}>
              {entry.awaitingConfirmation && !entry.cancelled && access.confirm && <button type="button" disabled={busyId === entry.id} onClick={() => void confirmEntry(entry)}>Xác nhận</button>}
              {entry.pending && !entry.cancelled && access.pay && <button type="button" disabled={busyId === entry.id} onClick={() => setDialog({ kind: "reprint", id: entry.id })}>In lại QR</button>}
              {!entry.cancelled && access.confirm && (entry.pending || entry.awaitingConfirmation || entry.kind === "Adjustment") && <button type="button" disabled={busyId === entry.id} onClick={() => void cancelEntry(entry)}>Hủy</button>}
            </div></td></tr>;
        })}{!data.entries.items.length && <tr><td colSpan={7} className={styles.muted}>Chưa có giao dịch nào{kind ? " thuộc loại này" : ""}.</td></tr>}</tbody></table></div>
      <ManagementPagination page={data.entries.page} pageSize={data.entries.pageSize} total={data.entries.total} unit="giao dịch" onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
      <ErrorNotice error={error ?? exportFile.error} />
      <footer className={listStyles.tabFooter}>
        <div>{access.exportDebt && <Button className="w-auto" variant="ghost" isPending={exportFile.pending} onClick={() => void exportFile.run(() => customerRepository.exportDebt(id), true)}><InterfaceIcon name="download" className="size-4" />Xuất file công nợ</Button>}</div>
        <div>
          {access.pay && <Button className="w-auto" onClick={() => setDialog({ kind: "pay" })}><InterfaceIcon name="payment" className="size-4" />Thanh toán</Button>}
          {access.adjust && <Button className="w-auto" variant="secondary" onClick={() => setDialog({ kind: "adjust" })}>Điều chỉnh</Button>}
          {access.pay && <Button className="w-auto" variant="secondary" onClick={() => setDialog({ kind: "discount" })}>Chiết khấu thanh toán</Button>}
          {access.pay && <Button className="w-auto" variant="secondary" onClick={() => setDialog({ kind: "qr" })}>Tạo QR</Button>}
        </div>
      </footer></>}
    {dialog?.kind === "pay" && <CustomerPaymentDialog customerId={id} mode="payment" onClose={() => setDialog(undefined)} onSaved={done} />}
    {dialog?.kind === "discount" && <CustomerPaymentDialog customerId={id} mode="discount" onClose={() => setDialog(undefined)} onSaved={done} />}
    {dialog?.kind === "adjust" && <AdjustmentDialog customerId={id} onClose={() => setDialog(undefined)} onSaved={done} />}
    {dialog?.kind === "qr" && <CustomerQrDialog customerId={id} onClose={(changed) => { if (changed) done(); else setDialog(undefined); }} />}
    {dialog?.kind === "reprint" && <CustomerQrDialog reprintId={dialog.id} onClose={() => setDialog(undefined)} />}
    {dialog?.kind === "payment" && <CustomerPaymentView id={dialog.id} canConfirm={access.confirm} canCancel={access.confirm} onClose={(changed) => { if (changed) done(); else setDialog(undefined); }} />}
  </div>;
}

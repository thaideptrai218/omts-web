"use client";
import { useToast } from "@/components/ui/toast-provider";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, ManagementPagination, Subtabs, managementStyles } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import { debtStatement } from "@/features/debts-api/contracts";
import { downloadDebt, readDebt } from "@/features/debts-api/repository";
import { DataTable, ErrorNotice, Money, Select, Skeleton, businessToday, useMutation, useRemote } from "@/features/operations/ui";
import { ReceiptViewDialog, ReturnViewDialog } from "@/features/purchase-documents/document-dialogs";
import { PaymentCreateDialog, PaymentVoucherDialog } from "@/features/purchase-documents/payment-dialogs";
import { SupplierDocumentsDialog } from "@/features/supplier-api/documents-dialog";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { DISCONTINUED, typeLabel, type SupplierDetail as Detail } from "./contracts";
import { supplierRepository } from "./repository";
import styles from "./suppliers.module.css";

export type SupplierAccess = { edit: boolean; history: boolean; debt: boolean; pay: boolean; exportDebt: boolean };
type Tab = "info" | "history" | "debt";
const dateTime = (value: string) => { const d = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value)), part = (type: string) => d.find((x) => x.type === type)?.value ?? ""; return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`; };
const receiptStatus: Record<number, string> = { 1701: "Nháp", 1702: "Hoàn thành", 1703: "Đã hủy", 1901: "Đã ghi nhận", 1902: "Đã hủy" };
const kinds = { Receipt: "Nhập hàng", Return: "Trả hàng nhập", ReturnRefund: "Hoàn tiền trả hàng", Payment: "Thanh toán", PaidBack: "Nhà cung cấp trả lại tiền" } as const;

export function SupplierDetailPanel({ id, access, onEdit, onChanged }: { id: string; access: SupplierAccess; onEdit(record: Detail): void; onChanged(): void }) {
  const [tab, setTab] = useState<Tab>("info");
  const tabs = useMemo(() => [{ key: "info" as const, label: "Thông tin" }, ...(access.history ? [{ key: "history" as const, label: "Lịch sử nhập/trả hàng" }] : []), ...(access.debt ? [{ key: "debt" as const, label: "Nợ cần trả nhà cung cấp" }] : [])], [access.history, access.debt]);
  return <section className={styles.detail} aria-label="Chi tiết nhà cung cấp">
    <Subtabs<Tab> label="Nội dung nhà cung cấp" tabs={tabs} value={tab} onChange={setTab} />
    {tab === "info" && <InfoTab id={id} canEdit={access.edit} onEdit={onEdit} onChanged={onChanged} />}
    {tab === "history" && <HistoryTab id={id} />}
    {tab === "debt" && <DebtTab id={id} access={access} onChanged={onChanged} />}
  </section>;
}

function InfoTab({ id, canEdit, onEdit, onChanged }: { id: string; canEdit: boolean; onEdit(record: Detail): void; onChanged(): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => supplierRepository.detail(id, signal), [id]));
  const confirmation = useActionDialog(), { notify } = useToast(), [error, setError] = useState<string>(), [pending, setPending] = useState(false), [documents, setDocuments] = useState(false);
  const record = remote.data;
  if (remote.loading) return <Skeleton />;
  if (remote.error || !record) return <ListStateMessage error={remote.error ?? "Không tải được hồ sơ."} onRetry={remote.reload} retryLabel="Tải lại hồ sơ" />;
  const discontinued = record.statusId === DISCONTINUED;
  async function toggle() {
    const action = discontinued ? "reactivate" : "discontinue";
    if (pending || !(await confirmation.confirm(discontinued ? `Sử dụng lại ${record!.name}?` : `Ngừng hoạt động ${record!.name}? Phiếu đã có không thay đổi.`))) return;
    setPending(true); setError(undefined);
    const result = await supplierRepository.setStatus(action, id);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: discontinued ? `Đã sử dụng lại ${record!.name}.` : `Đã ngừng hoạt động ${record!.name}.` }); remote.reload(); onChanged(); } else setError(workspaceError(result));
  }
  const facts: [string, string | null][] = [["Mã nhà cung cấp", record.code], ["Người tạo", record.createdBy], ["Ngày tạo", dateTime(record.createdAt)], ["Nhóm", typeLabel(record.supplierType)], ["Điện thoại", record.phoneNumber], ["Email", record.email],
    ["Địa chỉ", record.address], ["Tỉnh/thành", record.province], ["Phường/xã", record.ward], ["Tên công ty", record.companyName], ["Mã số thuế", record.taxCode], ["Số CCCD", record.identityNumber], ["Ghi chú", record.note]];
  return <div className={styles.tabBody}>{confirmation.dialog}
    <header className={styles.infoHead}><h3>{record.name}</h3><StatusPill tone={discontinued ? "neutral" : "success"}>{discontinued ? "Ngừng dùng" : "Đang dùng"}</StatusPill></header>
    <dl className={styles.facts}>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}<div><dt>Chứng nhận</dt><dd><button type="button" className={managementStyles.linkButton} onClick={() => setDocuments(true)}>{record.certificates.length} chứng nhận</button></dd></div></dl>
    <ErrorNotice error={error} />
    {canEdit && <footer className={styles.tabFooter}>
      <div>
        {!discontinued && <Button className="w-auto" onClick={() => onEdit(record)}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>}
        <Button className="w-auto" variant="secondary" isPending={pending} onClick={() => void toggle()}><InterfaceIcon name="lock" className="size-4" />{discontinued ? "Sử dụng lại" : "Ngừng hoạt động"}</Button>
      </div>
    </footer>}
    {documents && <SupplierDocumentsDialog id={id} canEdit={canEdit} onClose={(saved) => { setDocuments(false); if (saved) remote.reload(); }} />}
  </div>;
}

type Opened = { kind: "Receipt" | "Return" | "Payment"; id: string };
/** The document behind a history or statement row, opened in a dialog with a link back to its own list. */
function OpenedDocument({ opened, onClose }: { opened?: Opened; onClose(changed?: boolean): void }) {
  if (!opened) return null;
  if (opened.kind === "Receipt") return <ReceiptViewDialog id={opened.id} onClose={() => onClose()} />;
  if (opened.kind === "Return") return <ReturnViewDialog id={opened.id} onClose={() => onClose()} />;
  return <PaymentVoucherDialog id={opened.id} onClose={onClose} />;
}

function HistoryTab({ id }: { id: string }) {
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [opened, setOpened] = useState<Opened>();
  const remote = useRemote(useCallback((signal: AbortSignal) => supplierRepository.history(id, page, pageSize, signal), [id, page, pageSize]));
  return <div className={styles.tabBody}>
    {remote.loading ? <Skeleton /> : remote.error ? <ListStateMessage error={remote.error} onRetry={remote.reload} /> : remote.data && <>
      <DataTable responsive headings={["Mã phiếu", "Thời gian", "Người tạo", "Tổng cộng", "Trạng thái"]} empty={!remote.data.items.length}>{remote.data.items.map((row) => <tr key={`${row.kind}:${row.id}`}>
        <td data-label="Mã phiếu"><button type="button" className={managementStyles.linkButton} onClick={() => setOpened(row.kind === "Return" ? { kind: "Return", id: row.id } : { kind: "Receipt", id: row.receiptId ?? row.id })}>{row.code}</button>{row.kind === "Return" && <small className={styles.muted}> Trả hàng</small>}</td>
        <td data-label="Thời gian">{formatVietnameseDate(row.date)}</td><td data-label="Người tạo">{row.createdBy ?? "—"}</td><td data-label="Tổng cộng"><Money value={row.total} /></td><td data-label="Trạng thái">{receiptStatus[row.statusId] ?? row.status}</td></tr>)}</DataTable>
      <ManagementPagination page={remote.data.page} pageSize={remote.data.pageSize} total={remote.data.total} unit="phiếu" onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} /></>}
    <OpenedDocument opened={opened} onClose={() => setOpened(undefined)} />
  </div>;
}

/** The statement covers the longest period the debt API allows, so that older entries stay visible here. */
function DebtTab({ id, access, onChanged }: { id: string; access: SupplierAccess; onChanged(): void }) {
  const period = useMemo(() => { const to = businessToday(); return { from: `${Number(to.slice(0, 4)) - 5}${to.slice(4)}`, to }; }, []);
  const remote = useRemote(useCallback((signal: AbortSignal) => readDebt({ action: "statement", supplierId: id, ...period }, debtStatement, signal), [id, period]));
  const [kind, setKind] = useState(""), [page, setPage] = useState(1), [pay, setPay] = useState(false), [opened, setOpened] = useState<Opened>();
  const exportFile = useMutation();
  const entries = useMemo(() => [...(remote.data?.entries ?? [])].reverse().filter((entry) => !kind || entry.kind === kind), [remote.data, kind]);
  const shown = entries.slice((page - 1) * 15, page * 15);
  const open = (entry: (typeof entries)[number]) => setOpened({ kind: entry.kind === "Receipt" ? "Receipt" : entry.kind === "Return" ? "Return" : "Payment", id: entry.id });
  const canOpen = (entry: (typeof entries)[number]) => entry.kind === "Receipt" || entry.kind === "Return" ? access.history : entry.kind === "Payment" || entry.kind === "PaidBack";
  return <div className={styles.tabBody}>
    {remote.loading ? <Skeleton /> : remote.error ? <ListStateMessage error={remote.error} onRetry={remote.reload} /> : remote.data && <>
      <div className={styles.debtHead}><p>Nợ hiện tại <strong><Money value={remote.data.debtToday} /></strong></p><Select label="Loại giao dịch" value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}><option value="">Tất cả</option>{Object.entries(kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></div>
      <DataTable responsive headings={["Mã phiếu", "Thời gian", "Loại", "Giá trị", "Nợ cần trả"]} empty={!shown.length}>{shown.map((entry, index) => <tr key={`${entry.kind}:${entry.id}:${index}`}>
        <td data-label="Mã phiếu">{canOpen(entry) ? <button type="button" className={managementStyles.linkButton} onClick={() => open(entry)}>{entry.code}</button> : entry.code}</td>
        <td data-label="Thời gian">{formatVietnameseDate(entry.date)}</td><td data-label="Loại">{kinds[entry.kind]}</td><td data-label="Giá trị"><Money value={entry.amount} /></td><td data-label="Nợ cần trả"><Money value={entry.debtAfter} /></td></tr>)}</DataTable>
      {entries.length > 15 && <ManagementPagination page={page} pageSize={15} pageSizes={[15]} total={entries.length} unit="giao dịch" onPage={setPage} onPageSize={() => undefined} />}
      <ErrorNotice error={exportFile.error} />
      <footer className={styles.tabFooter}>
        {access.exportDebt && <div><Button className="w-auto" variant="ghost" isPending={exportFile.pending} onClick={() => void exportFile.run(() => downloadDebt({ supplierId: id, ...period }), true)}><InterfaceIcon name="download" className="size-4" />Xuất file công nợ</Button></div>}
        {access.pay && <div><Button className="w-auto" onClick={() => setPay(true)}><InterfaceIcon name="payment" className="size-4" />Thanh toán</Button></div>}
      </footer></>}
    {pay && <PaymentCreateDialog supplierId={id} onClose={() => setPay(false)} onSaved={() => { setPay(false); remote.reload(); onChanged(); }} />}
    <OpenedDocument opened={opened} onClose={(changed) => { setOpened(undefined); if (changed) { remote.reload(); onChanged(); } }} />
  </div>;
}

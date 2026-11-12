"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, Subtabs } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { InvoiceCancelDialog } from "./invoice-cancel-dialog";
import { InvoiceCorrectionDialog } from "./invoice-correction-dialog";
import { InvoiceInfoTab } from "./invoice-info-tab";
import { InvoiceHistoryTab, InvoicePaymentsTab, InvoiceSendingTab } from "./invoice-payments-sending-tabs";
import { invoiceDetail, type InvoiceAction, type InvoiceDetail } from "./invoice-list-contracts";
import { allowedSet } from "./invoice-labels";
import { INVOICE } from "./invoice-status";
import { useInvoiceActions } from "./use-invoice-actions";
import { invoiceRepository } from "./use-invoice-list";

type Tab = "info" | "payments" | "sending" | "history";
type Props = { id: string; canExport: boolean; onChanged(): void };
const tabs = [{ key: "info" as const, label: "Thông tin" }, { key: "payments" as const, label: "Lịch sử thanh toán" }, { key: "sending" as const, label: "Gửi hóa đơn" }, { key: "history" as const, label: "Lịch sử chỉnh sửa" }];

/** The row opened under the list, laid out like the purchase receipt row: tabs, then the invoice with its lines and money, then the buttons the API allows on this invoice now. */
export function InvoiceDetailPanel({ id, canExport, onChanged }: Props) {
  const remote = useRemote(useCallback((signal: AbortSignal) => invoiceRepository.read("detail", { id }, invoiceDetail, signal), [id]));
  const [tab, setTab] = useState<Tab>("info"), [fresh, setFresh] = useState<InvoiceDetail>();
  const invoice = fresh ?? remote.data;
  const apply = useCallback((next: InvoiceDetail) => { setFresh(next); onChanged(); }, [onChanged]);
  if (remote.loading && !invoice) return <div className={listStyles.detail}><Skeleton /></div>;
  if (remote.error || !invoice) return <ListStateMessage error={remote.error ?? "Chưa tải được chi tiết hóa đơn."} onRetry={remote.reload} retryLabel="Tải lại chi tiết" />;
  const reload = () => { setFresh(undefined); remote.reload(); onChanged(); };
  return <section className={listStyles.detail} aria-label={`Chi tiết ${invoice.code}`}>
    <Subtabs<Tab> label={`Hóa đơn ${invoice.code}`} tabs={tabs} value={tab} onChange={setTab} />
    <Body key={invoice.rowVersion} invoice={invoice} tab={tab} canExport={canExport} onChanged={apply} onReload={reload} />
  </section>;
}

function Body({ invoice, tab, canExport, onChanged, onReload }: { invoice: InvoiceDetail; tab: Tab; canExport: boolean; onChanged(invoice: InvoiceDetail): void; onReload(): void }) {
  return <div className={listStyles.tabBody}>
    {tab === "info" && <InvoiceInfoTab invoice={invoice} />}
    {tab === "payments" && <InvoicePaymentsTab invoice={invoice} />}
    {tab === "sending" && <InvoiceSendingTab invoice={invoice} />}
    {tab === "history" && <InvoiceHistoryTab invoice={invoice} />}
    <Actions invoice={invoice} tab={tab} canExport={canExport} onChanged={onChanged} onReload={onReload} />
  </div>;
}

function Actions({ invoice, tab, canExport, onChanged, onReload }: { invoice: InvoiceDetail; tab: Tab; canExport: boolean; onChanged(invoice: InvoiceDetail): void; onReload(): void }) {
  const router = useRouter(), { notify } = useToast(), actions = useInvoiceActions(invoice.id, onChanged);
  const [cancelling, setCancelling] = useState(false), [cutting, setCutting] = useState(false);
  const allowed = allowedSet(invoice.allowedActions), completed = invoice.statusId === INVOICE.completed;
  const can = (action: InvoiceAction) => allowed.has(action), mayChange = completed && (can("Edit") || can("Correct"));
  return <><ErrorNotice error={actions.error} /><footer className={listStyles.tabFooter}>
    <div>
      {completed && can("Cancel") && <Button className="w-auto" variant="ghost" onClick={() => setCancelling(true)}><InterfaceIcon name="trash" className="size-4" />Hủy hóa đơn</Button>}
      {can("Print") && canExport && <Button className="w-auto" variant="ghost" isPending={actions.printing} disabled={actions.printing} onClick={actions.print}><InterfaceIcon name="download" className="size-4" />In</Button>}
    </div>
    <div>
      {mayChange && <Button className="w-auto" onClick={() => router.push(`/sales/invoices/${invoice.id}/edit`)}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>}
      {can("Resend") && <Button className="w-auto" variant="secondary" isPending={actions.resending} disabled={actions.blocked || actions.resending} onClick={() => void actions.resend()}><InterfaceIcon name="refresh" className="size-4" />Gửi lại</Button>}
      {mayChange && tab === "history" && <Button className="w-auto" variant="secondary" onClick={() => setCutting(true)}><InterfaceIcon name="payment" className="size-4" />Giảm giá sau khiếu nại</Button>}
      {/* Phiếu trả hàng bán (CLAIM-03) chưa có endpoint tạo: nút giữ ở trạng thái khóa cho tới khi backend có API và màn Phiếu trả hàng bán được nối. */}
      {can("CreateReturn") && <Button className="w-auto" variant="secondary" disabled aria-disabled="true"><InterfaceIcon name="upload" className="size-4" />Tạo phiếu trả hàng bán</Button>}
    </div>
    {cancelling && <InvoiceCancelDialog invoice={invoice} onClose={() => setCancelling(false)} onDone={(next) => { setCancelling(false); notify({ tone: "success", title: `Đã hủy hóa đơn ${next.code}.` }); onChanged(next); }} onReload={() => { setCancelling(false); onReload(); }} />}
    {cutting && <InvoiceCorrectionDialog invoice={invoice} onClose={() => setCutting(false)} onDone={(next) => { setCutting(false); notify({ tone: "success", title: `Đã ghi giảm giá sau khiếu nại cho hóa đơn ${next.code}.` }); onChanged(next); }} onReload={() => { setCutting(false); onReload(); }} />}
  </footer></>;
}

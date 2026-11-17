"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, Subtabs } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { PAYMENT } from "@/features/customers/contracts";
import { CustomerQrDialog } from "@/features/customers/customer-qr-dialog";
import { customerHref, invoiceHref } from "@/features/customers/customer-links";
import { paymentStatus } from "@/features/customers/customer-payment-dialogs";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import { planHref, planStatusLabel } from "@/features/harvest-plans/plan-labels";
import { productHref } from "@/features/products/product-helpers";
import styles from "@/features/purchase-documents/purchases.module.css";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { ORDER, type OrderAction, type OrderView } from "./contracts";
import type { OrderAccess } from "./order-access";
import { ORDERS_PATH, OrderStatus, advanceMethodLabel, planHarvestHref, processOrderHref, sourceLabel } from "./order-labels";
import { progressText } from "./order-logic";
import { errorText, orderRepository } from "./repository";

type Tab = "info" | "history";
const INVOICE_CANCELLED = 3502;
const tabs = [{ key: "info" as const, label: "Thông tin" }, { key: "history" as const, label: "Lịch sử" }];
const dash = (value: string | null | undefined) => value || "—";

/** The row opened under the list, laid out like the purchase receipt row: tabs, then the order with its lines and money, then the buttons the API allows now. */
export function OrderDetailPanel({ id, access, onChanged }: { id: string; access: OrderAccess; onChanged(): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => orderRepository.detail(id, signal), [id]));
  const [tab, setTab] = useState<Tab>("info");
  if (remote.loading) return <div className={listStyles.detail}><Skeleton /></div>;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được đơn đặt hàng."} onRetry={remote.reload} retryLabel="Tải lại đơn" />;
  return <section className={listStyles.detail} aria-label={`Chi tiết ${remote.data.code}`}>
    <Subtabs<Tab> label="Nội dung đơn đặt hàng" tabs={tabs} value={tab} onChange={setTab} />
    <Body key={remote.data.rowVersion} order={remote.data} tab={tab} access={access} onChanged={() => { remote.reload(); onChanged(); }} />
  </section>;
}

function Body({ order, tab, access, onChanged }: { order: OrderView; tab: Tab; access: OrderAccess; onChanged(): void }) {
  return <div className={listStyles.tabBody}>
    {tab === "info" ? <InfoTab order={order} /> : <HistoryTab order={order} />}
    <Actions order={order} access={access} onChanged={onChanged} />
  </div>;
}

function InfoTab({ order }: { order: OrderView }) {
  const [codeTerm, setCodeTerm] = useState(""), [nameTerm, setNameTerm] = useState("");
  const shown = order.lines.filter((line) => line.productCode.toLowerCase().includes(codeTerm.trim().toLowerCase()) && line.productName.toLowerCase().includes(nameTerm.trim().toLowerCase()));
  return <>
    <header className={styles.head}><div><h3>{order.code}</h3><OrderStatus statusId={order.statusId} /></div></header>
    <div className={styles.headFacts}>
      <div><span>Thời gian:</span><strong>{viDateTime(order.orderedAt)}</strong></div>
      <div><span>Hẹn lấy hàng:</span><strong>{order.pickupAt ? viDateTime(order.pickupAt) : "—"}</strong></div>
      <div><span>Khách hàng:</span>{order.customer ? <span><Link className={styles.link} href={customerHref(order.customer.code)}>{order.customer.code}</Link> · {order.customer.name}</span> : <strong>Khách lẻ</strong>}</div>
      <div><span>Số điện thoại:</span><strong>{dash(order.customer?.phoneNumber)}</strong></div>
      <div><span>Nguồn đặt:</span><strong>{sourceLabel[order.source]}</strong></div>
      <div><span>Người nhận đặt:</span><strong>{dash(order.receivedBy.name)}</strong></div>
      <div><span>Người tạo:</span><strong>{dash(order.createdBy?.name)}</strong></div>
      {order.purchaseRequest && <div><span>Yêu cầu mua:</span><Link className={styles.link} href={`/operations/purchase-requests/${order.purchaseRequest.id}`}>Gửi lúc {viDateTime(order.purchaseRequest.sentAt)}</Link></div>}
      {order.harvestPlans.length > 0 && <div><span>Kế hoạch thu hoạch:</span><span className={styles.codeList}>{order.harvestPlans.map((plan) => <Link key={plan.id} className={styles.link} href={planHref(plan.code)} title={planStatusLabel[plan.statusId]}>{plan.code}</Link>)}</span></div>}
      {order.completedAt && <div><span>Hoàn thành lúc:</span><strong>{viDateTime(order.completedAt)}{order.completedManually ? " (kết thúc tay)" : ""}</strong></div>}
      {order.statusId === ORDER.cancelled && <div><span>Hủy lúc:</span><strong>{order.cancelledAt ? viDateTime(order.cancelledAt) : "—"}</strong></div>}
      {order.cancelReason && <div><span>Lý do hủy:</span><span className={styles.danger}>{order.cancelReason}</span></div>}
    </div>
    <div className={styles.innerScroll}><table className={styles.inner}><thead><tr><th>Mã hàng</th><th>Tên hàng</th><th>Đơn vị</th><th className={styles.num}>Số lượng</th><th className={styles.num}>Đã giao</th><th className={styles.num}>Đơn giá</th><th className={styles.num}>Thành tiền</th></tr></thead>
      <tbody>
        <tr className={styles.lineSearch}><td style={{ width: 140 }}><input type="search" aria-label="Tìm mã hàng" placeholder="Tìm mã" value={codeTerm} onChange={(event) => setCodeTerm(event.target.value)} /></td><td><input type="search" aria-label="Tìm tên hàng" placeholder="Tìm tên hàng" value={nameTerm} onChange={(event) => setNameTerm(event.target.value)} /></td><td colSpan={5} /></tr>
        {shown.map((line) => <tr key={line.id}>
          <td><Link className={styles.link} href={productHref(line.productCode)}>{line.productCode}</Link></td>
          <td>{line.productName}{line.note && <span className={styles.sub}> {line.note}</span>}</td>
          <td>{line.unitName}</td><td className={styles.num}>{fmt(line.quantity)}</td><td className={styles.num}>{fmt(line.deliveredQuantity)}</td>
          <td className={styles.num}>{fmt(line.unitPrice)}{line.unitPrice !== line.listPrice && <span className={styles.sub}> niêm yết {fmt(line.listPrice)}</span>}</td>
          <td className={styles.num}><strong>{fmt(line.amount)}</strong></td></tr>)}
        {!shown.length && <tr><td colSpan={7} className={styles.empty}>Không có dòng hàng phù hợp.</td></tr>}
      </tbody></table></div>
    <div className={styles.foot}>
      <textarea className={styles.noteEdit} aria-label="Ghi chú" placeholder="Ghi chú..." readOnly value={order.note ?? ""} />
      <div className={styles.sums}>
        <div><span>Tổng tiền hàng ({order.lines.length})</span><span>{fmt(order.subtotal)}</span></div>
        <div><span>Giảm giá</span><span>{fmt(order.discount)}</span></div>
        <div className={styles.strong}><span>Khách cần trả</span><span>{fmt(order.total)}</span></div>
        <div><span>Khách đã trả</span><span>{fmt(order.customerPaid)}</span></div>
        {order.advanceReserved && <div><span>Tiền ứng giữ riêng cho đơn</span><span>{fmt(order.advanceLeft)}</span></div>}
        <div><span>Đã lập hóa đơn</span><span>{fmt(order.invoicedTotal)}</span></div>
        <div><span>Tiến độ giao</span><span>{progressText(order.progress)}</span></div>
      </div>
    </div>
  </>;
}

function Actions({ order, access, onChanged }: { order: OrderView; access: OrderAccess; onChanged(): void }) {
  const router = useRouter(), confirmation = useActionDialog(), { notify } = useToast();
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const can = (action: OrderAction) => order.allowedActions.includes(action);
  const open = order.statusId === ORDER.draft || order.statusId === ORDER.delivering;
  const planHarvest = planHarvestHref(order.id), processHref = processOrderHref(order.id);
  const advanced = order.advances.reduce((sum, advance) => sum + advance.amount, 0);

  async function cancel() {
    const reason = await confirmation.prompt(`Hủy đơn đặt hàng ${order.code}? ${advanced > 0 ? "Tiền ứng của đơn được giữ lại thành tín dụng của khách. " : ""}Nhập lý do hủy.`);
    if (!reason) return;
    setPending(true); setError(undefined);
    const result = await orderRepository.cancel(order.id, reason, order.rowVersion);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã hủy đơn đặt hàng ${order.code}.` }); onChanged(); } else setError(errorText(result));
  }
  async function finish() {
    if (!(await confirmation.confirm(`Kết thúc đơn đặt hàng ${order.code}? Đơn chuyển sang Hoàn thành${order.advanceLeft > 0 ? `; tiền ứng còn lại ${fmt(order.advanceLeft)} đ trở thành tín dụng của khách` : ""}.`))) return;
    setPending(true); setError(undefined);
    const result = await orderRepository.finish(order.id, order.rowVersion);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã kết thúc đơn đặt hàng ${order.code}.` }); onChanged(); } else setError(errorText(result));
  }
  async function print() {
    setPending(true); setError(undefined);
    const result = await orderRepository.print(order.id);
    setPending(false);
    if (result.status !== "success") setError(errorText(result));
  }

  return <><ErrorNotice error={error} />{confirmation.dialog}
    <footer className={listStyles.tabFooter}>
      <div>
        {can("Cancel") && access.remove && <Button className="w-auto" variant="ghost" isPending={pending} onClick={() => void cancel()}><InterfaceIcon name="trash" className="size-4" />Hủy</Button>}
        {access.create && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => router.push(`${ORDERS_PATH}/new?copy=${order.id}`)}><InterfaceIcon name="document" className="size-4" />Sao chép</Button>}
        {can("Print") && access.exportFile && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => void print()}><InterfaceIcon name="download" className="size-4" />Xuất file</Button>}
      </div>
      <div>
        {can("Process") && processHref && <Button className="w-auto" disabled={pending} onClick={() => router.push(processHref)}><InterfaceIcon name="receipt" className="size-4" />Xử lý đặt hàng</Button>}
        {can("Edit") && open && access.edit && <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => router.push(`${ORDERS_PATH}/${order.id}/edit`)}><InterfaceIcon name="pencil" className="size-4" />Mở phiếu</Button>}
        {can("Finish") && <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => void finish()}><InterfaceIcon name="check" className="size-4" />Kết thúc</Button>}
        {can("PlanHarvest") && planHarvest && <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => router.push(planHarvest)}><InterfaceIcon name="calendar" className="size-4" />Lập kế hoạch thu hoạch</Button>}
      </div>
    </footer></>;
}

/** One line of the history: an invoice made from the order or an advance payment taken with it. */
type HistoryRow = { key: string; code: string; href: string; at: string; method: string; status: string; amount: number; action?: ReactNode };

/** The invoices made from the order and the advance payments of it, newest first: the code opens the invoice list or the cash book, "Sửa" opens the invoice editor (only for who may change invoices). */
function HistoryTab({ order }: { order: OrderView }) {
  const { identity, permissions } = useApiWorkspace();
  const mayEdit = operationAllowed("sales-invoices", identity, permissions.functionPermissions, "Edit");
  const [reprint, setReprint] = useState<string>();
  const rows: HistoryRow[] = [
    ...order.invoices.map((invoice) => ({
      key: invoice.id, code: invoice.code, href: invoiceHref(invoice.code), at: invoice.invoicedAt, method: "Hóa đơn", status: invoice.statusId === INVOICE_CANCELLED ? "Đã hủy" : "Hoàn thành", amount: invoice.total,
      action: mayEdit && invoice.statusId !== INVOICE_CANCELLED ? <Link className={styles.link} href={`/sales/invoices/${invoice.id}/edit`}>Sửa</Link> : undefined,
    })),
    ...order.advances.map((advance) => ({
      key: advance.paymentId, code: advance.paymentCode, href: `/operations/cash-book?code=${encodeURIComponent(advance.paymentCode)}`, at: advance.paidAt,
      method: `Tiền ứng - ${advanceMethodLabel[advance.method] ?? advance.method}`, status: paymentStatus(advance).label, amount: advance.amount,
      action: advance.statusId === PAYMENT.pending ? <button type="button" className={styles.link} onClick={() => setReprint(advance.paymentId)}>Hiện mã QR</button> : undefined,
    })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return <div className={styles.innerScroll}>
    {reprint && <CustomerQrDialog reprintId={reprint} onClose={() => setReprint(undefined)} />}
    <table className={styles.inner}><thead><tr><th>Mã phiếu</th><th>Thời gian</th><th>Phương thức</th><th>Trạng thái</th><th className={styles.num}>Số tiền</th><th /></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.key}>
        <td><Link className={styles.link} href={row.href}>{row.code}</Link></td><td>{viDateTime(row.at)}</td><td>{row.method}</td><td>{row.status}</td><td className={styles.num}>{fmt(row.amount)}</td><td>{row.action}</td></tr>)}
      {!rows.length && <tr><td colSpan={6} className={styles.empty}>Chưa có hóa đơn hay tiền ứng nào của đơn này.</td></tr>}</tbody></table></div>;
}

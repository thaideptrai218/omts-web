"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, Subtabs } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useToast } from "@/components/ui/toast-provider";
import { customerHref, invoiceHref } from "@/features/customers/customer-links";
import { lotsHref } from "@/features/harvest-lots/lot-labels";
import { ErrorNotice, Skeleton, operationError, useRemote } from "@/features/operations/ui";
import { productHref } from "@/features/products/product-helpers";
import { fmt, viDate, viDateTime } from "@/features/purchase-documents/document-parts";
import styles from "@/features/purchase-documents/purchases.module.css";
import { orderHref } from "@/features/sales-orders/order-labels";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { RETURN, type ReturnView } from "./return-contracts";
import { ReturnStatus, outcomeLabel } from "./return-labels";
import { returnRepository } from "./repository";

type Tab = "info" | "history";
const tabs = [{ key: "info" as const, label: "Thông tin" }, { key: "history" as const, label: "Lịch sử" }];
const kgText = (value: number | null | undefined) => `${fmt(value)} kg`;

/** The row opened under the list, laid out like the invoice row: tabs, the return with its lines, then the buttons the API allows now. */
export function ReturnDetailPanel({ id, canCancel, onChanged }: { id: string; canCancel: boolean; onChanged(): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => returnRepository.detail(id, signal), [id]));
  const [tab, setTab] = useState<Tab>("info");
  if (remote.loading) return <div className={listStyles.detail}><Skeleton /></div>;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được phiếu trả hàng."} onRetry={remote.reload} retryLabel="Tải lại phiếu" />;
  const item = remote.data;
  return <section className={listStyles.detail} aria-label={`Chi tiết ${item.code}`}>
    <Subtabs<Tab> label={`Phiếu trả hàng ${item.code}`} tabs={tabs} value={tab} onChange={setTab} />
    <div className={listStyles.tabBody} key={item.rowVersion}>
      {tab === "info" ? <InfoTab item={item} /> : <HistoryTab item={item} />}
      {tab === "info" && <Actions item={item} canCancel={canCancel} onChanged={() => { remote.reload(); onChanged(); }} />}
    </div>
  </section>;
}

function InfoTab({ item }: { item: ReturnView }) {
  const recorded = item.statusId === RETURN.recorded, customer = item.customer;
  const backForSale = item.backForSaleKg ?? item.lines.filter((line) => line.outcome === "BackForSale").reduce((sum, line) => sum + line.returnedKg, 0);
  const discarded = item.discardedKg ?? item.lines.reduce((sum, line) => sum + line.discardedKg, 0);
  return <>
    <header className={styles.head}><div><h3>{item.code}</h3><ReturnStatus statusId={item.statusId} /></div></header>
    <div className={styles.headFacts}>
      <div><span>Thời gian:</span><strong>{item.recordedAt ? viDateTime(item.recordedAt) : viDate(item.returnDate)}</strong></div>
      <div><span>Hóa đơn:</span><Link className={styles.link} href={invoiceHref(item.invoiceCode)}>{item.invoiceCode}</Link></div>
      <div><span>Đơn đặt hàng:</span>{item.salesOrder ? <Link className={styles.link} href={orderHref(item.salesOrder.code)}>{item.salesOrder.code}</Link> : <strong>—</strong>}</div>
      <div><span>Khách hàng:</span>{customer ? customer.code ? <span><Link className={styles.link} href={customerHref(customer.code)}>{customer.code}</Link> · {customer.name}</span> : <strong>{customer.name}</strong> : <strong>Khách lẻ</strong>}</div>
      <div><span>Vùng:</span><strong>{item.zoneCode || "—"}</strong></div>
      <div><span>Người lập:</span><strong>{item.recordedBy.name || "—"}</strong></div>
      {item.statusId === RETURN.cancelled && <div><span>Hủy lúc:</span><strong>{item.cancelledAt ? viDateTime(item.cancelledAt) : "—"}</strong></div>}
      {item.cancelReason && <div><span>Lý do hủy:</span><span className={styles.danger}>{item.cancelReason}</span></div>}
    </div>
    <div className={styles.innerScroll}><table className={styles.inner} aria-label="Dòng hàng trả lại"><thead><tr><th>#</th><th>Sản phẩm</th><th>Lô thu hoạch</th><th className={styles.num}>Số kg</th><th>Xử lý</th></tr></thead>
      <tbody>{item.lines.map((line, index) => <tr key={line.invoiceLineId}>
        <td>{line.lineNumber ?? index + 1}</td><td>{line.productCode ? <Link className={styles.link} href={productHref(line.productCode)}>{line.productName || line.productCode}</Link> : line.productName || "—"}</td><td><Link className={styles.link} href={lotsHref(line.lotCode)}>{line.lotCode}</Link></td>
        <td className={styles.num}>{fmt(line.returnedKg)}</td><td>{outcomeLabel[line.outcome]}</td></tr>)}
      {!item.lines.length && <tr><td colSpan={5} className={styles.empty}>Phiếu không có dòng hàng.</td></tr>}</tbody></table></div>
    {recorded && item.lots.length > 0 && <div className={styles.innerScroll}><table className={styles.inner} aria-label="Kho lô sau khi bán lại"><thead><tr><th>Lô nhận lại hàng</th><th className={styles.num}>Còn lại hiện tại</th><th className={styles.num}>Còn lại nếu hủy phiếu</th></tr></thead>
      <tbody>{item.lots.map((lot) => <tr key={lot.harvestLotId}><td><Link className={styles.link} href={lotsHref(lot.lotCode)}>{lot.lotCode}</Link></td><td className={styles.num}>{kgText(lot.remainingKg)}</td>
        <td className={`${styles.num} ${lot.remainingAfterCancelKg < 0 ? styles.danger : ""}`}>{kgText(lot.remainingAfterCancelKg)}</td></tr>)}</tbody></table></div>}
    <div className={styles.foot}>
      <p className={styles.noteBox}>{item.reason || "Chưa có lý do trả hàng."}</p>
      <div className={styles.sums}>
        <div><span>Hàng bán lại</span><span>{kgText(backForSale)}</span></div>
        <div><span>Hàng hủy bỏ</span><span>{kgText(discarded)}</span></div>
        <div className={styles.strong}><span>Giá trị phiếu trả</span><span>{fmt(item.value)}</span></div>
        {recorded && <div><span>Tính vào công nợ khách</span><span>{fmt(-item.value)}</span></div>}
      </div>
    </div>
  </>;
}

/** What the return itself records: it was recorded, and who cancelled it and why. The API has no other change of a return to list. */
function HistoryTab({ item }: { item: ReturnView }) {
  const rows = [
    { key: "recorded", at: item.recordedAt ? viDateTime(item.recordedAt) : viDate(item.returnDate), action: "Ghi nhận phiếu trả hàng", by: item.recordedBy.name, reason: item.reason },
    ...(item.statusId === RETURN.cancelled ? [{ key: "cancelled", at: item.cancelledAt ? viDateTime(item.cancelledAt) : "—", action: "Hủy phiếu trả hàng", by: item.cancelledBy?.name ?? "", reason: item.cancelReason ?? "" }] : []),
  ];
  return <div className={styles.innerScroll}><table className={styles.inner} aria-label="Lịch sử phiếu trả hàng"><thead><tr><th>Thời gian</th><th>Thao tác</th><th>Người thực hiện</th><th>Lý do</th></tr></thead>
    <tbody>{rows.map((row) => <tr key={row.key}><td>{row.at}</td><td>{row.action}</td><td>{row.by || "—"}</td><td>{row.reason || "—"}</td></tr>)}</tbody></table></div>;
}

function Actions({ item, canCancel, onChanged }: { item: ReturnView; canCancel: boolean; onChanged(): void }) {
  const router = useRouter(), confirmation = useActionDialog(), { notify } = useToast();
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const mayCancel = item.canCancel && canCancel && item.statusId === RETURN.recorded;

  /** The reason first; when taking the kg back would bring a lot below zero the API asks (MSG-CLAIM-06) and the same cancellation is sent again with the answer. */
  async function cancel() {
    const reason = await confirmation.prompt(`Hủy phiếu trả hàng ${item.code}? Phiếu chuyển sang Đã hủy; số kg đã bán lại được trừ khỏi lô. Nhập lý do hủy.`);
    if (!reason) return;
    setPending(true); setError(undefined);
    let confirmed = false;
    for (;;) {
      const result = await returnRepository.cancel(item.id, { reason, rowVersion: item.rowVersion, ...(confirmed ? { confirmNegativeRemaining: true } : {}) });
      if (result.status === "success") { setPending(false); notify({ tone: "success", title: `Đã hủy phiếu trả hàng ${item.code}.` }); onChanged(); return; }
      const question = result.httpStatus === 409 && !confirmed ? result.invoiceConfirmation : undefined;
      if (question?.field !== "confirmNegativeRemaining") { setPending(false); setError(operationError(result)); return; }
      const lots = (question.lots ?? []).map((lot) => `${lot.lotCode} (${fmt(lot.remainingKg)} kg)`).join(", ");
      if (!(await confirmation.confirm(`Hủy phiếu sẽ làm lô ${lots || "đã nhận hàng"} còn lại dưới 0 kg vì hàng đã được bán tiếp. Vẫn hủy phiếu ${item.code}?`))) { setPending(false); return; }
      confirmed = true;
    }
  }

  return <>{confirmation.dialog}<ErrorNotice error={error} />
    <footer className={listStyles.tabFooter}>
      <div>{mayCancel && <Button className="w-auto" variant="ghost" isPending={pending} onClick={() => void cancel()}><InterfaceIcon name="trash" className="size-4" />Hủy phiếu</Button>}</div>
      <div><Button className="w-auto" variant="secondary" disabled={pending} onClick={() => router.push(invoiceHref(item.invoiceCode))}><InterfaceIcon name="receipt" className="size-4" />Xem hóa đơn</Button></div>
    </footer></>;
}

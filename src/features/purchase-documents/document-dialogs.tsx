"use client";
import Link from "next/link";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { ListStateMessage, managementStyles } from "@/components/ui/management-screen/management-table";
import { Skeleton, useRemote } from "@/features/operations/ui";
import { fmt, methodLabel, usePurchaseAccess, viDateTime, vnLocal } from "./document-parts";
import { InfoTab, supplierHref } from "./receipt-detail";
import { getReceipt, getReturn } from "./repository";
import { RECEIPT, RETURN, goodsTotal, returnStatusLabel } from "./types";
import styles from "./purchases.module.css";

/** Opens the document in its own list, filtered to it: the reference the dialog points back to. */
function Reference({ href, label }: { href: string; label: string }) {
  return <Link href={href} className={styles.reference} title={`Mở ${label} trong danh sách`} aria-label={`Mở ${label} trong danh sách`}><InterfaceIcon name="link" /></Link>;
}

/** A purchase receipt opened from another screen (supplier history, debt statement, notifications): read, then open it to edit. */
export function ReceiptViewDialog({ id, onClose }: { id: string; onClose(): void }) {
  const access = usePurchaseAccess();
  const remote = useRemote(useCallback((signal: AbortSignal) => getReceipt(id, signal), [id]));
  const receipt = remote.data;
  const editable = !!receipt && access.edit && receipt.statusId !== RECEIPT.cancelled;
  return <Dialog open size="xl" title="Phiếu nhập hàng" onOpenChange={(open) => { if (!open) onClose(); }}><div className={`${managementStyles.theme} ${styles.documentDialog}`}>
    {remote.loading ? <Skeleton /> : remote.error || !receipt ? <ListStateMessage error={remote.error ?? "Không tải được phiếu."} onRetry={remote.reload} retryLabel="Tải lại phiếu" />
      : <>
        <InfoTab receipt={receipt} editable={false} onHeader={() => undefined} header={{ receivedById: receipt.receivedBy?.id ?? "", receivedAt: vnLocal(receipt.receivedAt), notes: receipt.notes ?? "" }}
          headTools={<Reference href={`/operations/purchase-receipts?code=${receipt.code}`} label={`phiếu ${receipt.code}`} />} />
        <footer className={styles.dialogFoot}>
          <Button className="w-auto" variant="secondary" onClick={onClose}>Đóng</Button>
          {editable && <Link className={styles.primaryLink} href={`/operations/purchase-receipts/${receipt.id}/edit`}><InterfaceIcon name="pencil" />Mở phiếu</Link>}
        </footer>
      </>}
  </div></Dialog>;
}

/** A purchase return opened from another screen, read-only with its reference and an Open button for editing. */
export function ReturnViewDialog({ id, onClose }: { id: string; onClose(): void }) {
  const access = usePurchaseAccess();
  const remote = useRemote(useCallback((signal: AbortSignal) => getReturn(id, signal), [id]));
  const item = remote.data;
  const tone = item?.statusId === RETURN.recorded ? "success" : item?.statusId === RETURN.cancelled ? "danger" : "neutral";
  return <Dialog open size="xl" title="Phiếu trả hàng nhập" onOpenChange={(open) => { if (!open) onClose(); }}><div className={`${managementStyles.theme} ${styles.documentDialog}`}>
    {remote.loading ? <Skeleton /> : remote.error || !item ? <ListStateMessage error={remote.error ?? "Không tải được phiếu."} onRetry={remote.reload} retryLabel="Tải lại phiếu" />
      : <>
        <header className={styles.head}><div><h3>{item.code}</h3><StatusPill tone={tone}>{returnStatusLabel[item.statusId]}</StatusPill><Reference href={`/operations/purchase-returns?code=${item.code}`} label={`phiếu ${item.code}`} /></div></header>
        <div className={styles.headFacts}>
          <div><span>Người tạo:</span><strong>{item.recordedBy}</strong></div>
          <div><span>Thời gian trả:</span><strong>{viDateTime(item.returnedAt)}</strong></div>
          <div><span>Tên NCC:</span><Link className={styles.link} href={supplierHref(item)}>{item.supplier.name}</Link></div>
          {item.receipt && <div><span>Phiếu nhập:</span><Link className={styles.link} href={`/operations/purchase-receipts?code=${item.receipt.code}`}>{item.receipt.code}</Link></div>}
          {item.refund && <div><span>NCC trả tiền:</span><strong>{item.refund.code} · {methodLabel[item.refund.method]}</strong></div>}
        </div>
        <div className={styles.innerScroll}><table className={styles.inner}><thead><tr><th>Mã hàng</th><th>Tên hàng</th><th className={styles.num}>Số lượng</th><th className={styles.num}>Giá trả lại</th><th className={styles.num}>Thành tiền</th></tr></thead>
          <tbody>{item.lines.map((line) => <tr key={line.id}><td><Link className={styles.link} href={`/workspace/input-items?recordId=${line.item.id}`}>{line.item.code}</Link></td><td>{line.item.name} <span className={styles.sub}>{line.item.unit}</span></td><td className={styles.num}>{fmt(line.quantity)}</td><td className={styles.num}>{fmt(line.unitPrice)}</td><td className={styles.num}><strong>{fmt(Math.round(line.quantity * line.unitPrice))}</strong></td></tr>)}</tbody></table></div>
        <div className={styles.foot}><p className={styles.noteBox}>{item.reason || "Chưa có lý do trả hàng."}</p>
          <div className={styles.sums}><div><span>Tổng tiền hàng</span><span>{fmt(goodsTotal(item.lines))}</span></div><div><span>Giảm giá</span><span>{fmt(item.discount)}</span></div><div className={styles.strong}><span>NCC cần trả</span><span>{fmt(item.netValue)}</span></div><div><span>Tiền NCC đã trả</span><span>{fmt(item.refund?.amount ?? 0)}</span></div></div></div>
        <footer className={styles.dialogFoot}>
          <Button className="w-auto" variant="secondary" onClick={onClose}>Đóng</Button>
          {access.edit && item.statusId !== RETURN.cancelled && <Link className={styles.primaryLink} href={`/operations/purchase-returns/${item.id}/edit`}><InterfaceIcon name="pencil" />Mở phiếu</Link>}
        </footer>
      </>}
  </div></Dialog>;
}

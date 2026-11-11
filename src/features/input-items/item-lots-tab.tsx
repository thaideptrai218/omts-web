"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { errorText, inputRepository } from "./repository";
import styles from "./input-items.module.css";

/** Lô giống (seed items only): the lots of the item's receipts with what is left of each, and the quantity that belongs to no lot. */
export function ItemLotsTab({ itemId, canDelete, onChanged }: { itemId: string; canDelete: boolean; onChanged(): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => inputRepository.seedLots(itemId, signal), [itemId]));
  const confirmation = useActionDialog(), { notify } = useToast(), [error, setError] = useState<string>(), [busy, setBusy] = useState<string>();
  async function removeLot(lotId: string, code: string) {
    if (busy || !(await confirmation.confirm(`Xóa lô giống ${code}? Số còn lại của lô sẽ được xuất hủy; chứng từ cũ vẫn giữ.`))) return;
    setBusy(lotId); setError(undefined);
    const result = await inputRepository.removeSeedLot(itemId, lotId);
    setBusy(undefined);
    if (result.status !== "success") { setError(errorText(result)); return; }
    notify({ tone: "success", title: `Đã xóa lô giống ${code}.`, description: result.data.disposalCode ? `Số còn lại đã xuất hủy theo phiếu ${result.data.disposalCode}.` : undefined });
    remote.reload(); onChanged();
  }
  if (remote.loading) return <div className={listStyles.tabBody}><Skeleton /></div>;
  const data = remote.data;
  if (remote.error || !data) return <div className={listStyles.tabBody}><ListStateMessage error={remote.error ?? "Không tải được lô giống."} onRetry={remote.reload} /></div>;
  return <div className={listStyles.tabBody}>{confirmation.dialog}
    {!data.lots.length && data.unlottedQuantity <= 0 ? <p className={styles.empty}>Chưa có lô giống nào.</p>
      : <div className={styles.innerScroll}><table className={styles.inner}><thead><tr>
        <th>Mã lô</th><th>Phiếu nhập</th><th>Ngày nhập</th><th>Nhà cung cấp</th><th>Mã lô nhà cung cấp</th><th className={styles.num}>Số lượng nhập{data.unit ? ` (${data.unit})` : ""}</th><th className={styles.num}>Còn lại</th>{canDelete && <th />}
      </tr></thead><tbody>
        {data.lots.map((lot) => <tr key={lot.seedLotLineId}>
          <td className="font-mono">{lot.code}</td>
          <td>{lot.receiptCode ? <Link className={styles.link} href={`/operations/purchase-receipts?code=${encodeURIComponent(lot.receiptCode)}`}>{lot.receiptCode}</Link> : "—"}</td>
          <td>{lot.receivedAt ? viDateTime(lot.receivedAt) : "—"}</td><td>{lot.supplierName || "—"}</td><td>{lot.supplierLotCode || "—"}</td>
          <td className={styles.num}>{fmt(lot.receivedQuantity)}</td><td className={styles.num}>{fmt(lot.onHand)}</td>
          {canDelete && <td>{lot.onHand > 0 && <Button className="w-auto" variant="ghost" disabled={busy === lot.seedLotLineId} onClick={() => void removeLot(lot.seedLotLineId, lot.code)}><InterfaceIcon name="trash" className="size-4" />Xóa lô</Button>}</td>}
        </tr>)}
        {data.unlottedQuantity > 0 && <tr><td colSpan={5}>Chưa gắn lô <span className={styles.muted}>(còn lại ban đầu hoặc xuất không chọn lô)</span></td><td />
          <td className={styles.num}>{fmt(data.unlottedQuantity)}</td>{canDelete && <td />}</tr>}
      </tbody></table></div>}
    <ErrorNotice error={error} />
  </div>;
}

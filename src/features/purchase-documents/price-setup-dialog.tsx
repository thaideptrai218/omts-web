"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ListStateMessage, managementStyles } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { inputRepository, problemText } from "@/features/input-items/repository";
import type { PriceSetup } from "@/features/input-items/contracts";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { fmt } from "./document-parts";
import styles from "./purchases.module.css";

const asText = (value: number | null | undefined) => value == null ? "" : String(value);
/** The typed cost: empty clears it, otherwise a non-negative number (a comma works as the decimal mark); NaN when it is not a number. */
const parseCost = (text: string) => { const value = text.trim().replace(",", "."); return value === "" ? null : /^\d+(\.\d{1,4})?$/.test(value) ? Number(value) : Number.NaN; };

/**
 * "Thiết lập giá" of a receipt: the cost price of each item on it (per base unit) next to the last purchase price. Only the items
 * whose cost was changed are sent. The Owner alone sets costs.
 */
export function PriceSetupDialog({ receiptId, receiptCode, onClose }: { receiptId: string; receiptCode: string; onClose(): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => inputRepository.priceSetup(receiptId, signal), [receiptId]));
  return <Dialog open size="lg" title={`Thiết lập giá ${receiptCode}`} onOpenChange={(open) => { if (!open) onClose(); }}><div className={managementStyles.theme}>
    {remote.loading ? <Skeleton /> : remote.error || !remote.data ? <ListStateMessage error={remote.error ?? "Không tải được giá."} onRetry={remote.reload} retryLabel="Tải lại" />
      : <PriceForm setup={remote.data} onClose={onClose} />}
  </div></Dialog>;
}

function PriceForm({ setup, onClose }: { setup: PriceSetup; onClose(): void }) {
  const { notify } = useToast();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(setup.lines.map((line) => [line.itemId, asText(line.costPrice)])));
  const [pending, setPending] = useState(false), [error, setError] = useState<string>();
  const changes = setup.lines.flatMap((line) => { const next = parseCost(values[line.itemId] ?? ""); return Object.is(next, line.costPrice ?? null) ? [] : [{ itemId: line.itemId, costPrice: next }]; });
  const invalid = changes.some((change) => Number.isNaN(change.costPrice));

  async function save() {
    setPending(true); setError(undefined);
    const result = await inputRepository.savePriceSetup(setup.receiptId, changes);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: "Đã cập nhật giá vốn." }); onClose(); } else setError(problemText(result));
  }
  return <>
    <div className={styles.innerScroll}><table className={styles.inner}>
      <thead><tr><th>Tên hàng</th><th className={styles.num}>Giá nhập phiếu này</th><th className={styles.num}>Giá vốn</th><th className={styles.num}>Giá nhập cuối</th></tr></thead>
      <tbody>{setup.lines.map((line, index) => <tr key={line.itemId}>
        <td>{line.itemName}<span className={styles.sub}>{line.itemCode} · giá tính theo {line.unit}</span></td>
        <td className={styles.num}>{fmt(line.receiptPrice)}</td>
        <td className={styles.num}><input aria-label={`Giá vốn dòng ${index + 1}: ${line.itemName}`} aria-invalid={Number.isNaN(parseCost(values[line.itemId] ?? "")) || undefined} className={styles.cellInput} inputMode="decimal" value={values[line.itemId] ?? ""} disabled={pending}
          onChange={(event) => setValues((current) => ({ ...current, [line.itemId]: event.target.value.replace(/[^\d.,]/g, "") }))} /></td>
        <td className={styles.num}>{fmt(line.lastPurchasePrice)}</td>
      </tr>)}
        {!setup.lines.length && <tr><td colSpan={4} className={styles.empty}>Phiếu chưa có hàng.</td></tr>}</tbody>
    </table></div>
    <p className={styles.hint}>Giá vốn dùng để tính giá trị khi xuất. Để trống để bỏ giá vốn.</p>
    <ErrorNotice error={invalid ? "Giá vốn phải là số không âm, tối đa 4 chữ số thập phân." : error} />
    <div className={styles.dialogFoot}><Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" isPending={pending} disabled={!changes.length || invalid} onClick={() => void save()}>Lưu</Button></div>
  </>;
}

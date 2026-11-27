"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import { ErrorNotice } from "@/features/operations/ui";
import { problemText, inputRepository } from "./repository";
import { DEFAULT_PURCHASE_VAT, vatRateLabelChoices, type VatRate } from "./vat-rate";
import styles from "./input-items.module.css";

/**
 * "Đổi VAT mua vào" of the items ticked on the list: one rate for all of them. Only the items change; receipts already written keep the rate of their lines.
 * `onDone(updated, rate)` runs after the API has changed them.
 */
export function ItemVatDialog({ itemIds, onClose, onDone }: { itemIds: readonly string[]; onClose(): void; onDone(updated: number, rate: VatRate): void }) {
  const [rate, setRate] = useState<VatRate>(DEFAULT_PURCHASE_VAT), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  async function submit() {
    if (pending) return;
    setPending(true); setError(undefined);
    const result = await inputRepository.setPurchaseVat(itemIds, rate);
    setPending(false);
    if (result.status === "success") onDone(result.data.updated, rate); else setError(problemText(result));
  }
  return <Dialog open size="md" title="Đổi VAT mua vào" dismissible={!pending} onOpenChange={(open) => { if (!open) onClose(); }}><div className={managementStyles.theme}>
    <label className="block text-xs font-medium text-text-muted">VAT mua vào của {itemIds.length} vật tư đã chọn
      <SelectBox aria-label="VAT mua vào" className="omts-control mt-1" value={rate} onChange={(event) => setRate(event.target.value as VatRate)}>{vatRateLabelChoices.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SelectBox></label>
    <p className={styles.hint}>Chỉ đổi mức VAT của vật tư. Phiếu nhập đã lập giữ nguyên mức của từng dòng.</p>
    <ErrorNotice error={error} />
    <div className={styles.formFoot}><Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" isPending={pending} onClick={() => void submit()}>Thay đổi</Button></div>
  </div></Dialog>;
}

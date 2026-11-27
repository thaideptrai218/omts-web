"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import { ErrorNotice } from "@/features/operations/ui";
import { useVatCatalogue } from "@/features/vat-rates/use-vat-catalogue";
import { problemText, inputRepository } from "./repository";
import { defaultVatRate, findVatRate, vatChoices } from "./vat-rate";
import styles from "./input-items.module.css";

/**
 * "Đổi VAT mua vào" of the items ticked on the list: one active rate of the catalogue for all of them. Only the items change; receipts already written keep the rate of their lines.
 * `onDone(updated, rateName)` runs after the API has changed them.
 */
export function ItemVatDialog({ itemIds, onClose, onDone }: { itemIds: readonly string[]; onClose(): void; onDone(updated: number, rateName: string): void }) {
  const { catalogue, loading } = useVatCatalogue();
  const [picked, setPicked] = useState(""), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  const rateId = picked || defaultVatRate(catalogue)?.id || "";
  async function submit() {
    if (pending || !rateId) return;
    setPending(true); setError(undefined);
    const result = await inputRepository.setPurchaseVat(itemIds, rateId, catalogue);
    setPending(false);
    if (result.status === "success") onDone(result.data.updated, findVatRate(catalogue, rateId)?.name ?? rateId); else setError(problemText(result));
  }
  return <Dialog open size="md" title="Đổi VAT mua vào" dismissible={!pending} onOpenChange={(open) => { if (!open) onClose(); }}><div className={managementStyles.theme}>
    <label className="block text-xs font-medium text-text-muted">VAT mua vào của {itemIds.length} vật tư đã chọn
      <SelectBox aria-label="VAT mua vào" className="omts-control mt-1" disabled={loading} value={rateId} onChange={(event) => setPicked(event.target.value)}>{vatChoices(catalogue).map((choice) => <option key={choice.id} value={choice.id}>{choice.name}</option>)}</SelectBox></label>
    <p className={styles.hint}>Chỉ đổi mức VAT của vật tư. Phiếu nhập đã lập giữ nguyên mức của từng dòng.</p>
    <ErrorNotice error={error} />
    <div className={styles.formFoot}><Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" isPending={pending} disabled={!rateId} onClick={() => void submit()}>Thay đổi</Button></div>
  </div></Dialog>;
}

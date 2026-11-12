"use client";
import { StatusPill } from "@/components/ui/management-page";
import { SelectBox } from "@/components/ui/select-box";
import { lotRemainingText } from "@/features/sales-invoices/invoice-lot-quantity";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import type { LotOption } from "./invoice-editor-logic";

/** "KHT000001 · B03-1 · còn 180 kg": the lot of the harvest plan linked to the order carries the plan code; the remaining quantity is for reference only. */
const label = (option: LotOption, kgPerCage?: number) =>
  `${option.planCode ? `${option.planCode} · ` : option.suggested ? "Gợi ý · " : ""}${option.code}${option.lot ? ` · ${lotRemainingText(option.lot, kgPerCage)}` : ""}`;

type Props = { position: number; options: readonly LotOption[]; value: string; wholeLot: boolean; kgPerCage?: number; onPick(lotId: string, lotCode: string): void; onWholeLot(checked: boolean): void };

/** The harvest lot of an invoice line (the plan's lots first, every lot that holds the product stays choosable) and the "Bán hết lô" tick of that lot. Same cell select as the unit of the receipt editor. */
export function InvoiceLotSelect({ position, options, value, wholeLot, kgPerCage, onPick, onWholeLot }: Props) {
  const chosen = options.find((option) => option.id === value);
  return <div>
    <SelectBox aria-label={`Lô thu hoạch dòng ${position}`} className={purchaseStyles.cellSelect} value={value} onChange={(event) => { const next = options.find((option) => option.id === event.target.value); onPick(next?.id ?? "", next?.code ?? ""); }}>
      <option value="">Chọn lô</option>{options.map((option) => <option key={option.id} value={option.id}>{label(option, kgPerCage)}</option>)}
    </SelectBox>
    {chosen?.planCode && <StatusPill tone="success">{chosen.planCode}</StatusPill>}
    {chosen?.lot?.originState === "Withdrawn" && <StatusPill tone="danger">Nguồn gốc đã thu hồi</StatusPill>}
    {chosen && <label className={purchaseStyles.sub}><input type="checkbox" aria-label={`Bán hết lô dòng ${position}`} checked={wholeLot} onChange={(event) => onWholeLot(event.target.checked)} /> Bán hết lô</label>}
  </div>;
}

"use client";
import { StatusPill } from "@/components/ui/management-page";
import { SelectBox } from "@/components/ui/select-box";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import type { LotOption } from "./invoice-editor-logic";

/** "KHT000001 · DEMO-01-B1-03-20261117": the lot of the harvest plan linked to the order carries the plan code. What is left on the lot shows under the quantity, not here. */
const label = (option: LotOption) => `${option.planCode ? `${option.planCode} · ` : option.suggested ? "Gợi ý · " : ""}${option.code}`;

type Props = { position: number; options: readonly LotOption[]; value: string; onPick(lotId: string, lotCode: string): void };

/** The harvest lot of an invoice line (the plan's lots first, every lot that holds the product stays choosable). Same cell select as the unit of the receipt editor; "Bán hết lô" sits under the table. */
export function InvoiceLotSelect({ position, options, value, onPick }: Props) {
  const chosen = options.find((option) => option.id === value);
  return <div>
    <SelectBox aria-label={`Lô thu hoạch dòng ${position}`} className={purchaseStyles.cellSelect} value={value} onChange={(event) => { const next = options.find((option) => option.id === event.target.value); onPick(next?.id ?? "", next?.code ?? ""); }}>
      <option value="">Chọn lô</option>{options.map((option) => <option key={option.id} value={option.id}>{label(option)}</option>)}
    </SelectBox>
    {chosen?.lot?.originState === "Withdrawn" && <StatusPill tone="danger">Nguồn gốc đã thu hồi</StatusPill>}
  </div>;
}

"use client";
import { SelectBox } from "@/components/ui/select-box";
import { vatRateChoices, type VatRate } from "@/features/input-items/vat-rate";
import styles from "./purchases.module.css";

/**
 * The "VAT (%)" of a receipt line: a select over KCT, 0, 5, 8 and 10, prefilled from the item and editable for the invoice of the supplier.
 * A line made before input VAT existed has no rate: it shows "—" until a rate is picked.
 */
export function VatRateCell({ label, value, onChange }: { label: string; value: VatRate | null; onChange(rate: VatRate): void }) {
  return <SelectBox aria-label={label} className={styles.cellSelect} value={value ?? ""} onChange={(event) => onChange(event.target.value as VatRate)}>
    {value === null && <option value="" disabled>—</option>}
    {vatRateChoices.map(([rate, text]) => <option key={rate} value={rate}>{text}</option>)}
  </SelectBox>;
}

"use client";
import { SelectBox } from "@/components/ui/select-box";
import { findVatRate, vatChoices, type VatCatalogue, type VatRateRow } from "@/features/input-items/vat-rate";
import styles from "./purchases.module.css";

/**
 * The "VAT (%)" of a receipt line: a select over the active rates of the catalogue, prefilled from the item and editable for the invoice of the supplier.
 * A rate that was switched off after the line was made still shows its name; a line made before input VAT has no rate and shows "—" until one is picked.
 */
export function VatRateCell({ label, catalogue, current, onChange }: { label: string; catalogue: VatCatalogue; current: { id: string | null; name: string | null }; onChange(rate: VatRateRow): void }) {
  return <SelectBox aria-label={label} className={styles.cellSelect} value={current.id ?? ""} onChange={(event) => { const rate = findVatRate(catalogue, event.target.value); if (rate) onChange(rate); }}>
    {current.id === null && <option value="" disabled>—</option>}
    {vatChoices(catalogue, current).map((choice) => <option key={choice.id} value={choice.id}>{choice.name}</option>)}
  </SelectBox>;
}

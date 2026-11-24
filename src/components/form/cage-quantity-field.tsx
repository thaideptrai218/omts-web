"use client";
import { useId } from "react";
import { UnitField } from "@/components/form/number-fields";
import { isUsableKgPerCage } from "@/shared/format/cage-quantity";
import { resolveQuantityInput, type CageQuantityValue, type QuantityUnit } from "@/shared/format/cage-request-quantity";

/**
 * Quantity typed as cages (default) or kg. The Kg choice only appears when the cooperative's kg per
 * cage is known; the live line shows what will be sent (whole cages) and the estimated kg.
 */
export function CageQuantityField({ label, value, onChange, kgPerCage, disabled, required, placeholder, maxCages }: {
  label: string; value: CageQuantityValue; onChange(next: CageQuantityValue): void; kgPerCage?: number;
  disabled?: boolean; required?: boolean; placeholder?: string; maxCages?: number;
}) {
  const name = useId(), canUseKg = isUsableKgPerCage(kgPerCage);
  const unit: QuantityUnit = canUseKg ? value.unit : "cages";
  const result = resolveQuantityInput(unit, value.text, kgPerCage);
  const overMax = maxCages !== undefined && result.cages !== undefined && result.cages > maxCages;
  const shown = overMax ? `Vượt ${maxCages} lồng thương lái yêu cầu.` : result.error ?? result.preview;
  return <div>
    {canUseKg && <fieldset className="mb-1 flex items-center gap-4" disabled={disabled}><legend className="sr-only">Đơn vị nhập</legend>
      {(["cages", "kg"] as const).map((option) => <label key={option} className="flex items-center gap-1 text-sm"><input type="radio" name={name} checked={unit === option} onChange={() => onChange({ unit: option, text: "" })} />{option === "cages" ? "Lồng" : "Kg"}</label>)}</fieldset>}
    <UnitField key={unit} label={label} unit={unit === "cages" ? "lồng" : "kg"} decimals={unit === "cages" ? 0 : 3} required={required} disabled={disabled} placeholder={placeholder}
      value={value.text} onChange={(text) => onChange({ unit, text })} />
    {shown && <p className={`mt-1 text-sm ${result.error || overMax ? "text-danger" : "text-text-muted"}`} aria-live="polite">{shown}</p>}
  </div>;
}

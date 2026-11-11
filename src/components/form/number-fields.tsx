"use client";
import { useId } from "react";
import { MoneyInput, type MoneyInputProps } from "./money-input";
import { UnitInput, type UnitInputProps } from "./unit-input";

/**
 * Labelled, string-valued wrappers of MoneyInput / UnitInput for forms whose state keeps numbers as text
 * and parses them on submit (the label look matches operations/ui `Field`). The text handed to
 * `onChange` is machine format: digits for money ("300000"), "." as decimal mark for units ("0.5"),
 * "" when empty, so existing submit code keeps working unchanged.
 *
 * Usage:
 *   <MoneyField label="Số tiền đã trả" value={amount} onChange={setAmount} min={1000} autoThousands required />
 *   <UnitField label="Số lượng" unit="kg" decimals={3} value={kg} onChange={setKg} />
 */
const LABEL_CLASS = "block text-xs font-medium text-text-muted";

const toNumber = (text: string): number | null => {
  const parsed = Number(text.trim().replace(",", "."));
  return text.trim() === "" || !Number.isFinite(parsed) ? null : parsed;
};
const toText = (value: number | null) => (value === null ? "" : String(value));

type TextProps<P> = Omit<P, "value" | "onChange" | "label" | "id"> & {
  label: string;
  /** Screen-reader name when it must be more specific than the visible label (e.g. "Dòng 2: số kg"). */
  accessibleName?: string;
  value: string;
  onChange(value: string): void;
  id?: string;
};

export function MoneyField({ label, accessibleName, value, onChange, id, ...rest }: TextProps<MoneyInputProps>) {
  const fallback = useId();
  const inputId = id ?? fallback;
  return (
    <div>
      <label className={LABEL_CLASS} htmlFor={inputId}>{label}</label>
      <MoneyInput {...rest} label={accessibleName} id={inputId} value={toNumber(value)} onChange={(next) => onChange(toText(next))} />
    </div>
  );
}

export function UnitField({ label, accessibleName, value, onChange, id, ...rest }: TextProps<UnitInputProps>) {
  const fallback = useId();
  const inputId = id ?? fallback;
  return (
    <div>
      <label className={LABEL_CLASS} htmlFor={inputId}>{label}</label>
      <UnitInput {...rest} label={accessibleName} id={inputId} value={toNumber(value)} onChange={(next) => onChange(toText(next))} />
    </div>
  );
}

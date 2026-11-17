"use client";
import { useId, useState, type KeyboardEvent, type Ref } from "react";
import { formatDecimal, parseDecimalText } from "./decimal-text";
import { NUMBER_INPUT_CLASS, NumberFieldShell, useNumberInputRef } from "./number-field-parts";
import { groupNumberText, ungroupNumberText } from "./grouped-number-text";
import { useGroupedNumberEditing } from "./use-grouped-number-editing";

/**
 * Quantity / measurement field with its unit shown as a chip inside the box.
 *
 * Usage:
 *   <UnitInput id="qty" label="Số lượng" unit="kg" decimals={3} min={0} value={qty} onChange={setQty} />
 *   <UnitInput unit="lồng" step={0.5} decimals={1} value={cages} onChange={setCages} hint="Mỗi lồng 4 m3" />
 *   <UnitInput unit="%" max={100} decimals={2} value={rate} onChange={setRate} />
 * `value` / `onChange` carry a plain number (or null when empty). Display uses vi-VN ("1.250,5"); "0,5" and
 * "0.5" are both accepted. ArrowUp / ArrowDown change the value by `step`. It is a text input (inputMode
 * "decimal"), so the mouse wheel never changes the value. `decimals` (0..3) is the maximum number of
 * fraction digits; `allowFraction={false}` forces whole numbers. `className` styles the <input>.
 * Groups thousands while typing, preserving every fraction digit and the caret. Blur only drops a final comma.
 */
export type UnitInputProps = {
  value: number | null;
  onChange?(value: number | null): void;
  onBlur?(): void;
  unit: string;
  id?: string;
  name?: string;
  /** aria-label; omit when an external <label htmlFor> is used. */
  label?: string;
  decimals?: 0 | 1 | 2 | 3;
  allowFraction?: boolean;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  required?: boolean;
  invalid?: boolean;
  /** External error text; replaces the built-in min/max/format messages. */
  error?: string;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  "aria-describedby"?: string;
  ref?: Ref<HTMLInputElement>;
};

export function UnitInput({
  value, onChange, onBlur, unit, id, name, label, decimals = 0, allowFraction, step = 1, min, max, hint,
  disabled, readOnly, autoFocus, required, invalid, error, placeholder, className, wrapperClassName,
  "aria-describedby": describedByProp, ref,
}: UnitInputProps) {
  const places = allowFraction === false ? 0 : decimals;
  const negative = min !== undefined && min < 0;
  const uid = useId();
  const textOf = (next: number | null) => next == null ? "" : groupNumberText(String(next).replace(".", ","), places);
  const [text, setText] = useState(() => textOf(value));
  const [seen, setSeen] = useState(value);
  const [touched, setTouched] = useState(false);
  const [editing, setEditing] = useState(false);

  const parse = (draft: string) => parseDecimalText(ungroupNumberText(draft), places, negative, false);
  const parsed = parse(text);
  const current = parsed.kind === "ok" ? parsed.value : null;
  if (value !== seen) {
    setSeen(value);
    // Some numeric parents echo Number("") as 0. Keep the empty/unfinished draft visible.
    if (current !== value && !(editing && current === null && value === 0)) {
      setText(textOf(value));
    }
  }

  const emit = (next: string) => {
    const result = parse(next);
    onChange?.(result.kind === "ok" ? result.value : null);
  };
  const settle = () => {
    if (parsed.kind === "ok") setText(text.replace(/,$/, ""));
    else if (parsed.kind === "empty") setText("");
  };
  const stepBy = (direction: 1 | -1) => {
    const base = current ?? 0;
    const factor = 10 ** places;
    let next = Math.round((base + direction * step) * factor) / factor;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    setText(textOf(next));
    onChange?.(next);
  };

  const describe = (n: number) => `${formatDecimal(n, places)} ${unit}`;
  let problem = "";
  if (parsed.kind === "invalid") problem = places === 0 ? "Nhập số nguyên." : "Nhập một số hợp lệ, ví dụ 0,5.";
  else if (current !== null && max !== undefined && current > max) problem = `Tối đa ${describe(max)}.`;
  else if (current !== null && min !== undefined && current < min) problem = `Tối thiểu ${describe(min)}.`;
  // Too-large values are reported at once; unreadable or too-small ones after leaving the box.
  const shown = problem && (touched || (current !== null && max !== undefined && current > max));
  const message = error ?? (shown ? problem : undefined);
  const setRef = useNumberInputRef(ref, error ? "" : problem);
  const grouped = useGroupedNumberEditing(setRef, text, places, (next) => { setText(next); emit(next); });
  const notes = hint ? [{ id: `${uid}-hint`, text: hint }] : [];
  const errorId = `${uid}-error`;
  const describedBy = [describedByProp, ...notes.map((note) => note.id), message ? errorId : undefined]
    .filter(Boolean).join(" ") || undefined;

  return (
    <NumberFieldShell
      className={wrapperClassName}
      error={message}
      errorId={errorId}
      notes={notes}
      suffix={unit}
      input={
        <input
          aria-describedby={describedBy}
          aria-invalid={invalid || message ? true : undefined}
          aria-label={label}
          autoComplete="off"
          autoFocus={autoFocus}
          className={className ?? NUMBER_INPUT_CLASS}
          disabled={disabled}
          id={id}
          inputMode={places > 0 ? "decimal" : "numeric"}
          name={name}
          placeholder={placeholder}
          readOnly={readOnly}
          ref={setRef}
          required={required}
          style={{ paddingRight: `calc(${unit.length}ch + 1.75rem)` }}
          type="text"
          value={text}
          onFocus={() => { if (!readOnly) setEditing(true); }}
          onBlur={() => { setEditing(false); setTouched(true); settle(); onBlur?.(); }}
          onChange={grouped.onChange}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (readOnly || disabled) return;
            grouped.onKeyDown(event);
            if (event.defaultPrevented) return;
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              stepBy(event.key === "ArrowUp" ? 1 : -1);
            }
          }}
        />
      }
    />
  );
}

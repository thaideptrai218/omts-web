"use client";
import { useId, useState, type KeyboardEvent, type Ref } from "react";
import { liveMoneyText, formatVnd, formatVndWithSymbol, MONEY_SYMBOL, parseMoneyText } from "./money-text";
import { NUMBER_INPUT_CLASS, NumberFieldShell, useDigitCaret } from "./number-field-parts";
import { vndInWords } from "./vnd-in-words";

/**
 * Whole-dong amount field. Shows a fixed "₫" suffix inside the box, groups digits live (1.250.000)
 * and understands "300k", "300 nghìn", "2tr", "1,5 triệu", "1 tỷ" (expanded on blur / Enter).
 *
 * Usage:
 *   <MoneyInput id="paid" label="Số tiền đã trả" value={amount} onChange={setAmount} min={1000} autoThousands showWords />
 * `value` / `onChange` carry an integer VND amount or null when the box is empty. `autoThousands`
 * reads a typed 1..999 as thousands (300 -> 300.000) and says so under the field. `className`
 * styles the <input> itself (so existing table/dialog input classes keep working);
 * `wrapperClassName` styles the box around it. Pass `label` for an aria-label when no visible <label>.
 */
export type MoneyInputProps = {
  value: number | null;
  onChange?(value: number | null): void;
  onBlur?(): void;
  id?: string;
  name?: string;
  /** aria-label; omit when an external <label htmlFor> is used. */
  label?: string;
  min?: number;
  max?: number;
  autoThousands?: boolean;
  /** Caption with the amount read in Vietnamese for values from 1.000. */
  showWords?: boolean;
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

const textOf = (value: number | null) => (value == null ? "" : formatVnd(value));

export function MoneyInput({
  value, onChange, onBlur, id, name, label, min, max, autoThousands = false, showWords = false,
  disabled, readOnly, autoFocus, required, invalid, error, placeholder, className, wrapperClassName,
  "aria-describedby": describedByProp, ref,
}: MoneyInputProps) {
  const uid = useId();
  const [text, setText] = useState(() => textOf(value));
  const [seen, setSeen] = useState(value);
  const [touched, setTouched] = useState(false);

  const parsed = parseMoneyText(text, autoThousands);
  const current = parsed.kind === "ok" ? parsed.value : null;
  if (value !== seen) {
    // The parent changed the value (reset, allocation, ...): follow it unless the text already means it.
    setSeen(value);
    if (current !== value) setText(textOf(value));
  }

  const emit = (next: string) => {
    const result = parseMoneyText(next, autoThousands);
    onChange?.(result.kind === "ok" ? result.value : null);
  };
  const settle = () => {
    if (parsed.kind === "ok") setText(formatVnd(parsed.value));
    else if (parsed.kind === "empty") setText("");
  };

  let problem = "";
  if (parsed.kind === "invalid") problem = "Nhập số tiền hợp lệ, ví dụ 300.000, 300k hoặc 2tr.";
  else if (current !== null && max !== undefined && current > max) problem = `Tối đa ${formatVndWithSymbol(max)}.`;
  else if (current !== null && min !== undefined && current < min) problem = `Tối thiểu ${formatVndWithSymbol(min)}.`;
  // Too-large and unreadable text is reported at once; a too-small amount only after leaving the box.
  const shown = problem && (touched || (current !== null && max !== undefined && current > max));
  const message = error ?? (shown ? problem : undefined);
  const { setRef, keep } = useDigitCaret(ref, error ? "" : problem);

  const notes: { id: string; text: string }[] = [];
  if (!message && parsed.kind === "ok" && parsed.scaled === "auto" && parsed.value === value) {
    notes.push({ id: `${uid}-auto`, text: `Hiểu là ${formatVndWithSymbol(parsed.value)} (nghìn đồng)` });
  }
  if (!message && showWords && current !== null && current >= 1000) {
    notes.push({ id: `${uid}-words`, text: vndInWords(current) });
  }
  const errorId = `${uid}-error`;
  const describedBy = [describedByProp, ...notes.map((note) => note.id), message ? errorId : undefined]
    .filter(Boolean).join(" ") || undefined;

  return (
    <NumberFieldShell
      className={wrapperClassName}
      error={message}
      errorId={errorId}
      notes={notes}
      suffix={MONEY_SYMBOL}
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
          inputMode="numeric"
          name={name}
          placeholder={placeholder}
          readOnly={readOnly}
          ref={setRef}
          required={required}
          style={{ paddingRight: "2.5rem" }}
          type="text"
          value={text}
          onBlur={() => { setTouched(true); settle(); onBlur?.(); }}
          onChange={(event) => {
            const raw = event.target.value;
            const next = liveMoneyText(raw);
            keep(raw, event.target.selectionStart, next);
            setText(next);
            emit(next);
          }}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") settle(); }}
        />
      }
    />
  );
}

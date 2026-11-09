"use client";
import { useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import styles from "./management-screen.module.css";

const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
/** vi-VN grouping done on the text, so long values keep every digit. */
export const formatNumberText = (raw: string) => (raw.startsWith("-") ? `-${groupDigits(raw.slice(1))}` : groupDigits(raw));
const MAX_DIGITS = 15;

function parse(text: string, allowNegative: boolean) {
  const negative = allowNegative && text.trim().startsWith("-");
  const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITS);
  return { negative, digits, raw: digits ? `${negative ? "-" : ""}${digits}` : "" };
}

function PrefixedNumber({ prefix, label, value, allowNegative, onChange }: { prefix: string; label: string; value: string; allowNegative: boolean; onChange(raw: string): void }) {
  const input = useRef<HTMLInputElement>(null), caret = useRef<number | null>(null);
  const [lonelyMinus, setLonelyMinus] = useState(false);
  const shown = value === "" && lonelyMinus ? "-" : formatNumberText(value);
  useLayoutEffect(() => {
    if (caret.current === null || !input.current) return;
    // Put the caret back after the same number of digits it followed before grouping moved the text.
    let position = 0, seen = 0;
    while (position < shown.length && seen < caret.current) { if (/\d/.test(shown[position])) seen++; position++; }
    input.current.setSelectionRange(position, position);
    caret.current = null;
  }, [shown]);
  function change(event: ChangeEvent<HTMLInputElement>) {
    const { value: text, selectionStart } = event.target, parsed = parse(text, allowNegative);
    caret.current = text.slice(0, selectionStart ?? text.length).replace(/\D/g, "").length;
    setLonelyMinus(parsed.negative && !parsed.digits);
    onChange(parsed.raw);
  }
  return <label className={styles.rangeField}><span>{prefix}</span><input aria-label={label} inputMode="numeric" value={shown} onChange={change} onBlur={() => setLonelyMinus(false)} /></label>;
}

/** A from/to number filter whose "Từ"/"Đến" stay visible while typing. Values go in and out as raw digits; only the display is grouped. */
export function NumberRangeFilter({ label, from, to, allowNegative = false, onFromChange, onToChange }: {
  label: string; from: string; to: string; allowNegative?: boolean; onFromChange(raw: string): void; onToChange(raw: string): void;
}) {
  return <div className={styles.rangeFields}>
    <PrefixedNumber prefix="Từ" label={`${label} từ`} value={from} allowNegative={allowNegative} onChange={onFromChange} />
    <PrefixedNumber prefix="Đến" label={`${label} đến`} value={to} allowNegative={allowNegative} onChange={onToChange} />
  </div>;
}

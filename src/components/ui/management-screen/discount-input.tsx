"use client";
import { useState } from "react";
import styles from "./pickers.module.css";

const format = (value: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);

/**
 * A discount typed in VND or as a percent of `base`. The value kept and sent is always whole VND (half up), so the API stays
 * in money; the percent is only how it is entered. Switching mode keeps the same amount.
 */
export function DiscountInput({ label, value, base, onChange, invalid, compact }: { label: string; value: number; base: number; onChange(value: number): void; invalid?: boolean; compact?: boolean }) {
  const [mode, setMode] = useState<"vnd" | "percent">("vnd");
  const [percent, setPercent] = useState(() => (base > 0 && value ? Math.round((value / base) * 10000) / 100 : 0));
  const typePercent = (text: string) => {
    const next = Math.min(100, Number(text.replace(",", ".").replace(/[^\d.]/g, "")) || 0);
    setPercent(next); onChange(Math.round((base * next) / 100));
  };
  const switchTo = (next: "vnd" | "percent") => { if (next === "percent") setPercent(base > 0 ? Math.round((value / base) * 10000) / 100 : 0); setMode(next); };
  return <div className={`${styles.discount} ${compact ? styles.discountCompact : ""}`} data-invalid={invalid || undefined}>
    {mode === "vnd"
      ? <input aria-label={`${label} (VND)`} inputMode="numeric" value={value ? format(value) : "0"} onFocus={(event) => event.target.select()} onChange={(event) => onChange(Number(event.target.value.replace(/\D/g, "")) || 0)} />
      : <input aria-label={`${label} (%)`} inputMode="decimal" value={percent ? String(percent) : "0"} onFocus={(event) => event.target.select()} onChange={(event) => typePercent(event.target.value)} />}
    <div className={styles.unitToggle} role="radiogroup" aria-label={`Đơn vị ${label.toLowerCase()}`}>
      <button type="button" role="radio" aria-checked={mode === "vnd"} onClick={() => switchTo("vnd")}>VND</button>
      <button type="button" role="radio" aria-checked={mode === "percent"} onClick={() => switchTo("percent")}>%</button>
    </div>
    {mode === "percent" && value > 0 && !compact && <span className={styles.discountHint}>= {format(value)} đ</span>}
  </div>;
}

"use client";
import { useRef, useState } from "react";
import { InterfaceIcon } from "../interface-icon";
import { customRangeOf, lastDaysRange, monthRange, quarterRange, recentWeeks, yearRange, type PeriodRange } from "./period-range-model";
import { CustomCalendar, Popover } from "./time-range-filter";
import styles from "./time-range-filter.module.css";

type Step = "root" | "week" | "month" | "quarter" | "year" | "custom";
const GROUPS: readonly (readonly [Exclude<Step, "root" | "custom">, string])[] = [["week", "Theo tuần"], ["month", "Theo tháng"], ["quarter", "Theo quý"], ["year", "Theo năm"]];
const YEARS = 8;

/**
 * The KiotViet-style range picker as one button: "Trong 7 ngày qua", "Trong 30 ngày qua", then Theo tuần / tháng / quý / năm, each opening a small
 * picker of its own, and "Tùy chỉnh" for the two-month calendar. The chosen range never reaches past `today` (local date, `yyyy-mm-dd`).
 */
export function PeriodRangeMenu({ label, value, today, onChange }: { label: string; value: PeriodRange; today: string; onChange(value: PeriodRange): void }) {
  const button = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState<Step>();
  const [year, setYear] = useState(() => Number(value.to.slice(0, 4)));
  const thisYear = Number(today.slice(0, 4));
  const close = (returnFocus: boolean) => { if (returnFocus) button.current?.focus(); setStep(undefined); };
  const pick = (range: PeriodRange | undefined) => { if (!range) return; onChange(range); close(true); };
  const option = (range: PeriodRange | undefined, text: string, active = false) =>
    <button key={text} type="button" className={styles.gridButton} aria-pressed={active} disabled={!range} onClick={() => pick(range)}>{text}</button>;
  const yearNav = <div className={styles.yearNav}>
    <button type="button" aria-label="Năm trước" disabled={year <= thisYear - YEARS + 1} onClick={() => setYear(year - 1)}><InterfaceIcon name="chevron-left" /></button>
    <strong>{year}</strong>
    <button type="button" aria-label="Năm sau" disabled={year >= thisYear} onClick={() => setYear(year + 1)}><InterfaceIcon name="chevron-right" /></button>
  </div>;
  return <>
    <button ref={button} type="button" className={`${styles.input} ${styles.menuButton}`} aria-haspopup="dialog" aria-expanded={!!step} aria-label={`${label}: ${value.label}`} onClick={() => setStep(step ? undefined : "root")}>
      <span>{value.label}</span><InterfaceIcon name="calendar" />
    </button>
    {step && <Popover anchor={button} label={label} placement="below" onClose={close}>
      {step === "custom" ? <CustomCalendar value={{ kind: "custom", from: value.from, to: value.to }} max={today} onCancel={() => close(true)} onApply={(from, to) => pick(customRangeOf(from, to))} />
        : step === "root" ? <div className={styles.menuList}>
          {[7, 30].map(days => { const range = lastDaysRange(days, today); return <button key={days} type="button" className={styles.menuRow} aria-pressed={value.label === range.label} onClick={() => pick(range)}>{range.label}</button>; })}
          {GROUPS.map(([next, text]) => <button key={next} type="button" className={styles.menuRow} onClick={() => setStep(next)}>{text}<InterfaceIcon name="chevron-right" /></button>)}
          <button type="button" className={styles.menuRow} onClick={() => setStep("custom")}>Tùy chỉnh</button>
        </div>
        : <div className={styles.subMenu}>
          <button type="button" className={styles.back} onClick={() => setStep("root")}><InterfaceIcon name="chevron-left" />{GROUPS.find(([key]) => key === step)![1]}</button>
          {step === "week" && <div className={styles.weekList}>{recentWeeks(today).map(range => option(range, range.label, value.label === range.label))}</div>}
          {step === "month" && <>{yearNav}<div className={styles.grid}>{Array.from({ length: 12 }, (_, index) => { const range = monthRange(year, index + 1, today); return option(range, `Tháng ${index + 1}`, !!range && value.label === range.label); })}</div></>}
          {step === "quarter" && <>{yearNav}<div className={styles.grid}>{[1, 2, 3, 4].map(quarter => { const range = quarterRange(year, quarter, today); return option(range, `Quý ${quarter}`, !!range && value.label === range.label); })}</div></>}
          {step === "year" && <div className={styles.grid}>{Array.from({ length: YEARS }, (_, index) => thisYear - index).map(item => { const range = yearRange(item, today); return option(range, String(item), !!range && value.label === range.label); })}</div>}
        </div>}
    </Popover>}
  </>;
}

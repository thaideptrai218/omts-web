"use client";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { vi } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { InterfaceIcon } from "../interface-icon";
import { fromQueryDate, toDisplayDate, toQueryDate } from "./time-range-model";
import { Popover } from "./time-range-filter";
import screenStyles from "./management-screen.module.css";
import styles from "./time-range-filter.module.css";

const pad = (value: number) => String(value).padStart(2, "0");
const nowTime = () => { const now = new Date(); return `${pad(now.getHours())}:${pad(now.getMinutes())}`; };

/**
 * One date picked from the same calendar as the time filter. The value is `yyyy-mm-dd`, or `yyyy-mm-ddTHH:mm` with
 * `withTime` (local wall time of the cooperative).
 */
export function DatePickerField({ label, value, max, disabled, withTime, className, name, invalid, describedBy, onChange }: { label: string; value: string; max?: string; disabled?: boolean; withTime?: boolean; className?: string; name?: string; invalid?: boolean; describedBy?: string; onChange(value: string): void }) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [datePart, timePart = ""] = value.split("T");
  const selected = datePart ? fromQueryDate(datePart) : undefined, limit = max ? fromQueryDate(max.slice(0, 10)) : undefined;
  const [month, setMonth] = useState(() => selected ?? new Date());
  const [time, setTime] = useState(timePart.slice(0, 5) || nowTime());
  const close = (returnFocus: boolean) => { setOpen(false); if (returnFocus) anchor.current?.focus(); };
  const emit = (day: string, clock = time) => onChange(withTime ? `${day}T${clock}` : day);
  const pick = (day: Date) => { emit(toQueryDate(day)); if (!withTime) close(true); };
  const today = new Date(), todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const shown = datePart ? `${toDisplayDate(datePart)}${withTime && timePart ? ` ${timePart.slice(0, 5)}` : ""}` : withTime ? "dd/mm/yyyy hh:mm" : "dd/mm/yyyy";
  return <>
    <button ref={anchor} type="button" name={name} data-invalid={invalid || undefined} aria-describedby={describedBy} className={`${styles.input} ${className ?? ""}`} aria-label={`${label}: ${datePart ? shown : "chưa chọn"}`} aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)}>
      <span>{shown}</span><InterfaceIcon name="calendar" />
    </button>
    {open && <Popover anchor={anchor} label={label} placement="below" onClose={close}>
      <div className={styles.calendar}>
        <div className={styles.dateTime}>
        <DayPicker mode="single" navLayout="around" locale={vi} weekStartsOn={1} month={month} onMonthChange={setMonth} selected={selected} fixedWeeks
          disabled={limit ? { after: limit } : undefined} onSelect={(day) => { if (day) pick(day); }} />
        {withTime && <TimeColumns value={time} onChange={(clock) => { setTime(clock); if (datePart) emit(datePart, clock); }} />}
        </div>
        <footer className={styles.calendarFooter}>
          <button type="button" className={screenStyles.linkButton} disabled={!!limit && todayDay > limit} onClick={() => { const clock = nowTime(); setTime(clock); emit(toQueryDate(todayDay), clock); if (!withTime) close(true); }}>{withTime ? "Bây giờ" : "Hôm nay"}</button>
          <button type="button" className={withTime ? styles.primary : styles.secondary} onClick={() => close(true)}>{withTime ? "Xong" : "Đóng"}</button>
        </footer>
      </div>
    </Popover>}
  </>;
}

/**
 * The same calendar as the picker popup, shown inline. Use it in SHORT dialogs: a popup is positioned inside its dialog and is
 * clipped by the dialog box when the dialog is lower than the calendar.
 */
export function DateCalendar({ value, max, disabled, onChange }: { value: string; max?: string; disabled?: boolean; onChange(day: string): void }) {
  const selected = value ? fromQueryDate(value.slice(0, 10)) : undefined, limit = max ? fromQueryDate(max.slice(0, 10)) : undefined;
  const [month, setMonth] = useState(() => selected ?? new Date());
  const today = new Date(), todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return <div className={`${screenStyles.theme} ${styles.calendar} ${styles.inlineCalendar}`}>
    <DayPicker mode="single" navLayout="around" locale={vi} weekStartsOn={1} month={month} onMonthChange={setMonth} selected={selected} fixedWeeks
      disabled={disabled ? true : limit ? { after: limit } : undefined} onSelect={(day) => { if (day) onChange(toQueryDate(day)); }} />
    <footer className={styles.calendarFooter}>
      <button type="button" className={screenStyles.linkButton} disabled={disabled || (!!limit && todayDay > limit)} onClick={() => { setMonth(todayDay); onChange(toQueryDate(todayDay)); }}>Hôm nay</button>
    </footer>
  </div>;
}

const hours = Array.from({ length: 24 }, (_, value) => pad(value)), minutes = Array.from({ length: 60 }, (_, value) => pad(value));

/** Hour and minute columns: click to pick, the chosen value stays in view; arrow keys move within a column. */
function TimeColumns({ value, onChange }: { value: string; onChange(value: string): void }) {
  const [hour = "00", minute = "00"] = value.split(":");
  const column = (label: string, options: readonly string[], current: string, apply: (next: string) => string) => <Column key={label} label={label} options={options} current={current} onPick={(next) => onChange(apply(next))} />;
  return <div className={styles.timeColumns}>
    <p className={styles.timeHead}><InterfaceIcon name="calendar" />Giờ <strong>{hour}:{minute}</strong></p>
    <div className={styles.timeLists}>
      {column("Giờ", hours, hour, (next) => `${next}:${minute}`)}
      {column("Phút", minutes, minute, (next) => `${hour}:${next}`)}
    </div>
  </div>;
}

function Column({ label, options, current, onPick }: { label: string; options: readonly string[]; current: string; onPick(value: string): void }) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { list.current?.querySelector<HTMLElement>("[aria-selected=true]")?.scrollIntoView({ block: "center" }); }, [current]);
  const move = (delta: number) => { const index = options.indexOf(current); onPick(options[(index + delta + options.length) % options.length]); };
  return <div ref={list} role="listbox" aria-label={label} tabIndex={0} className={styles.timeList}
    onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); move(1); } else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); } }}>
    {options.map((option) => <button key={option} type="button" role="option" tabIndex={-1} aria-selected={option === current} onClick={() => onPick(option)}>{option}</button>)}
  </div>;
}

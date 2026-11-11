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
export function DatePickerField({ label, value, min, max, disabled, withTime, inlineCalendar = false, allowClear = false, className, name, invalid, describedBy, onChange }: { label: string; value: string; min?: string; max?: string; disabled?: boolean; withTime?: boolean; inlineCalendar?: boolean; allowClear?: boolean; className?: string; name?: string; invalid?: boolean; describedBy?: string; onChange(value: string): void }) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [datePart, timePart = ""] = value.split("T");
  const selected = datePart ? fromQueryDate(datePart) : undefined, limit = max ? fromQueryDate(max.slice(0, 10)) : undefined;
  const earliest = min ? fromQueryDate(min.slice(0, 10)) : undefined;
  // A birth date starts near 30 years ago; any picker whose limits span more than a year (or have no lower limit) gets year and month dropdowns.
  const birthday = name === "birthday" || /ngày sinh/i.test(label);
  const spanMonths = earliest && limit ? (limit.getFullYear() - earliest.getFullYear()) * 12 + limit.getMonth() - earliest.getMonth() : Infinity;
  const dropdowns = spanMonths > 12, firstMonth = earliest ?? new Date(1940, 0, 1), lastMonth = limit ?? new Date(new Date().getFullYear() + 5, 11, 1);
  const [month, setMonth] = useState(() => selected ?? (birthday ? new Date(new Date().getFullYear() - 30, 0, 1) : new Date()));
  const [timeDraft, setTime] = useState(timePart.slice(0, 5) || nowTime());
  const time = timePart.slice(0, 5) || timeDraft;
  const close = (returnFocus: boolean) => { setOpen(false); if (returnFocus) anchor.current?.focus(); };
  const emit = (day: string, clock = time) => onChange(withTime ? `${day}T${clock}` : day);
  const pick = (day: Date) => { emit(toQueryDate(day)); if (!withTime) close(true); };
  const today = new Date(), todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const shown = datePart ? `${toDisplayDate(datePart)}${withTime && timePart ? ` ${timePart.slice(0, 5)}` : ""}` : withTime ? "dd/mm/yyyy hh:mm" : "dd/mm/yyyy";
  return <>
    <button ref={anchor} type="button" name={name} data-invalid={invalid || undefined} aria-describedby={describedBy} className={`${styles.input} ${className ?? ""}`} aria-label={`${label}: ${datePart ? shown : "chưa chọn"}`} aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)}>
      <span>{shown}</span><InterfaceIcon name="calendar" />
    </button>
    {open && <CalendarSurface inline={inlineCalendar} anchor={anchor} label={label} onClose={close}>
      <div className={styles.calendar}>
        <div className={styles.dateTime}>
        <DayPicker mode="single" navLayout="around" {...(dropdowns ? { captionLayout: "dropdown" as const, startMonth: firstMonth, endMonth: lastMonth } : {})} locale={vi} weekStartsOn={1} month={month} onMonthChange={setMonth} selected={selected} fixedWeeks
          disabled={[...(limit ? [{ after: limit }] : []), ...(earliest ? [{ before: earliest }] : [])]} onSelect={(day) => { if (day) pick(day); }} />
        {withTime && <TimeColumns value={time} onChange={(clock) => { setTime(clock); if (datePart) emit(datePart, clock); }} />}
        </div>
        <footer className={styles.calendarFooter}>
          {allowClear && <button key="clear" type="button" className={screenStyles.linkButton} disabled={!value} onClick={() => { onChange(""); close(true); }}>Xóa ngày</button>}
          <button type="button" className={screenStyles.linkButton} disabled={!!limit && todayDay > limit || !!earliest && todayDay < earliest} onClick={() => { const clock = nowTime(); setTime(clock); emit(toQueryDate(todayDay), clock); if (!withTime) close(true); }}>{withTime ? "Bây giờ" : "Hôm nay"}</button>
          <button type="button" className={withTime ? styles.primary : styles.secondary} onClick={() => close(true)}>{withTime ? "Xong" : "Đóng"}</button>
        </footer>
      </div>
    </CalendarSurface>}
  </>;
}

/** Inline calendars expand the form's scroll area instead of escaping a modal's viewport. Existing callers retain the popover. */
function CalendarSurface({ inline, children, ...props }: React.ComponentProps<typeof Popover> & { inline: boolean }) {
  return inline ? <div role="group" aria-label={props.label} className={`${screenStyles.theme} mt-2 max-w-full overflow-x-auto`} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); props.onClose(true); } }}>{children}</div>
    : <Popover {...props} placement="below">{children}</Popover>;
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

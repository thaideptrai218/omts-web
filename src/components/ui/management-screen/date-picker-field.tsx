"use client";
import { useId, useRef, useState } from "react";
import { DayPicker, type DropdownProps } from "react-day-picker";
import { vi } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { InterfaceIcon } from "../interface-icon";
import { SelectBox } from "../select-box";
import { maskDateInput, parseDateInput } from "./date-picker-input-model";
import { fromQueryDate, toDisplayDate, toQueryDate } from "./time-range-model";
import { Popover } from "./time-range-filter";
import screenStyles from "./management-screen.module.css";
import styles from "./date-picker-field.module.css";

const pad = (value: number) => String(value).padStart(2, "0");
const nowTime = () => { const now = new Date(); return `${pad(now.getHours())}:${pad(now.getMinutes())}`; };
const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function CalendarDropdown(props: DropdownProps) {
  const { options } = props;
  return <SelectBox aria-label={props["aria-label"]} value={props.value} onChange={props.onChange} disabled={props.disabled} name={props.name} className="omts-control">{options?.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</SelectBox>;
}

type Props = { label: string; value: string; min?: string; max?: string; disabled?: boolean; withTime?: boolean; allowClear?: boolean; className?: string; name?: string; invalid?: boolean; describedBy?: string; onChange(value: string): void };

/** A typed local date and a top-layer calendar share the same validated yyyy-mm-dd value. */
export function DatePickerField({ label, value, min, max, disabled, withTime, allowClear = false, className, name, invalid, describedBy, onChange }: Props) {
  const anchor = useRef<HTMLSpanElement>(null), input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [open, setOpen] = useState(false);
  const [datePart, timePart = ""] = value.split("T");
  const selected = datePart ? fromQueryDate(datePart) : undefined;
  const earliest = min ? fromQueryDate(min.slice(0, 10)) : undefined, latest = max ? fromQueryDate(max.slice(0, 10)) : undefined;
  const firstMonth = earliest ?? new Date(1940, 0, 1), lastMonth = latest ?? new Date(new Date().getFullYear() + 5, 11, 31);
  const birthday = name === "birthday" || /ngày sinh/i.test(label);
  const [month, setMonth] = useState(() => selected ?? (birthday ? new Date(new Date().getFullYear() - 30, 0, 1) : new Date()));
  const [timeDraft, setTime] = useState(timePart.slice(0, 5) || nowTime());
  const [draft, setDraft] = useState<{ source: string; text: string; error?: string }>();
  const text = draft?.source === value ? draft.text : datePart ? toDisplayDate(datePart) : "";
  const error = draft?.source === value ? draft.error : undefined;
  const time = timePart.slice(0, 5) || timeDraft;
  const close = (returnFocus: boolean) => { setOpen(false); if (returnFocus) input.current?.focus(); };
  const emit = (day: string, clock = time) => { input.current?.setCustomValidity(""); setDraft(undefined); onChange(withTime ? `${day}T${clock}` : day); };
  const pick = (day: Date) => { emit(toQueryDate(day)); if (!withTime) close(true); };
  const today = new Date(), todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  function typeDate(raw: string) {
    const masked = maskDateInput(raw), parsed = parseDateInput(masked, min, max);
    input.current?.setCustomValidity(!masked && allowClear ? "" : parsed.error ?? "");
    setDraft({ source: value, text: masked, error: masked.length === 10 ? parsed.error : undefined });
    if (parsed.value) { emit(parsed.value); setMonth(fromQueryDate(parsed.value)); }
    else if (!masked && allowClear) { setDraft(undefined); onChange(""); }
  }
  function validate() {
    if (!text && allowClear) { input.current?.setCustomValidity(""); return; }
    const parsed = parseDateInput(text, min, max);
    setDraft({ source: value, text, error: parsed.error });
    input.current?.setCustomValidity(parsed.error ?? "");
  }
  return <span className={styles.field}>
    {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
    <span ref={anchor} className={`${styles.control} ${className ?? ""}`} data-invalid={invalid || !!error || undefined}>
      <input ref={input} type="text" value={text} inputMode="numeric" maxLength={10} placeholder="dd/mm/yyyy" aria-label={label} disabled={disabled} aria-invalid={invalid || !!error || undefined} aria-describedby={[describedBy, error ? errorId : ""].filter(Boolean).join(" ") || undefined}
        onChange={event => { event.currentTarget.setCustomValidity(""); typeDate(event.target.value); }} onBlur={validate}
        onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }} />
      {withTime && timePart && <span className={styles.timeValue}>{timePart.slice(0, 5)}</span>}
      <button type="button" aria-label={`${label}: ${datePart ? `${toDisplayDate(datePart)}${withTime && timePart ? ` ${timePart.slice(0, 5)}` : ""}` : "chưa chọn"}`} aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={() => { setMonth(selected ?? month); setOpen(current => !current); }}><InterfaceIcon name="calendar" /></button>
    </span>
    {error && <span id={errorId} className={styles.error} role="alert">{error}</span>}
    {open && <Popover anchor={anchor} label={label} onClose={close} placement="below">
      <div className={styles.calendar}>
        <DayPicker mode="single" navLayout="around" captionLayout="dropdown" startMonth={firstMonth} endMonth={lastMonth} locale={vi} weekStartsOn={1} month={month} onMonthChange={setMonth} selected={selected} fixedWeeks autoFocus
          components={{ Dropdown: CalendarDropdown }} formatters={{ formatWeekdayName: day => weekdays[day.getDay()], formatMonthDropdown: day => `Tháng ${day.getMonth() + 1}` }}
          labels={{ labelMonthDropdown: () => "Tháng", labelYearDropdown: () => "Năm", labelPrevious: () => "Tháng trước", labelNext: () => "Tháng sau" }}
          disabled={[...(latest ? [{ after: latest }] : []), ...(earliest ? [{ before: earliest }] : [])]} onSelect={day => { if (day) pick(day); }} />
        {withTime && <div className={styles.timePicker}><span>Thời gian</span><label>Giờ<SelectBox aria-label="Giờ" className="omts-control" value={time.split(":")[0]} onChange={event => { const clock = `${event.target.value}:${time.split(":")[1]}`; setTime(clock); if (datePart) emit(datePart, clock); }}>{Array.from({ length: 24 }, (_, index) => <option key={index} value={pad(index)}>{pad(index)}</option>)}</SelectBox></label><b>:</b><label>Phút<SelectBox aria-label="Phút" className="omts-control" value={time.split(":")[1]} onChange={event => { const clock = `${time.split(":")[0]}:${event.target.value}`; setTime(clock); if (datePart) emit(datePart, clock); }}>{Array.from({ length: 60 }, (_, index) => <option key={index} value={pad(index)}>{pad(index)}</option>)}</SelectBox></label></div>}
        <footer className={styles.footer}>
          <button type="button" className={screenStyles.linkButton} disabled={!!latest && todayDay > latest || !!earliest && todayDay < earliest} onClick={() => { setMonth(todayDay); emit(toQueryDate(todayDay)); if (!withTime) close(true); }}>Hôm nay</button>
          {allowClear && <button type="button" className={screenStyles.linkButton} disabled={!value} onClick={() => { input.current?.setCustomValidity(""); setDraft(undefined); onChange(""); close(true); }}>Xóa</button>}
          <button type="button" className={styles.close} onClick={() => close(true)}>Đóng</button>
        </footer>
      </div>
    </Popover>}
  </span>;
}

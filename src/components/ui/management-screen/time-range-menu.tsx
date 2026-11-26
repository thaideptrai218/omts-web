"use client";
import { useRef, useState } from "react";
import { InterfaceIcon } from "../interface-icon";
import { CustomCalendar, Popover } from "./time-range-filter";
import { presetValue, timePresetGroups, timePresetLabel, toDisplayDate, type TimePreset, type TimeRangeValue } from "./time-range-model";
import styles from "./time-range-filter.module.css";

/**
 * The time filter as one button for a toolbar: it shows the chosen mốc (or the custom dates) and opens the quick presets with
 * "Tùy chỉnh", which switches to the two-month range calendar. `presets` limits the offered mốc; `allLabel` renames "Toàn thời gian"
 * when the screen reads a default window for it.
 */
export function TimeRangeMenu({ label, value, onChange, presets, allLabel }: { label: string; value: TimeRangeValue; onChange(value: TimeRangeValue): void; presets?: readonly TimePreset[]; allLabel?: string }) {
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<"preset" | "custom">();
  const nameOf = (preset: TimePreset) => preset === "all" && allLabel ? allLabel : timePresetLabel(preset);
  const text = value.kind === "custom" ? `${toDisplayDate(value.from)} - ${toDisplayDate(value.to)}` : nameOf(value.preset);
  const close = (returnFocus: boolean) => { if (returnFocus) button.current?.focus(); setOpen(undefined); };
  const groups = timePresetGroups.map(group => ({ ...group, presets: group.presets.filter(([preset]) => !presets || presets.includes(preset)) })).filter(group => group.presets.length);
  return <>
    <button ref={button} type="button" className={`${styles.input} ${styles.menuButton}`} aria-haspopup="dialog" aria-expanded={!!open} aria-label={`${label}: ${text}`} onClick={() => setOpen(open ? undefined : "preset")}>
      <span>{text}</span><InterfaceIcon name="calendar" />
    </button>
    {open && <Popover anchor={button} label={label} placement="below" onClose={close}>
      {open === "preset"
        ? <div className={styles.menu}>
          <div className={styles.menuPresets}>{groups.map(group => <section key={group.label}>
            <h4>{group.label}</h4>
            {group.presets.map(([preset]) => <button key={preset} type="button" className={styles.preset} aria-pressed={value.kind === "preset" && value.preset === preset} onClick={() => { onChange(presetValue(preset)); close(true); }}>{nameOf(preset)}</button>)}
          </section>)}</div>
          <button type="button" className={styles.secondary} onClick={() => setOpen("custom")}>Tùy chỉnh</button>
        </div>
        : <CustomCalendar value={value} onCancel={() => close(true)} onApply={(from, to) => { onChange({ kind: "custom", from, to }); close(true); }} />}
    </Popover>}
  </>;
}

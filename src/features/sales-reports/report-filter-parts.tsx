"use client";
import { useState } from "react";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { Select } from "@/features/operations/ui";
import { FRAME_EMPTY_TEXT } from "./frame-parts";
import s from "./report-frame.module.css";

export type FilterOption = Readonly<{ value: string; label: string }>;

/** Radio group with local state only; selection never triggers a request. */
export function RadioFilter({ legend, name, options, value, onChange }: Readonly<{
  legend: string; name: string; options: readonly FilterOption[]; value: string; onChange(value: string): void;
}>) {
  return (
    <fieldset className={s.group}>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={s.check}>
          <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

/** Period selector: the shared time filter (quick presets or a custom range), local state only; the default is the current month. */
export function PeriodFilter() {
  const [time, setTime] = useState<TimeRangeValue>(() => presetValue("thisMonth"));
  return <TimeRangeFilter legend="Thời gian" value={time} onChange={setTime} />;
}

/** Checklist whose options come from the backend (zones, products); none are available without a data source. */
export function ChecklistFilter({ legend }: Readonly<{ legend: string }>) {
  return (
    <fieldset className={s.group}>
      <legend>{legend}</legend>
      <p className={s.muted}>{FRAME_EMPTY_TEXT}</p>
    </fieldset>
  );
}

/** Single-select "all" filter (customer, product); options come from the backend, so it stays disabled. */
export function AllOptionSelect({ label, allLabel }: Readonly<{ label: string; allLabel: string }>) {
  return <Select label={label} defaultValue="" disabled><option value="">{allLabel}</option></Select>;
}

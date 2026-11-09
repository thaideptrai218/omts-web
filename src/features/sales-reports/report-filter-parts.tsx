"use client";
import { useState } from "react";
import { Field, Select } from "@/features/operations/ui";
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

const PERIOD_OPTIONS: readonly FilterOption[] = [
  { value: "this-month", label: "Tháng này" },
  { value: "last-month", label: "Tháng trước" },
  { value: "custom", label: "Tùy chỉnh" },
];

/** Period selector: preset months or a custom date range (local state only). */
export function PeriodFilter({ name }: Readonly<{ name: string }>) {
  const [preset, setPreset] = useState("this-month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return (
    <>
      <RadioFilter legend="Thời gian" name={name} options={PERIOD_OPTIONS} value={preset} onChange={setPreset} />
      {preset === "custom" && (
        <div className={s.group}>
          <Field type="date" label="Từ ngày" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
          <Field type="date" label="Đến ngày" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
        </div>
      )}
    </>
  );
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

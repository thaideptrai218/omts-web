"use client";

import { useId, useState, type ChangeEvent, type ComponentProps } from "react";
import { DatePickerField } from "./date-picker-field";

/** Field-compatible adapter: display text is Vietnamese; successful form values remain ISO. */
export function DateInputField({ label, ref, ...props }: ComponentProps<"input"> & { label: string }) {
  const generatedId = useId();
  const [local, setLocal] = useState(String(props.defaultValue ?? ""));
  const value = props.value === undefined ? local : String(props.value ?? "");
  const id = props.id ?? generatedId;
  return <div className="block text-xs font-medium text-text-muted">
    <label htmlFor={id}>{label}</label>
    <DatePickerField id={id} inputRef={ref} label={label} value={value}
      name={props.name} required={props.required} readOnly={props.readOnly}
      min={props.min == null ? undefined : String(props.min)} max={props.max == null ? undefined : String(props.max)}
      disabled={props.disabled} withTime={props.type === "datetime-local"} allowClear={!props.required}
      invalid={props["aria-invalid"] === true || props["aria-invalid"] === "true" || props["aria-invalid"] === "grammar" || props["aria-invalid"] === "spelling"}
      describedBy={props["aria-describedby"]} className="mt-1" onBlur={props.onBlur} onFocus={props.onFocus} onInvalid={props.onInvalid}
      onChange={next => {
        setLocal(next);
        const target = { value: next, name: props.name ?? "", id, type: props.type };
        props.onChange?.({ target, currentTarget: target } as ChangeEvent<HTMLInputElement>);
      }} />
  </div>;
}

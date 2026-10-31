"use client";

import {
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type InputHTMLAttributes,
  type Ref,
} from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { VietnameseDateChooser } from "./vietnamese-date-chooser";
import {
  formatVietnameseDate,
  parseVietnameseDateInput,
} from "@/shared/format/date-only";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "value" | "min" | "max"
> & {
  value: string;
  min?: string;
  max?: string;
  inputRef?: Ref<HTMLInputElement>;
  calendarLabel?: string;
  onValueChange(value: string): void;
};

export function VietnameseDateInput({
  value,
  onValueChange,
  inputRef,
  min,
  max,
  calendarLabel = "Chọn ngày",
  className = "",
  disabled,
  ...props
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useImperativeHandle(inputRef, () => ref.current!, []);
  const boundsId = useId();
  const bounds = [
    min ? `Từ ${formatVietnameseDate(min)}.` : "",
    max ? `Không sau ${formatVietnameseDate(max)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="min-w-0">
      <div className="relative">
        <input
          {...props}
          ref={ref}
          className={`${className} pr-12`}
          disabled={disabled}
          type="text"
          inputMode="numeric"
          aria-describedby={
            [props["aria-describedby"], bounds ? boundsId : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
          placeholder="ngày/tháng/năm"
          value={formatVietnameseDate(value)}
          onChange={(event) =>
            onValueChange(parseVietnameseDateInput(event.target.value))
          }
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={calendarLabel}
          onClick={() => setOpen(true)}
          className="absolute inset-y-0 right-0 grid min-h-11 w-11 place-items-center rounded-control text-primary hover:bg-primary-soft active:bg-primary-soft disabled:opacity-50"
        >
          <InterfaceIcon name="calendar" />
        </button>
      </div>
      {bounds && (
        <p id={boundsId} className="mt-1 text-xs leading-5 text-text-muted">
          {bounds}
        </p>
      )}
      {open && (
        <VietnameseDateChooser
          value={value}
          min={min}
          max={max}
          title={calendarLabel}
          onClose={() => setOpen(false)}
          onChoose={(date) => {
            onValueChange(date);
            setOpen(false);
            requestAnimationFrame(() => ref.current?.focus());
          }}
        />
      )}
    </div>
  );
}

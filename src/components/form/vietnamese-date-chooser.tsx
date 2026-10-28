"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  formatVietnameseDate,
  isDateOnly,
  vietnameseBusinessDate,
} from "@/shared/format/date-only";

type Props = Readonly<{
  value: string;
  min?: string;
  max?: string;
  title: string;
  onChoose(value: string): void;
  onClose(): void;
}>;
const fieldStyle =
  "mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 text-text";

export function VietnameseDateChooser({
  value,
  min,
  max,
  title,
  onChoose,
  onClose,
}: Props) {
  const id = useId();
  const today = vietnameseBusinessDate();
  const initial = isDateOnly(value)
    ? value
    : min && today < min
      ? min
      : max && today > max
        ? max
        : today;
  const [year, setYear] = useState(initial.slice(0, 4));
  const [month, setMonth] = useState(initial.slice(5, 7));
  const [day, setDay] = useState(initial.slice(8, 10));
  const [error, setError] = useState("");
  function choose() {
    const date = `${year}-${month}-${day}`;
    if (!isDateOnly(date)) {
      setError("Ngày không hợp lệ. Kiểm tra lại ngày, tháng và năm.");
      return;
    }
    if (min && date < min) {
      setError(`Chọn ngày từ ${formatVietnameseDate(min)} trở đi.`);
      return;
    }
    if (max && date > max) {
      setError(`Chọn ngày không sau ${formatVietnameseDate(max)}.`);
      return;
    }
    onChoose(date);
  }
  return (
    <Dialog
      open
      mobileLayout="compact"
      title={title}
      description="Chọn ngày, tháng và năm theo lịch."
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <div
        className="space-y-5"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            choose();
          }
        }}
      >
        <div className="grid grid-cols-3 gap-3">
          <label htmlFor={`${id}-day`} className="text-sm font-semibold">
            Ngày
            <select
              id={`${id}-day`}
              value={day}
              onChange={(event) => setDay(event.target.value)}
              className={fieldStyle}
            >
              {Array.from({ length: 31 }, (_, i) =>
                String(i + 1).padStart(2, "0"),
              ).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={`${id}-month`} className="text-sm font-semibold">
            Tháng
            <select
              id={`${id}-month`}
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className={fieldStyle}
            >
              {Array.from({ length: 12 }, (_, i) =>
                String(i + 1).padStart(2, "0"),
              ).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={`${id}-year`} className="text-sm font-semibold">
            Năm
            <input
              id={`${id}-year`}
              value={year}
              inputMode="numeric"
              onChange={(event) => setYear(event.target.value)}
              className={fieldStyle}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={choose}>Chọn ngày</Button>
        </div>
      </div>
    </Dialog>
  );
}

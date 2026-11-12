"use client";
import { useId, useState, type FormEvent } from "react";
import { MoneyInput } from "@/components/form/money-input";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { Note, businessToday } from "@/features/operations/ui";
import { rateDateError, validateRate, type Job, type RateFieldErrors } from "./job-types-model";
import { JobTypeWriteFeedback, useJobTypeWrite } from "./job-types-write";
import styles from "./job-types-screen.module.css";

/** Adding a rate creates a new effective-date version, never edits a history row. */
export function JobTypeRateEditor({ record, onSynced, onClose }: { record: Job; onSynced(job: Job): void; onClose(): void }) {
  const [rate, setRate] = useState<number | null>(null), [date, setDate] = useState(businessToday()), [note, setNote] = useState("");
  const [errors, setErrors] = useState<RateFieldErrors>();
  const write = useJobTypeWrite(record, onSynced), { mutation } = write, id = useId(), busy = mutation.pending || mutation.blocked;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const checked = validateRate(rate === null ? "" : String(rate), date), dateError = rateDateError(record, date);
    if (!checked.ok || dateError) { setErrors({ ...(checked.ok ? {} : checked.errors), ...(dateError ? { effectiveFrom: dateError } : {}) }); return; }
    setErrors(undefined);
    if (await write.write("rate", { ...checked.value, ...(note.trim() ? { note: note.trim() } : {}) })) onClose();
  }
  return <form noValidate aria-label="Đổi đơn giá" onSubmit={event => void save(event)}>
    <fieldset disabled={busy} className="grid min-w-0 gap-3 sm:grid-cols-2">
      <div><label htmlFor={id} className="text-xs font-medium text-text-muted">Đơn giá mới (₫/giờ) *</label>
        <div className="flex items-center gap-2"><MoneyInput id={id} label="Đơn giá mới (đồng/giờ)" required autoThousands min={1} max={999999999} value={rate} invalid={!!errors?.hourlyRate} autoFocus onChange={setRate} wrapperClassName="min-w-0 flex-1" /><span className="shrink-0 text-xs">/giờ</span></div>
        {errors?.hourlyRate && <p role="alert" className={styles.fieldError}>{errors.hourlyRate}</p>}</div>
      <div><p className="mb-1 text-xs font-medium text-text-muted">Ngày bắt đầu hiệu lực *</p>
        <DatePickerField label="Ngày bắt đầu hiệu lực" value={date} disabled={busy} inlineCalendar invalid={!!errors?.effectiveFrom} onChange={setDate} />
        {errors?.effectiveFrom && <p role="alert" className={styles.fieldError}>{errors.effectiveFrom}</p>}</div>
      <div className="sm:col-span-2"><Note label="Ghi chú" maxLength={500} value={note} onChange={event => setNote(event.target.value)} /></div>
    </fieldset>
    <JobTypeWriteFeedback write={write} />
    <footer className={styles.tabFooter}><div /><div><Button key="cancel-rate" className="w-auto" type="button" variant="secondary" disabled={mutation.pending} onClick={onClose}>Bỏ qua</Button>
      <Button key="save-rate" className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Lưu</Button></div></footer>
  </form>;
}

"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Field, businessToday } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { jobType } from "./contracts";
import { validateNewJob, type Job, type RateFieldErrors } from "./job-types-model";
import { jobTypesRepository } from "./job-types-write";
import styles from "./job-types-screen.module.css";

/** Creating a job type stays a dialog: name, first hourly rate and its effective date, confirmed before it is sent. */
export function JobTypeCreateDialog({ onClose, onCreated }: { onClose(): void; onCreated(job: Job): void }) {
  const [name, setName] = useState(""), [rate, setRate] = useState(""), [date, setDate] = useState(businessToday()), [errors, setErrors] = useState<RateFieldErrors>();
  const editor = useOperationEditor(onClose, !!name || !!rate || date !== businessToday());
  async function save(event: FormEvent) {
    event.preventDefault();
    const checked = validateNewJob(name, rate, date);
    if (!checked.ok) { setErrors(checked.errors); return; }
    setErrors(undefined);
    const { value } = checked;
    const created = await editor.submit(`Thêm loại công việc ${value.name} với đơn giá ${value.hourlyRate.toLocaleString("vi-VN")} đồng/giờ từ ${value.effectiveFrom}?`, () => jobTypesRepository.write("create", value, jobType));
    if (created) onCreated(created);
  }
  return <Dialog open dismissible={false} onCloseRequest={() => void editor.close()} title="Thêm loại công việc" onOpenChange={() => {}}>{editor.dialog}
    <form noValidate onSubmit={event => void save(event)}>
      <ErrorNotice error={editor.mutation.error} />
      <fieldset disabled={editor.disabled} className="space-y-4">
        <div><Field label="Tên loại công việc *" required maxLength={100} value={name} aria-invalid={!!errors?.name} onChange={event => setName(event.target.value)} />{errors?.name && <p role="alert" className={styles.fieldError}>{errors.name}</p>}</div>
        <div><Field label="Đơn giá (đồng/giờ) *" type="number" min={1} step={1} required value={rate} aria-invalid={!!errors?.hourlyRate} onChange={event => setRate(event.target.value)} />{errors?.hourlyRate && <p role="alert" className={styles.fieldError}>{errors.hourlyRate}</p>}</div>
        <div><Field label="Ngày hiệu lực *" type="date" required value={date} onChange={event => setDate(event.target.value)} />{errors?.effectiveFrom && <p role="alert" className={styles.fieldError}>{errors.effectiveFrom}</p>}</div>
      </fieldset>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button className="w-auto" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
        <Button className="w-auto" type="submit" isPending={editor.mutation.pending} pendingLabel="Đang lưu..." disabled={editor.disabled}>Lưu</Button>
      </div>
    </form>
  </Dialog>;
}

"use client";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { Money, businessToday } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { allRates, validateRate, type Job, type RateFieldErrors } from "./job-types-model";
import { JobTypeWriteFeedback, useJobTypeWrite } from "./job-types-write";
import styles from "./job-types-screen.module.css";

type Draft = { rate: string; date: string };

/** "Lịch sử đơn giá": every rate point, and an inline row to add one. A date that already has a rate replaces it. */
export function JobTypeRateHistory({ record, canEdit, onSynced }: { record: Job; canEdit: boolean; onSynced(job: Job): void }) {
  const [draft, setDraft] = useState<Draft>(), [errors, setErrors] = useState<RateFieldErrors>();
  const write = useJobTypeWrite(record, onSynced), { mutation } = write, id = useId();
  const rates = allRates(record), current = record.currentRate?.effectiveFrom;
  const replacing = !!draft && rates.some(rate => rate.effectiveFrom === draft.date);
  const stop = () => { setDraft(undefined); setErrors(undefined); };
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || mutation.pending) return;
    const checked = validateRate(draft.rate, draft.date);
    if (!checked.ok) { setErrors(checked.errors); return; }
    setErrors(undefined);
    if (await write.write("rate", checked.value)) stop();
  }
  const busy = mutation.pending || mutation.blocked;
  return <form noValidate onSubmit={event => void save(event)}>
    <div className={styles.rateTable}><table>
      <thead><tr><th scope="col">Hiệu lực từ</th><th scope="col">Đơn giá / giờ</th></tr></thead>
      <tbody>
        {draft && <tr className={styles.draftRow}>
          <td><DatePickerField label="Hiệu lực từ" value={draft.date} disabled={busy} onChange={date => setDraft({ ...draft, date })} />{errors?.effectiveFrom && <p role="alert" className={styles.fieldError}>{errors.effectiveFrom}</p>}</td>
          <td><div className={styles.rateInput}><input id={id} type="number" inputMode="numeric" min={1} max={999999999} step={1} required className={styles.input} aria-label="Đơn giá mới (đồng/giờ)" aria-invalid={!!errors?.hourlyRate} value={draft.rate} disabled={busy} autoFocus onChange={event => setDraft({ ...draft, rate: event.target.value })} /><span>đồng/giờ</span></div>
            {errors?.hourlyRate && <p role="alert" className={styles.fieldError}>{errors.hourlyRate}</p>}</td>
        </tr>}
        {rates.map(rate => <tr key={rate.effectiveFrom}>
          <td>{formatVietnameseDate(rate.effectiveFrom)}{rate.effectiveFrom === current && <span className={styles.currentTag}>Hiện tại</span>}</td>
          <td><Money value={rate.hourlyRate} /></td>
        </tr>)}
        {!rates.length && !draft && <tr><td colSpan={2} className={styles.emptyCell}>Chưa có mốc đơn giá.</td></tr>}
      </tbody>
    </table></div>
    {draft && <p className={styles.hint}>{replacing ? "Ngày này đã có đơn giá; lưu sẽ thay thế đơn giá đó. " : ""}Đơn giá có thể ảnh hưởng kết quả tính công từ ngày hiệu lực.</p>}
    <JobTypeWriteFeedback write={write} />
    {canEdit && <footer className={styles.tabFooter}>
      <div />
      <div>{draft
        ? <><Button key="cancel" className="w-auto" type="button" variant="secondary" disabled={mutation.pending} onClick={stop}>Bỏ qua</Button><Button key="save" className="w-auto" type="submit" isPending={mutation.pending} pendingLabel="Đang lưu..." disabled={mutation.blocked}>Lưu</Button></>
        : <Button key="add" className="w-auto" type="button" disabled={busy} onClick={() => { write.clearNotice(); setDraft({ rate: "", date: businessToday() }); }}><InterfaceIcon name="add" className="size-4" />Thêm mốc đơn giá</Button>}</div>
    </footer>}
  </form>;
}

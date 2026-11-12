"use client";
import { useId, type ChangeEvent } from "react";
import styles from "./raft-condition-note.module.css";

export const CONDITION_NOTE_MAX = 1000;

/** Edit: textarea of the raft condition note with a helper line and a character counter (field name and limit unchanged). */
export function RaftConditionNoteField({ value, onChange }: { value: string; onChange(event: ChangeEvent<HTMLTextAreaElement>): void }) {
  const id = useId(), left = CONDITION_NOTE_MAX - value.length;
  return <div className={styles.field}>
    <label htmlFor={id} className={styles.label}>Tình trạng bè</label>
    <p id={`${id}-help`} className={styles.help}>Ghi nhanh hiện trạng phao, khung, neo, dây hoặc việc cần sửa để người trực sau nắm được.</p>
    <textarea id={id} name="conditionNotes" className={`omts-control ${styles.textarea}`} rows={4} maxLength={CONDITION_NOTE_MAX} value={value} onChange={onChange}
      placeholder="Ví dụ: Phao nhựa HDPE còn tốt, khung gỗ cần kiểm tra lại sau mùa bão." aria-describedby={`${id}-help`} />
    <p className={styles.counter} data-low={left <= 100 || undefined}>{value.length}/{CONDITION_NOTE_MAX}</p>
  </div>;
}

/** Read-only: a labelled note card, with an empty state instead of a dash. */
export function RaftConditionNoteCard({ value }: { value?: string | null }) {
  const text = value?.trim();
  return <div className={styles.card}>
    <h4>Tình trạng bè</h4>
    {text ? <p>{text}</p> : <p className={styles.empty}>Chưa ghi tình trạng</p>}
  </div>;
}

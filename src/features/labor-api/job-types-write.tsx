"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createOperationsRepository } from "@/features/operations/repository";
import { useMutation } from "@/features/operations/ui";
import { jobType } from "./contracts";
import { FINALIZED_MONTH_CODE, FINALIZED_MONTH_MESSAGE, NO_RATE, statusLabel, type Job } from "./job-types-model";
import styles from "./job-types-screen.module.css";

export const jobTypesRepository = createOperationsRepository("job-types");

/**
 * Writes against one job type with its current rowVersion. A version conflict (MSG06) or an unknown result blocks further
 * writes and keeps the user's draft; `reread` loads the current record so the draft can be saved again on a fresh version.
 */
export function useJobTypeWrite(record: Job, onSynced: (job: Job) => void) {
  const mutation = useMutation(), [notice, setNotice] = useState<string>();
  const write = async (action: "rename" | "rate" | "discontinue" | "resume", body: object) => {
    setNotice(undefined);
    const saved = await mutation.run(() => jobTypesRepository.write(action, { ...body, rowVersion: record.rowVersion }, jobType, record.id));
    if (saved) onSynced(saved);
    return saved;
  };
  async function reread() {
    const latest = await mutation.run(() => jobTypesRepository.read("detail", { id: record.id }, jobType), true);
    if (!latest) return;
    onSynced(latest); mutation.reviewed();
    setNotice(`Đã đọc hồ sơ hiện tại: ${latest.name} · ${latest.currentRate ? `${latest.currentRate.hourlyRate.toLocaleString("vi-VN")} đồng/giờ` : NO_RATE} · ${statusLabel(latest.statusId)}. Bạn có thể lưu lại bản nháp.`);
  }
  return { mutation, write, reread, notice, clearNotice: () => setNotice(undefined) };
}

/** Inline outcome of a write: the error, the conflict recovery step, or the note after re-reading. */
export function JobTypeWriteFeedback({ write }: { write: ReturnType<typeof useJobTypeWrite> }) {
  const { mutation, notice, reread } = write;
  const message = mutation.failure?.code === FINALIZED_MONTH_CODE ? FINALIZED_MONTH_MESSAGE : mutation.error;
  return <>
    {message && <p role="alert" className={styles.inlineError}>{message}</p>}
    {mutation.blocked && <div className={styles.conflict}>
      <p>Bản nháp được giữ. Đọc hồ sơ hiện tại để đối chiếu trước khi lưu lại.</p>
      <Button className="w-auto" variant="secondary" isPending={mutation.pending} pendingLabel="Đang đọc..." onClick={() => void reread()}>Đọc hồ sơ hiện tại</Button>
    </div>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
  </>;
}

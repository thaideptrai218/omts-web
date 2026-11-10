"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Note, useMutation } from "@/features/operations/ui";
import { submitErrorText } from "./claim-errors";
import { claimSaved, MAX_DESCRIPTION, submitPayload, type TraderClaim } from "./claim-contracts";
import { ClaimPhotoPicker } from "./claim-photo-picker";
import { reportRepository } from "./claim-repositories";
import s from "./claims.module.css";

type Props = { invoiceId: string; invoiceCode?: string; blockedReason?: string; onSent(claim: TraderClaim, message: string): void; onReview(): void };

/**
 * Biểu mẫu CLAIM-01: mô tả + ảnh cho một hóa đơn của thương lái. Gửi một lần mỗi lượt bấm; nếu chưa biết kết quả (mất mạng, lỗi máy chủ)
 * thì khóa nút gửi cho tới khi thương lái xem lại danh sách báo cáo ("Tôi đã đối chiếu"), để không tạo báo cáo trùng.
 */
export function ClaimReportForm({ invoiceId, invoiceCode, blockedReason, onSent, onReview }: Props) {
  const [description, setDescription] = useState(""), [files, setFiles] = useState<File[]>([]), [problem, setProblem] = useState<string>();
  const submit = useMutation();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = submitPayload.safeParse({ description });
    if (!payload.success) return setProblem(description.trim() ? `Mô tả tối đa ${MAX_DESCRIPTION.toLocaleString("vi-VN")} ký tự.` : "Hãy mô tả vấn đề chất lượng bạn gặp.");
    if (!files.length) return setProblem("Hãy đính kèm ít nhất một ảnh.");
    setProblem(undefined);
    const saved = await submit.run(() => reportRepository.upload("claim-submit", files, payload.data, claimSaved, invoiceId));
    if (saved) { setDescription(""); setFiles([]); onSent(saved.claim, saved.message); }
  }
  // useMutation giữ lỗi cuối; câu riêng theo mã HTTP chỉ thay thế câu chung khi có.
  const failure = submit.failure, shown = failure ? submitErrorText(failure) ?? submit.error : undefined;
  const locked = !!blockedReason || submit.blocked;

  return (
    <form className={s.form} onSubmit={(event) => void onSubmit(event)} noValidate aria-label="Báo vấn đề chất lượng">
      <p className="m-0 text-sm">Hóa đơn: <strong>{invoiceCode ?? "đã chọn từ liên kết"}</strong></p>
      {blockedReason && <p role="status" className={s.warning}>{blockedReason}</p>}
      <div>
        <Note label="Mô tả vấn đề *" required aria-required="true" maxLength={MAX_DESCRIPTION} value={description} disabled={submit.pending} onChange={(event) => setDescription(event.target.value)} />
        <p className={s.counter} aria-hidden="true">{description.length.toLocaleString("vi-VN")}/{MAX_DESCRIPTION.toLocaleString("vi-VN")}</p>
      </div>
      <ClaimPhotoPicker files={files} disabled={submit.pending} onChange={setFiles} />
      {problem && <p role="alert" className="text-sm text-danger">{problem}</p>}
      <ErrorNotice error={shown} />
      {submit.blocked && <div className={s.warning} role="status">
        Hãy xem mục &quot;Báo cáo của tôi&quot; bên dưới để biết báo cáo đã được gửi chưa, rồi mới gửi lại.{" "}
        <button type="button" className={s.linkButton} onClick={() => { submit.reviewed(); onReview(); }}>Tôi đã đối chiếu</button>
      </div>}
      <Button type="submit" isPending={submit.pending} pendingLabel="Đang gửi..." disabled={submit.pending || locked}>Gửi báo cáo</Button>
    </form>
  );
}

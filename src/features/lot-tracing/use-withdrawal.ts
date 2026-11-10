"use client";
import { useState } from "react";
import { createOperationsRepository } from "@/features/operations/repository";
import { useMutation } from "@/features/operations/ui";
import { withdrawPreview, withdrawn, type WithdrawPreview, type Withdrawn } from "./withdraw-contracts";

const repo = createOperationsRepository("lot-tracing");

/**
 * Luồng thu hồi hai bước: xem trước ai sẽ nhận thông báo (không đổi dữ liệu), rồi xác nhận kèm lý do.
 * Thu hồi đi qua useMutation: khi chưa rõ kết quả thì khóa, không gửi lại; đóng hộp thoại sẽ tải lại trạng thái lô.
 */
export function useWithdrawal(lotId: string, onDone: () => void) {
  const previewing = useMutation(), submitting = useMutation();
  const [preview, setPreview] = useState<WithdrawPreview>(), [result, setResult] = useState<Withdrawn>();

  async function open() {
    setResult(undefined);
    const data = await previewing.run(() => repo.read("withdraw-preview", { id: lotId }, withdrawPreview), true);
    if (data) setPreview(data);
  }
  async function confirm(reason: string) {
    const data = await submitting.run(() => repo.write("withdraw", { reason }, withdrawn, lotId));
    if (!data) return;
    setResult(data);
  }
  /** Đóng hộp thoại rồi làm mới lô khi đã thu hồi, chưa rõ kết quả hoặc lô đã đổi trạng thái (409). Làm mới sớm hơn sẽ làm mất danh sách khách cần gọi. */
  function close() {
    const refresh = Boolean(result) || submitting.uncertain || Boolean(submitting.failure && submitting.failure.httpStatus === 409);
    setPreview(undefined); setResult(undefined); previewing.reviewed(); submitting.reviewed();
    if (refresh) onDone();
  }
  return { preview, result, opening: previewing.pending, openError: previewing.error, submitting, open, confirm, close };
}

"use client";
import { useState } from "react";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { useMutation } from "@/features/operations/ui";
import type { Preview } from "./correction-contracts";
import type { Built } from "./correction-draft";

type Saved = { affectedPublishedLotCodes: string[] };
type Config<V> = {
  build(): Built<V>;
  /** Bước 5-6 của TRACE-03: backend kiểm tra như khi lưu và trả giá trị trước/sau, không thay đổi gì. */
  preview(value: V): Promise<WorkspaceResult<Preview>>;
  /** Bước 7-8: lưu kèm cờ Chủ HTX đã đồng ý (chỉ Quản lý vùng cần gửi true). */
  save(value: V, ownerApproved: boolean): Promise<WorkspaceResult<Saved>>;
};

/**
 * Luồng hai bước dùng chung cho ba loại bản ghi: xem trước rồi xác nhận lưu.
 * useMutation chặn lưu lặp khi chưa rõ kết quả, nên không bao giờ gửi lại một lần lưu có thể đã được ghi.
 */
export function useCorrectionFlow<V>(config: Config<V>, onSaved: (published: string[]) => void) {
  const mutation = useMutation();
  const [reviewed, setReviewed] = useState<{ value: V; preview: Preview }>();
  const built = config.build();

  async function review() {
    if (!built.ok) return;
    const preview = await mutation.run(() => config.preview(built.value), true);
    if (preview) setReviewed({ value: built.value, preview });
  }
  async function confirm() {
    if (!reviewed) return;
    const saved = await mutation.run(() => config.save(reviewed.value, reviewed.preview.needsOwnerApproval));
    if (saved) onSaved(saved.affectedPublishedLotCodes);
  }
  function back() { setReviewed(undefined); mutation.reviewed(); }
  return { mutation, built, reviewed, review, confirm, back };
}

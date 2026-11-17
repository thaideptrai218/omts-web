"use client";
import { useCallback, useState } from "react";
import { createOperationsRepository } from "@/features/operations/repository";
import { useToast } from "@/components/ui/toast-provider";
import { useMutation, useRemote } from "@/features/operations/ui";
import { lotTrace, publishCheck, published, type PublishCheck } from "./contracts";

const repo = createOperationsRepository("lot-tracing");

/**
 * Chi tiết truy xuất một lô: đọc vết ngược/xuôi, xuất file, và luồng công bố hai bước (kiểm tra rồi xác nhận).
 * Công bố đi qua useMutation nên không bao giờ tự gửi lại khi chưa rõ lần trước đã được ghi hay chưa.
 */
export function useTraceDetail(lotId: string) {
  const trace = useRemote(useCallback((signal: AbortSignal) => repo.read("trace", { id: lotId }, lotTrace, signal), [lotId]));
  const { notify } = useToast();
  const publishing = useMutation(), exporting = useMutation();
  const [check, setCheck] = useState<PublishCheck>();

  async function openPublish() {
    const result = await publishing.run(() => repo.read("publish-check", { id: lotId }, publishCheck), true);
    if (result) setCheck(result);
  }
  async function confirmPublish() {
    const result = await publishing.run(() => repo.write("publish", {}, published, lotId));
    if (!result) return;
    setCheck(undefined);
    notify({ tone: "success", title: result.republished ? `Đã công bố lại thông tin nguồn gốc lô ${result.lot.lotCode}.` : `Đã công bố thông tin nguồn gốc lô ${result.lot.lotCode}.` });
    trace.reload();
  }
  const closePublish = () => { setCheck(undefined); publishing.reviewed(); };
  const exportFile = async () => { const result = await exporting.run(() => repo.download({ id: lotId }), true); if (!result) notify({ tone: "danger", title: "Chưa xuất được thông tin nguồn gốc." }); return result; };
  return { trace, publishing, exporting, check, openPublish, confirmPublish, closePublish, exportFile };
}

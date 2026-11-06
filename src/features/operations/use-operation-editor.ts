"use client";
import { useEffect, useRef, useState } from "react";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { useMutation } from "./ui";

export function useOperationEditor(onClose: () => void, dirty: boolean) {
  const mutation = useMutation(), confirmation = useActionDialog();
  const [confirming, setConfirming] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function submit<T>(message: string, action: () => Promise<WorkspaceResult<T>>) {
    if (mutation.busy() || mutation.blocked || confirming) return;
    setConfirming(true);
    const accepted = await confirmation.confirm(message);
    if (!mounted.current) return;
    setConfirming(false);
    if (!accepted) return;
    return mutation.run(action);
  }
  async function close() {
    if (mutation.busy() || confirming) return;
    if ((dirty || mutation.blocked) && !await confirmation.confirm("Đóng và bỏ bản nháp? Nếu lần gửi trước chưa rõ kết quả, hãy đối chiếu dữ liệu trước khi lập lượt mới.")) return;
    if (mounted.current) onClose();
  }
  return { mutation, submit, close, dialog: confirmation.dialog, pending: mutation.pending || confirming, disabled: mutation.pending || confirming || mutation.blocked };
}

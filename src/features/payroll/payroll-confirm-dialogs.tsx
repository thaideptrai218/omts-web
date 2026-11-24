"use client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice } from "@/features/operations/ui";
import s from "./payroll-screen.module.css";

type Common = { pending: boolean; error?: string; onClose(): void };

export function CancelSheetDialog({ name, pending, error, onClose, onConfirm }: Common & { name: string; onConfirm(): void }) {
  return <Dialog open size="md" mobileLayout="compact" title="Hủy bảng lương?" dismissible={!pending} onOpenChange={(open) => { if (!open) onClose(); }}>
    <p>Bảng lương &quot;{name}&quot; sẽ chuyển sang trạng thái Đã hủy và không thể khôi phục.</p>
    <ErrorNotice error={error} />
    <div className={s.dialogActions}>
      <Button key="skip" className="w-auto" variant="secondary" type="button" disabled={pending} onClick={onClose}>Bỏ qua</Button>
      <Button key="agree" className="w-auto" variant="danger" type="button" isPending={pending} onClick={onConfirm}>Đồng ý</Button>
    </div>
  </Dialog>;
}

"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Note } from "./ui";

/** One-step confirmation for voiding a measurement (WATER-02): the reason is the only input. */
export function WaterVoidDialog({ subject, pending, blocked = false, busy, error, onCancel, onConfirm }: { subject: string; pending: boolean; blocked?: boolean; busy(): boolean; error?: string; onCancel(): void; onConfirm(reason: string): void }) {
  const [reason, setReason] = useState("");
  const valid = reason.trim().length > 0;
  return <Dialog open title="Hủy bỏ phép đo?" dismissible={!pending} onOpenChange={open => { if (!open && !busy()) onCancel(); }}>
    <form onSubmit={event => { event.preventDefault(); if (valid && !pending && !blocked) onConfirm(reason.trim()); }}>
      <p className="text-sm text-text"><strong>{subject}</strong></p>
      <p className="mt-2 mb-3 text-xs text-text-muted">Phép đo bị loại khỏi dữ liệu đang sử dụng; bản ghi và lý do hủy vẫn được giữ trong lịch sử.</p>
      <Note label="Lý do hủy *" required maxLength={1000} rows={3} value={reason} onChange={event => setReason(event.target.value)} />
      <ErrorNotice error={error} />
      <div className="mt-5 flex justify-end gap-3">
        <Button key="cancel" type="button" className="w-auto" variant="secondary" disabled={pending} onClick={onCancel}>Bỏ qua</Button>
        <Button key="confirm" type="submit" className="w-auto" variant="danger" isPending={pending} disabled={!valid || blocked}>Xác nhận hủy phép đo</Button>
      </div>
    </form>
  </Dialog>;
}

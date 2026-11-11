"use client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/** One-step confirmation for a status change (DESIGN_GUIDELINES 1.6), shared by the "Nuôi trồng" detail panels. */
export function StatusConfirmDialog({ title, subject, description, confirmLabel, pending, busy, onCancel, onConfirm }: {
  title: string; subject: string; description: string; confirmLabel: string; pending: boolean; busy(): boolean; onCancel(): void; onConfirm(): void;
}) {
  return <Dialog open title={title} dismissible={!pending} onOpenChange={open => { if (!open && !busy()) onCancel(); }}>
    <form onSubmit={event => { event.preventDefault(); onConfirm(); }}>
      <p className="text-sm text-text"><strong>{subject}</strong></p>
      <p className="mt-2 text-xs text-text-muted">{description}</p>
      <div className="mt-5 flex justify-end gap-3">
        <Button key="cancel" type="button" className="w-auto" variant="secondary" disabled={pending} onClick={onCancel}>Bỏ qua</Button>
        <Button key="confirm" type="submit" className="w-auto" isPending={pending}>{confirmLabel}</Button>
      </div>
    </form>
  </Dialog>;
}

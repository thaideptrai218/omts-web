"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice } from "@/features/operations/ui";

/**
 * Confirmation of an account action (lock, unlock, password reset). Unlike a plain confirm, the dialog stays on screen with a
 * pending button until `onConfirm` settles, so the Owner never sees the dialog vanish before the result appears. The parent
 * closes it by unmounting when the action succeeded; on failure it stays open with `error`.
 * `reasonLabel` makes a written reason mandatory: the field is marked "*" and the disabled button says what is missing.
 */
export function UserActionDialog({ title, body, reasonLabel, confirmLabel, pendingLabel, error, onConfirm, onClose }: {
  title: string; body: string; reasonLabel?: string; confirmLabel: string; pendingLabel: string; error?: string;
  onConfirm(reason: string | undefined): Promise<unknown>; onClose(): void;
}) {
  const [reason, setReason] = useState(""), [pending, setPending] = useState(false);
  const helpId = useId(), missing = !!reasonLabel && !reason.trim();
  async function confirm() {
    if (pending || missing) return;
    setPending(true);
    try { await onConfirm(reasonLabel ? reason.trim() : undefined); } finally { setPending(false); }
  }
  return <Dialog open title={title} mobileLayout="compact" dismissible={!pending} onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void confirm(); }}>
      <p>{body}</p>
      {reasonLabel && <label className="block text-sm font-medium">{reasonLabel} *
        <textarea className="mt-2 min-h-24 w-full rounded-control border border-border-strong p-3" maxLength={1000} required aria-required="true" aria-describedby={missing ? helpId : undefined} value={reason} disabled={pending} autoFocus onChange={(event) => setReason(event.target.value)} />
      </label>}
      <ErrorNotice error={error} />
      {missing && <p id={helpId} className="text-xs text-text-muted">Nhập lý do để bấm {confirmLabel}.</p>}
      <div className="flex flex-wrap gap-3">
        <Button className="w-auto" type="submit" isPending={pending} pendingLabel={pendingLabel} disabled={missing} aria-describedby={missing ? helpId : undefined}>{confirmLabel}</Button>
        <Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Quay lại</Button>
      </div>
    </form>
  </Dialog>;
}

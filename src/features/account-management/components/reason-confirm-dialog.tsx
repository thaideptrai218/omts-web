"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type ReasonConfirmDialogProps = Readonly<{
  confirmLabel: string;
  description: string;
  isPending: boolean;
  onConfirm(reason: string): void;
  onOpenChange(open: boolean): void;
  open: boolean;
  title: string;
  tone?: "danger" | "primary";
}>;

export function ReasonConfirmDialog({
  confirmLabel,
  description,
  isPending,
  onConfirm,
  onOpenChange,
  open,
  title,
  tone = "primary",
}: ReasonConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const errorId = useId();

  return (
    <Dialog
      description={description}
      dismissible={!isPending}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    >
      <label className="text-sm font-semibold text-text" htmlFor="operation-reason">
        Lý do <span className="text-danger">*</span>
      </label>
      <textarea
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className="mt-2 min-h-28 w-full resize-y rounded-control border border-border-strong bg-surface px-3 py-3 text-text"
        data-dialog-initial-focus
        disabled={isPending}
        id="operation-reason"
        onChange={(event) => {
          setReason(event.target.value);
          if (error) setError("");
        }}
        placeholder="Ghi rõ lý do để lưu vào lịch sử"
        value={reason}
      />
      {error && <p className="mt-2 text-sm font-medium text-danger" id={errorId}>{error}</p>}

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button className="sm:w-auto" disabled={isPending} onClick={() => onOpenChange(false)} variant="secondary">
          Hủy
        </Button>
        <Button
          className="sm:w-auto"
          isPending={isPending}
          onClick={() => {
            if (!reason.trim()) {
              setError("Vui lòng nhập lý do trước khi xác nhận.");
              return;
            }
            onConfirm(reason);
          }}
          variant={tone}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

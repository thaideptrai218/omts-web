"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type ConfirmDialogProps = Readonly<{
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  isPending?: boolean;
  onConfirm(): void;
  onOpenChange(open: boolean): void;
  open: boolean;
  title: string;
  tone?: "danger" | "primary";
}>;

export function ConfirmDialog({
  cancelLabel = "Hủy",
  confirmLabel = "Xác nhận",
  description,
  isPending = false,
  onConfirm,
  onOpenChange,
  open,
  title,
  tone = "primary",
}: ConfirmDialogProps) {
  return (
    <Dialog
      description={description}
      dismissible={!isPending}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    >
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          className="sm:w-auto"
          disabled={isPending}
          onClick={() => onOpenChange(false)}
          variant="secondary"
        >
          {cancelLabel}
        </Button>
        <Button
          className="sm:w-auto"
          isPending={isPending}
          onClick={onConfirm}
          variant={tone}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

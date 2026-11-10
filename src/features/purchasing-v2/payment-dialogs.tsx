"use client";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import * as c from "./contracts";
import { PaymentEditor } from "./payment-editor";
import { paymentsRepository as payments, useAccess, type SupplierPaymentDraft } from "./purchasing-shared";

/** Loads one supplier transaction by id, then shows it in the payment editor. */
export function PaymentRecordDialog({ id, onClose, onSaved }: { id: string; onClose(): void; onSaved?(): void }) {
  const { allowed } = useAccess("supplier-payments");
  const remote = useRemote(
    useMemo(() => (signal: AbortSignal) => payments.read("detail", { id }, c.payment, signal), [id]),
  );
  if (remote.data)
    return (
      <PaymentEditor record={remote.data} canWrite={allowed("Create")} onClose={onClose} onSaved={onSaved ?? onClose} />
    );
  return (
    <Dialog
      open
      title="Giao dịch nhà cung cấp"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ErrorNotice error={remote.error} />
      {remote.loading ? (
        <Skeleton />
      ) : (
        <Button variant="secondary" onClick={remote.reload}>
          Tải lại
        </Button>
      )}
      <Button className="mt-4" variant="secondary" onClick={onClose}>
        Đóng
      </Button>
    </Dialog>
  );
}

/** New supplier transaction prefilled from a draft (e.g. from the debts screen). */
export function SupplierPaymentDialog({
  draft,
  onClose,
  onSaved,
}: {
  draft: SupplierPaymentDraft;
  onClose(): void;
  onSaved(): void;
}) {
  const { allowed } = useAccess("supplier-payments");
  return (
    <PaymentEditor
      record={null}
      initialDraft={draft}
      canWrite={allowed("Create")}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

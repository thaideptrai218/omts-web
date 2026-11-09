"use client";
import type { useActionDialog } from "@/components/ui/use-action-dialog";
import { Button } from "@/components/ui/button";
import type { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import * as c from "./contracts";
import type { ReceiptActionMode } from "./receipt-action-form";
import { receiptAllowed, receiptRepository as repository } from "./receipt-shared";
import type { useMutation } from "./ui";

/**
 * Status-dependent receipt actions. Receipt statuses: 1701 draft, 1702 completed, 1703 cancelled.
 * Send/cancel are blocked while the form is dirty or invoice files are still pending upload.
 */
export function ReceiptStatusActions({
  record,
  context,
  mutation,
  confirmation,
  dirty,
  pendingFileCount,
  pendingInvoicesHint,
  baselineRowVersion,
  onModeChange,
  onSaved,
}: {
  record: c.Receipt;
  context: ReturnType<typeof useApiWorkspace>;
  mutation: ReturnType<typeof useMutation>;
  confirmation: ReturnType<typeof useActionDialog>;
  dirty: boolean;
  pendingFileCount: number;
  pendingInvoicesHint: string | undefined;
  /** Reads the current baseline row version at click time. */
  baselineRowVersion(): string | undefined;
  onModeChange(mode: ReceiptActionMode): void;
  onSaved(record: c.Receipt): void;
}) {
  const allowed = (action: string) => receiptAllowed(context, action, record.zone.id);
  const lockedByDraftState = mutation.pending || mutation.blocked || dirty || pendingFileCount > 0;

  async function sendToAccountant() {
    if (pendingFileCount) return;
    const question =
      "Gửi phiếu cho Kế toán thanh toán? Công nợ, lô giống và khoản trả ngay sẽ được ghi nhận; Chủ nhiệm HTX nhận thông báo để theo dõi.";
    if (await confirmation.confirm(question)) {
      const saved = await mutation.run(() =>
        repository.write("complete", { rowVersion: baselineRowVersion() }, c.receiptSchema, record.id),
      );
      if (saved) onSaved(saved);
    }
  }

  async function copyAsDraft() {
    const saved = await mutation.run(() => repository.write("copy", {}, c.receiptSchema, record.id));
    if (saved) onSaved(saved);
  }

  return (
    <div className="my-5 flex flex-wrap gap-2">
      {record.statusId === 1701 && allowed("Edit") && (
        <Button
          className="w-auto"
          variant="secondary"
          aria-describedby={pendingInvoicesHint}
          disabled={lockedByDraftState}
          onClick={sendToAccountant}
        >
          Gửi cho Kế toán
        </Button>
      )}
      {record.statusId !== 1703 && allowed("Delete") && (
        <Button
          className="w-auto"
          variant="danger"
          aria-describedby={pendingInvoicesHint}
          disabled={lockedByDraftState}
          onClick={() => onModeChange("cancel")}
        >
          Hủy phiếu
        </Button>
      )}
      {record.statusId !== 1701 && allowed("Create") && (
        <Button
          className="w-auto"
          variant="secondary"
          disabled={mutation.pending || mutation.blocked}
          onClick={copyAsDraft}
        >
          Sao chép thành nháp
        </Button>
      )}
      {record.statusId === 1702 && allowed("Create") && (
        <Button
          className="w-auto"
          variant="secondary"
          disabled={mutation.pending || mutation.blocked}
          onClick={() => onModeChange("return")}
        >
          Trả hàng
        </Button>
      )}
    </div>
  );
}

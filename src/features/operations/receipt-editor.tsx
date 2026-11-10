"use client";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import * as c from "./contracts";
import { ReceiptActionForm, type ReceiptActionMode } from "./receipt-action-form";
import { ReceiptConflictReview } from "./receipt-conflict-review";
import { ReceiptHeaderFields } from "./receipt-header-fields";
import { ReceiptLinesTable, ReceiptPaymentAndReturnHistory, ReturnDetailPanel } from "./receipt-history-tables";
import { ReceiptInvoiceSection } from "./receipt-invoice-section";
import { ReceiptLineItemsFieldset } from "./receipt-line-items-fieldset";
import { buildReceiptPayload, missingCompletionData, type ReceiptFormValues } from "./receipt-payload";
import {
  ReceiptTotals,
  blankLine,
  loadZoneRafts,
  receiptAllowed,
  receiptRepository as repository,
  type ReceiptLines,
} from "./receipt-shared";
import { ReceiptStatusActions } from "./receipt-status-actions";
import { ErrorNotice, businessToday, statusLabel, useMutation, useRemote } from "./ui";

const PENDING_INVOICES_ID = "receipt-pending-invoices";

/** Create/edit dialog for one purchase receipt, including its follow-up actions and history. */
export function ReceiptEditor({
  record,
  zones,
  suppliers,
  items,
  initialFiles = [],
  onClose,
  onSaved,
}: {
  record: c.Receipt | null;
  zones: ApiRecord[];
  suppliers: ApiRecord[];
  items: ApiRecord[];
  initialFiles?: File[];
  onClose(): void;
  onSaved(record: c.Receipt, pendingFiles?: File[]): void;
}) {
  const confirmation = useActionDialog();
  const context = useApiWorkspace();
  const initial: ReceiptFormValues = {
    supplierId: record?.supplier.id ?? "",
    zoneId: record?.zone.id ?? "",
    raftId: record?.raft?.id ?? "",
    receiptDate: record?.receiptDate ?? businessToday(),
    discountAmount: String(record?.discountAmount ?? 0),
    amountPaidNow: String(record?.amountPaidNow ?? 0),
    paidNowMethod: record?.paidNowMethod ?? "",
    notes: record?.notes ?? "",
  };
  const initialLines: ReceiptLines = record?.lines.map((row) => ({
    key: row.id,
    itemId: row.itemId,
    quantity: row.quantity ? String(row.quantity) : "",
    unitPrice: String(row.unitPrice),
    supplierLotCode: row.supplierLotCode ?? "",
    actualSource: row.actualSource ?? "",
  })) ?? [blankLine()];
  const [values, setValues] = useState(initial);
  const [lines, setLines] = useState(initialLines);
  const [localError, setLocalError] = useState<string>();
  const [latest, setLatest] = useState<c.Receipt>();
  const [mode, setMode] = useState<ReceiptActionMode>();
  // Invoice files picked but not uploaded yet; they block completing or cancelling the receipt.
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [returnDetail, setReturnDetail] = useState<z.infer<typeof c.returnSchema>>();
  const [initialSnapshot] = useState(() => JSON.stringify({ values: initial, lines: initialLines }));
  // Row version the next write is based on; replaced when the user accepts a reviewed server copy.
  const baseline = useRef(record);
  const mutation = useMutation();

  const dirty = JSON.stringify({ values, lines }) !== initialSnapshot;
  // Only drafts (1701) are editable.
  const editable = !record || record.statusId === 1701;
  const action = record ? "Edit" : "Create";
  const canEdit = editable && receiptAllowed(context, action, values.zoneId || undefined);
  const allowedZones = zones.filter((zone) => zone.statusId === 101 && receiptAllowed(context, action, zone.id));
  const activeSuppliers = suppliers.filter((row) => row.statusId === 101);
  const activeItems = items.filter((row) => row.statusId === 101);
  const rafts = useRemote(
    useMemo(() => (signal: AbortSignal) => loadZoneRafts(signal, values.zoneId, { statusId: "101" }), [values.zoneId]),
  );
  const pendingInvoicesHint = files.length ? PENDING_INVOICES_ID : undefined;

  // Changing the zone clears the raft, which belongs to the previous zone.
  const change = (key: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [key]: value, ...(key === "zoneId" ? { raftId: "" } : {}) }));

  async function save(complete: boolean) {
    setLocalError(undefined);
    if (complete && files.length) {
      setLocalError("Hãy tải hóa đơn đã chọn lên hoặc bỏ chọn tệp trước khi hoàn thành phiếu.");
      return;
    }
    const payload = buildReceiptPayload(values, lines, complete, baseline.current?.rowVersion ?? null);
    if (complete && missingCompletionData(values, payload)) {
      setLocalError("Để hoàn thành, cần ngày nhập và ít nhất một dòng có đủ vật tư, số lượng, đơn giá.");
      return;
    }
    const result = await mutation.run(() =>
      repository.write(record ? "update" : "create", payload, c.receiptSchema, record?.id),
    );
    // Pending invoice files are only carried over while the receipt is still a draft.
    if (result) onSaved(result, result.statusId === 1701 ? files : undefined);
  }

  const close = async () => {
    if (
      !mutation.busy() &&
      ((!dirty && !mode && !files.length) || (await confirmation.confirm("Bỏ các thay đổi chưa lưu?")))
    )
      onClose();
  };

  async function submitAction(record: c.Receipt, action: ReceiptActionMode, body: Record<string, unknown>) {
    if (action === "cancel" && files.length) {
      setLocalError("Hãy tải hóa đơn đã chọn lên hoặc bỏ chọn tệp trước khi hủy phiếu.");
      return;
    }
    const payload =
      action === "cancel" ? { ...body, rowVersion: baseline.current?.rowVersion ?? record.rowVersion } : body;
    const saved = await mutation.run(() => repository.write(action, payload, c.receiptSchema, record.id));
    if (saved) onSaved(saved);
  }

  async function openReturn(returnId: string) {
    const detail = await mutation.run(() => repository.read("return-detail", { id: returnId }, c.returnSchema), true);
    if (detail) setReturnDetail(detail);
  }

  return (
    <Dialog
      open
      size="xl"
      title={record ? `Phiếu ${record.code} · ${statusLabel(record.statusId)}` : "Tạo phiếu nhập"}
      dismissible={!mutation.pending}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      {confirmation.dialog}
      <ErrorNotice error={localError || mutation.error || rafts.error} />
      {rafts.error && (
        <Button
          className="mb-3 w-auto"
          variant="secondary"
          disabled={mutation.pending || rafts.loading}
          onClick={rafts.reload}
        >
          Tải lại danh sách bè
        </Button>
      )}
      {files.length > 0 && (
        <p role="status" id={PENDING_INVOICES_ID} className="my-3 rounded-control border border-border p-3">
          Có {files.length} hóa đơn chưa tải lên. Hãy tải lên hoặc bỏ chọn tệp trước khi hoàn thành hoặc hủy phiếu.
        </p>
      )}
      {record && <ReceiptTotals record={record} />}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // The clicked submit button decides between "save draft" and "complete".
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          void save(submitter?.value === "complete");
        }}
      >
        <fieldset disabled={mutation.pending || !canEdit} className="grid gap-4 sm:grid-cols-2">
          <ReceiptHeaderFields
            record={record}
            values={values}
            change={change}
            activeSuppliers={activeSuppliers}
            allowedZones={allowedZones}
            rafts={rafts.data}
          />
          <ReceiptLineItemsFieldset record={record} lines={lines} setLines={setLines} activeItems={activeItems} />
        </fieldset>
        {canEdit && (
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button
              className="w-auto"
              type="submit"
              value="draft"
              isPending={mutation.pending}
              disabled={mutation.blocked}
            >
              Lưu nháp
            </Button>
            <Button
              className="w-auto"
              type="submit"
              value="complete"
              aria-describedby={pendingInvoicesHint}
              disabled={mutation.pending || mutation.blocked || files.length > 0}
            >
              Gửi yêu cầu thanh toán
            </Button>
          </div>
        )}
      </form>
      {record && (
        <>
          <ReceiptLinesTable record={record} />
          <ReceiptStatusActions
            record={record}
            context={context}
            mutation={mutation}
            confirmation={confirmation}
            dirty={dirty}
            pendingFileCount={files.length}
            pendingInvoicesHint={pendingInvoicesHint}
            baselineRowVersion={() => baseline.current?.rowVersion}
            onModeChange={setMode}
            onSaved={onSaved}
          />
          {mode && (
            <ReceiptActionForm
              key={mode}
              mode={mode}
              record={record}
              disabled={mutation.pending || mutation.blocked || (mode === "cancel" && files.length > 0)}
              onCancel={() => setMode(undefined)}
              onSubmit={(action, body) => submitAction(record, action, body)}
            />
          )}
          <ReceiptInvoiceSection
            record={record}
            canUpload={record.statusId === 1701 && receiptAllowed(context, "Edit", record.zone.id)}
            dirty={dirty}
            files={files}
            setFiles={setFiles}
            mutation={mutation}
            confirmation={confirmation}
            onSaved={onSaved}
          />
          <ReceiptPaymentAndReturnHistory
            record={record}
            disabled={mutation.pending}
            onOpenReturn={(returnId) => void openReturn(returnId)}
          />
        </>
      )}
      {returnDetail && <ReturnDetailPanel detail={returnDetail} />}
      {mutation.blocked && (
        <ReceiptConflictReview
          record={record}
          latest={latest}
          mutation={mutation}
          confirmation={confirmation}
          onLatestLoaded={setLatest}
          onKeepDraft={(reviewed) => {
            baseline.current = reviewed;
            mutation.reviewed();
            setLatest(undefined);
          }}
          onUseLatest={(reviewed) => onSaved(reviewed)}
        />
      )}
      <Button className="mt-6 w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>
        Đóng
      </Button>
    </Dialog>
  );
}

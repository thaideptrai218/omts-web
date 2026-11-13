"use client";
import { formatVndWithSymbol } from "@/shared/format/vnd";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { loadOptions } from "@/features/operations/lookups";
import {
  ErrorNotice,
  Field,
  Note,
  Select,
  Skeleton,
  businessToday,
  useMutation,
  useRemote,
} from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import * as c from "./contracts";
import { EditorClose } from "./editor-close-panel";
import {
  loadReceiptRafts,
  receiptsRepository as receipts,
  stateLabel,
  useAccess,
  type Receipt,
} from "./purchasing-shared";
import { blankReceiptLine, ReceiptLineFields } from "./receipt-line-fields";
import { ReceiptRecordSummary } from "./receipt-record-summary";
import { ReceiptReturnAndCancelActions } from "./receipt-return-and-cancel-actions";
import styles from "./purchasing.module.css";

const loadSuppliers = (signal: AbortSignal) => loadOptions("suppliers", signal);
const loadItems = (signal: AbortSignal) => loadOptions("input-items", signal);

/** Opens an existing receipt (`id`) or a blank one (`id` null) in a non-dismissible dialog. */
export function ReceiptDialog({ id, onClose, onSaved }: { id: string | null; onClose(): void; onSaved(): void }) {
  const remote = useRemote(
    useMemo(
      () => (signal: AbortSignal) =>
        id
          ? receipts.read("detail", { id }, c.receipt, signal)
          : Promise.resolve({ status: "success" as const, data: null }),
      [id],
    ),
  );
  return (
    <Dialog
      open
      size="xl"
      dismissible={false}
      title={remote.data ? `Phiếu nhập ${remote.data.code}` : "Tạo phiếu nhập vật tư"}
      onOpenChange={() => {}}
    >
      <ErrorNotice error={remote.error} />
      {remote.loading ? (
        <Skeleton />
      ) : (
        !remote.error && (
          <ReceiptEditor
            key={remote.data?.rowVersion ?? "new"}
            record={remote.data ?? null}
            onClose={onClose}
            onSaved={onSaved}
          />
        )
      )}{" "}
      {remote.error && (
        <>
          <Button variant="secondary" onClick={remote.reload}>
            Tải lại phiếu
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </>
      )}
    </Dialog>
  );
}

/**
 * Receipt form. New receipts need Create; drafts (1701) are editable only by their recorder
 * (or the owner) with Edit permission. Completed receipts show follow-up return/cancel actions.
 */
function ReceiptEditor({ record, onClose, onSaved }: { record: Receipt | null; onClose(): void; onSaved(): void }) {
  const { identity, allowed } = useAccess("purchase-receipts");
  const owner = identity.subjectType === "CooperativeOwner";
  const own = owner || record?.recordedBy.id === identity.accountId;
  const suppliers = useRemote(loadSuppliers);
  const items = useRemote(loadItems);
  const rafts = useRemote(loadReceiptRafts);
  const initial = record?.lines.map((v) => ({
    itemId: v.itemId ?? "",
    quantity: v.quantity === null ? "" : String(v.quantity),
    unitPrice: v.unitPrice === null ? "" : String(v.unitPrice),
    supplierLotCode: v.supplierLotCode ?? "",
    raftId: v.raft?.id ?? "",
  })) ?? [blankReceiptLine()];
  const [supplier, setSupplier] = useState(record?.supplier.id ?? "");
  const [date, setDate] = useState(record?.receiptDate ?? businessToday());
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [lines, setLines] = useState(initial);
  // Shared reason for returns and cancellations.
  const [reason, setReason] = useState("");
  const [returnQuantities, setReturns] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const dirty =
    supplier !== (record?.supplier.id ?? "") ||
    date !== (record?.receiptDate ?? businessToday()) ||
    notes !== (record?.notes ?? "") ||
    JSON.stringify(lines) !== JSON.stringify(initial) ||
    !!reason ||
    Object.values(returnQuantities).some(Boolean);
  const editor = useOperationEditor(onClose, dirty);
  const read = useMutation();
  // Drafts are continued on the receipt page, which carries the zone and discount a completion needs.
  const editable = false;
  const continueDraft = record?.statusId === 1701 && own && allowed("Edit");

  async function save(complete: boolean) {
    const parsed = c.receiptValues.safeParse({
      supplierId: supplier,
      receiptDate: date || null,
      notes: notes || null,
      complete,
      rowVersion: record?.rowVersion ?? null,
      lines: lines.map((v) => ({
        itemId: v.itemId || null,
        quantity: v.quantity ? Number(v.quantity) : null,
        unitPrice: v.unitPrice ? Number(v.unitPrice) : null,
        supplierLotCode: v.supplierLotCode || null,
        raftId: v.raftId || null,
      })),
    });
    if (!parsed.success) {
      setError("Chọn nhà cung cấp, kiểm tra ngày và số lượng/đơn giá trên các dòng.");
      return;
    }
    setError(undefined);
    const question = complete
      ? "Hoàn thành phiếu nhập? Công nợ được ghi nhận, thanh toán thực hiện riêng."
      : "Lưu nháp phiếu nhập?";
    if (
      await editor.submit(question, () =>
        receipts.write(record ? "update" : "create", parsed.data, c.receipt, record?.id),
      )
    )
      onSaved();
  }

  /** One-line summary of the saved receipt, offered while a write is blocked. */
  const readCurrent = record
    ? () =>
        read
          .run(() => receipts.read("detail", { id: record.id }, c.receipt), true)
          .then((v) =>
            v ? `${v.code} · ${stateLabel(v.statusId)} · ${formatVndWithSymbol(v.total)}` : undefined,
          )
    : undefined;

  return (
    <div className={styles.editor}>
      {editor.dialog}
      {continueDraft && (
        <a className="font-semibold text-primary underline" href={`/operations/purchase-receipts/${record!.id}/edit`}>
          Mở phiếu tạm để tiếp tục
        </a>
      )}
      {record && <ReceiptRecordSummary record={record} />}
      <ErrorNotice
        error={error || editor.mutation.error || read.error || suppliers.error || items.error || rafts.error}
      />
      <details className={styles.receiptFields} open={!record || record.statusId === 1701}>
        <summary>
          {record && record.statusId !== 1701 ? "Thông tin chi tiết đã nhập" : "Thông tin phiếu và dòng vật tư"}
        </summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save(false);
          }}
        >
          <fieldset disabled={!editable || editor.disabled} className="space-y-4">
            <Select label="Nhà cung cấp *" required value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              <option value="">Chọn nhà cung cấp</option>
              {record && !suppliers.data?.some((v) => v.id === record.supplier.id) && (
                <option value={record.supplier.id}>{record.supplier.name}</option>
              )}
              {suppliers.data?.map((v) => (
                <option key={v.id} value={v.id}>
                  {String(v.name)}
                </option>
              ))}
            </Select>
            <Field
              label="Ngày nhập"
              type="date"
              max={businessToday()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Note label="Ghi chú" maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <ReceiptLineFields
              record={record}
              lines={lines}
              setLines={setLines}
              items={items.data}
              rafts={rafts.data}
              editable={editable}
            />
            {editable && (
              <div className="flex gap-3">
                <Button type="submit">Lưu nháp</Button>
                <Button type="button" onClick={() => void save(true)}>
                  Hoàn thành phiếu
                </Button>
              </div>
            )}
          </fieldset>
        </form>
      </details>
      {record && (
        <ReceiptReturnAndCancelActions
          record={record}
          owner={owner}
          own={own}
          allowed={allowed}
          editor={editor}
          read={read}
          reason={reason}
          returnQuantities={returnQuantities}
          setReturns={setReturns}
          onError={setError}
          onSaved={onSaved}
        />
      )}
      {record && (
        <Note
          label="Lý do trả hàng / hủy *"
          maxLength={2000}
          disabled={editor.disabled}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      <EditorClose editor={editor} readCurrent={readCurrent} />
    </div>
  );
}

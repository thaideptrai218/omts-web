"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DataTable, Field, Money, type useMutation } from "@/features/operations/ui";
import type { useOperationEditor } from "@/features/operations/use-operation-editor";
import { formatVietnameseDate } from "@/shared/format/date-only";
import * as c from "./contracts";
import { receiptsRepository as receipts, type Receipt } from "./purchasing-shared";
import styles from "./purchasing.module.css";

/**
 * Follow-up actions on a saved receipt. All of them use the shared "reason" note rendered by the editor:
 * - completed (1702) receipts: return goods (staff must confirm owner approval);
 * - returns: only the owner may cancel a recorded return;
 * - own drafts (1701) can be deleted; own completed receipts can be cancelled after a debt preview.
 */
export function ReceiptReturnAndCancelActions({
  record,
  owner,
  own,
  allowed,
  editor,
  read,
  reason,
  returnQuantities,
  setReturns,
  onError,
  onSaved,
}: {
  record: Receipt;
  owner: boolean;
  own: boolean;
  allowed(action: string): boolean;
  editor: ReturnType<typeof useOperationEditor>;
  read: ReturnType<typeof useMutation>;
  reason: string;
  /** Lifted to the editor because entered quantities make the editor dirty. */
  returnQuantities: Record<string, string>;
  setReturns: Dispatch<SetStateAction<Record<string, string>>>;
  onError(message: string): void;
  onSaved(): void;
}) {
  const [ownerApproved, setOwnerApproved] = useState(false);
  const [preview, setPreview] = useState<z.infer<typeof c.cancelPreview>>();

  async function recordReturn() {
    const values = Object.entries(returnQuantities)
      .filter(([, v]) => Number(v) > 0)
      .map(([receiptLineId, v]) => ({ receiptLineId, quantity: Number(v) }));
    if (!values.length) {
      onError("Nhập số lượng trả ít nhất một dòng.");
      return;
    }
    if (
      await editor.submit("Ghi nhận trả hàng? Ngày trả và số tiền do hệ thống tính.", () =>
        receipts.write("return", { reason, lines: values, ownerApproved }, c.receipt, record.id),
      )
    )
      onSaved();
  }

  return (
    <>
      <p className={styles.businessNote}>
        Thanh toán được ghi riêng theo nhà cung cấp; phiếu nhập dùng để ghi nhận hàng và đối chiếu công nợ.
      </p>
      {record.cancelReason && <p>Lý do hủy: {record.cancelReason}</p>}
      {record.statusId === 1702 && allowed("Create") && (
        <section className="my-4 space-y-3 border-t border-border pt-4">
          <h3 className="font-semibold">Trả hàng nhà cung cấp</h3>
          {record.lines
            .filter((v) => v.returnable > 0)
            .map((v) => (
              <Field
                key={v.id}
                label={`${v.itemName ?? "Vật tư"} · Còn được trả ${v.returnable} ${v.unit}`}
                type="number"
                min={0}
                max={v.returnable}
                step="0.001"
                disabled={editor.disabled}
                value={returnQuantities[v.id] ?? ""}
                onChange={(e) => setReturns((q) => ({ ...q, [v.id]: e.target.value }))}
              />
            ))}
          {!owner && (
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={ownerApproved}
                disabled={editor.disabled}
                onChange={(e) => setOwnerApproved(e.target.checked)}
              />
              Tôi đã được chủ hợp tác xã đồng ý việc trả hàng này
            </label>
          )}
          <Button disabled={editor.disabled || !reason.trim() || (!owner && !ownerApproved)} onClick={recordReturn}>
            Ghi nhận trả hàng
          </Button>
        </section>
      )}
      <DataTable headings={["Phiếu trả", "Ngày", "Giá trị", "Trạng thái", "Thao tác"]} empty={!record.returns.length}>
        {record.returns.map((v) => (
          <tr key={v.id}>
            <td>{v.code}</td>
            <td>{formatVietnameseDate(v.returnDate)}</td>
            <td>
              <Money value={v.returnValue} />
            </td>
            <td>{v.statusId === 1902 ? "Đã hủy" : v.status}</td>
            <td>
              {owner && v.statusId !== 1902 && (
                <Button
                  variant="secondary"
                  disabled={editor.disabled || !reason.trim()}
                  onClick={async () => {
                    if (
                      await editor.submit(`Hủy phiếu trả ${v.code}?`, () =>
                        receipts.write("cancel-return", { reason, rowVersion: v.rowVersion }, c.receipt, v.id),
                      )
                    )
                      onSaved();
                  }}
                >
                  Hủy phiếu trả
                </Button>
              )}
            </td>
          </tr>
        ))}
      </DataTable>
      {own && allowed("Delete") && record.statusId === 1701 && (
        <Button
          variant="secondary"
          disabled={editor.disabled}
          onClick={async () => {
            if (
              await editor.submit("Xóa phiếu nháp này?", () =>
                receipts.write("remove", {}, z.object({ done: z.literal(true) }), record.id),
              )
            )
              onSaved();
          }}
        >
          Xóa phiếu nháp
        </Button>
      )}
      {own && allowed("Delete") && record.statusId === 1702 && (
        <div className="my-4 space-y-3">
          <Button
            variant="secondary"
            disabled={editor.disabled || read.pending}
            onClick={async () => {
              const value = await read.run(
                () => receipts.read("cancel-preview", { id: record.id }, c.cancelPreview),
                true,
              );
              if (value) setPreview(value);
            }}
          >
            Kiểm tra trước khi hủy phiếu
          </Button>
          {preview && (
            <>
              <p className="text-sm">
                {preview.canCancel ? "Có thể hủy phiếu" : "Chưa thể hủy phiếu"}
                {preview.blocked ? ` · Liên quan ${preview.blocked.code}` : ""} · Nợ trước{" "}
                <Money value={preview.debtBefore} /> · Nợ sau <Money value={preview.debtAfter} /> · Trả trước sau hủy{" "}
                <Money value={preview.advanceAfter} />
              </p>
              {preview.canCancel && (
                <Button
                  disabled={editor.disabled || !reason.trim()}
                  onClick={async () => {
                    if (
                      await editor.submit("Hủy phiếu nhập? Các khoản thanh toán vẫn được giữ.", () =>
                        receipts.write("cancel", { reason, rowVersion: record.rowVersion }, c.receipt, record.id),
                      )
                    )
                      onSaved();
                  }}
                >
                  Xác nhận hủy phiếu
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

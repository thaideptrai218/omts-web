"use client";
import type { useActionDialog } from "@/components/ui/use-action-dialog";
import { Button } from "@/components/ui/button";
import * as c from "./contracts";
import { ReceiptTotals, receiptRepository } from "./receipt-shared";
import { DataTable, Money, methodLabel, statusLabel, type useMutation } from "./ui";

/**
 * Shown while a save is blocked (conflict or uncertain result): the draft is kept and the user can load
 * the server copy, compare it, then either keep editing on top of it or discard the draft.
 */
export function ReceiptConflictReview({
  record,
  latest,
  mutation,
  confirmation,
  onLatestLoaded,
  onKeepDraft,
  onUseLatest,
}: {
  record: c.Receipt | null;
  latest: c.Receipt | undefined;
  mutation: ReturnType<typeof useMutation>;
  confirmation: ReturnType<typeof useActionDialog>;
  onLatestLoaded(latest: c.Receipt): void;
  onKeepDraft(latest: c.Receipt): void;
  onUseLatest(latest: c.Receipt): void;
}) {
  return (
    <div className="my-4 rounded-control border border-border p-4">
      <p>Bản nháp đang được giữ. Hãy đối chiếu kết quả trước khi tiếp tục.</p>
      {record ? (
        <>
          <Button
            className="mt-3 w-auto"
            variant="secondary"
            disabled={mutation.pending}
            onClick={async () => {
              const value = await mutation.run(
                () => receiptRepository.read("detail", { id: record.id }, c.receiptSchema),
                true,
              );
              if (value) onLatestLoaded(value);
            }}
          >
            Tải bản mới để đối chiếu
          </Button>
          {latest && (
            <div className="mt-4">
              <p>
                {latest.code} · {statusLabel(latest.statusId)} · {latest.notes || "Không có ghi chú"}
              </p>
              <p className="mt-2">
                {latest.supplier.name} · {latest.zone.name} · Bè {latest.raft?.code ?? "chưa chọn"} · Ngày{" "}
                {latest.receiptDate ?? "chưa nhập"}
              </p>
              <p>
                Chiết khấu <Money value={latest.discountAmount} /> · Trả ngay <Money value={latest.amountPaidNow} /> ·{" "}
                {latest.paidNowMethod ? methodLabel(latest.paidNowMethod) : "Chưa chọn hình thức"}
              </p>
              <ReceiptTotals record={latest} />
              <DataTable headings={["Vật tư mới", "Số lượng", "Đơn giá", "Mã lô NCC", "Nguồn thực tế"]}>
                {latest.lines.map((row) => (
                  <tr key={row.id}>
                    <td>{row.itemName}</td>
                    <td>{row.quantity}</td>
                    <td>
                      <Money value={row.unitPrice} />
                    </td>
                    <td>{row.supplierLotCode ?? "—"}</td>
                    <td>{row.actualSource ?? "—"}</td>
                  </tr>
                ))}
              </DataTable>
              <div className="flex flex-wrap gap-2">
                {/* Only a still-draft (1701) server copy can be used as the new edit baseline. */}
                {latest.statusId === 1701 && (
                  <Button className="w-auto" variant="secondary" onClick={() => onKeepDraft(latest)}>
                    Đã đối chiếu, giữ bản nháp để sửa tiếp
                  </Button>
                )}
                <Button
                  className="w-auto"
                  variant="secondary"
                  onClick={async () => {
                    if (await confirmation.confirm("Bỏ bản nháp và dùng dữ liệu mới?")) onUseLatest(latest);
                  }}
                >
                  Dùng bản mới
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <a
          className="mt-3 block text-primary underline"
          href="/operations/purchase-receipts"
          target="_blank"
          rel="noreferrer"
        >
          Mở danh sách ở tab khác để kiểm tra
        </a>
      )}
    </div>
  );
}

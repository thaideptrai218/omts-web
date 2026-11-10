"use client";
import { z } from "zod";
import * as c from "./contracts";
import { DataTable, Money, methodLabel, statusLabel } from "./ui";

/** Saved goods lines with stocked / returned / still-returnable quantities. */
export function ReceiptLinesTable({ record }: { record: c.Receipt }) {
  return (
    <DataTable headings={["Vật tư", "Số lượng", "Thành tiền", "Lô giống", "Đã thả", "Đã trả", "Còn được trả"]}>
      {record.lines.map((row) => (
        <tr key={row.id}>
          <td>{row.itemName}</td>
          <td>
            {row.quantity} {row.unit}
          </td>
          <td>
            <Money value={row.lineAmount} />
          </td>
          <td>{row.seedLotCode ?? "—"}</td>
          <td>{row.stocked}</td>
          <td>{row.returnedQuantity}</td>
          <td>{row.returnable}</td>
        </tr>
      ))}
    </DataTable>
  );
}

/** Payment history, return history (each return code opens its detail) and the cancel reason. */
export function ReceiptPaymentAndReturnHistory({
  record,
  disabled,
  onOpenReturn,
}: {
  record: c.Receipt;
  disabled: boolean;
  onOpenReturn(returnId: string): void;
}) {
  return (
    <>
      <h3 className="mt-6 font-semibold">Lịch sử thanh toán</h3>
      <DataTable headings={["Ngày", "Số tiền", "Hình thức", "Trạng thái"]} empty={!record.payments.length}>
        {record.payments.map((row) => (
          <tr key={row.id}>
            <td>{row.paymentDate}</td>
            <td>
              <Money value={row.amount} />
            </td>
            <td>{methodLabel(row.method)}</td>
            <td>{statusLabel(row.statusId)}</td>
          </tr>
        ))}
      </DataTable>
      <h3 className="font-semibold">Lịch sử trả hàng</h3>
      <DataTable
        headings={["Phiếu trả", "Ngày", "Lý do", "Giá trị", "Hoàn tiền", "Giảm nợ"]}
        empty={!record.returns.length}
      >
        {record.returns.map((row) => (
          <tr key={row.id}>
            <td>
              <button className="text-primary underline" disabled={disabled} onClick={() => onOpenReturn(row.id)}>
                {row.code}
              </button>
            </td>
            <td>{row.returnDate}</td>
            <td>{row.reason}</td>
            <td>
              <Money value={row.returnValue} />
            </td>
            <td>
              <Money value={row.refundAmount} />
            </td>
            <td>
              <Money value={row.debtReductionAmount} />
            </td>
          </tr>
        ))}
      </DataTable>
      {record.cancelReason && <p className="my-3">Lý do hủy: {record.cancelReason}</p>}
    </>
  );
}

/** Lines of one supplier return, opened from the return history. */
export function ReturnDetailPanel({ detail }: { detail: z.infer<typeof c.returnSchema> }) {
  return (
    <div className="my-4 rounded-control border border-border p-4">
      <h3 className="font-semibold">Chi tiết {detail.code}</h3>
      <DataTable headings={["Vật tư", "Số lượng", "Giá trị trả"]}>
        {detail.lines.map((row) => (
          <tr key={row.receiptLineId}>
            <td>{row.itemName}</td>
            <td>
              {row.quantity} {row.unit}
            </td>
            <td>
              <Money value={row.returnValue} />
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

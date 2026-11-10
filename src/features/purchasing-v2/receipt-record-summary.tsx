"use client";
import { DataTable, Money } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { stateLabel, type Receipt } from "./purchasing-shared";
import styles from "./purchasing.module.css";

/** Status, supplier and totals of a saved receipt; non-draft receipts also list their lines read-only. */
export function ReceiptRecordSummary({ record }: { record: Receipt }) {
  return (
    <>
      <div className={styles.recordHeading}>
        <div>
          <span className={styles.status} data-state={record.statusId}>
            {stateLabel(record.statusId)}
          </span>
          <p>
            {record.supplier.name} · {formatVietnameseDate(record.receiptDate)}
          </p>
          <small>Người ghi nhận: {record.recordedBy.name}</small>
        </div>
        <dl>
          <div>
            <dt>Tổng tiền phiếu</dt>
            <dd>
              <Money value={record.total} />
            </dd>
          </div>
          <div>
            <dt>Giá trị đã trả hàng</dt>
            <dd>
              <Money value={record.returned} />
            </dd>
          </div>
        </dl>
      </div>
      {record.statusId !== 1701 && (
        <DataTable
          headings={["Vật tư / lô giống", "Bè sử dụng", "Số lượng", "Đơn giá", "Thành tiền", "Đã thả / đã trả"]}
          empty={!record.lines.length}
        >
          {record.lines.map((line) => (
            <tr key={line.id}>
              <td>
                <strong>{line.itemName ?? "Chưa chọn vật tư"}</strong>
                <span className={styles.secondary}>
                  {line.itemCode ?? "—"}
                  {line.seedLotCode ? ` · ${line.seedLotCode}` : ""}
                </span>
              </td>
              <td>{line.raft ? `${line.raft.zoneCode} · ${line.raft.code}` : "Không gắn bè"}</td>
              <td className="whitespace-nowrap text-right tabular-nums">
                {line.quantity?.toLocaleString("vi-VN") ?? "—"} {line.unit}
              </td>
              <td className="text-right">{line.unitPrice == null ? "—" : <Money value={line.unitPrice} />}</td>
              <td className="text-right">{line.lineAmount == null ? "—" : <Money value={line.lineAmount} />}</td>
              <td>
                <span>Đã thả: {line.seeded.toLocaleString("vi-VN")}</span>
                <span className={styles.secondary}>
                  Đã trả: {line.returnedQuantity.toLocaleString("vi-VN")} · Còn được trả:{" "}
                  {line.returnable.toLocaleString("vi-VN")}
                </span>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}

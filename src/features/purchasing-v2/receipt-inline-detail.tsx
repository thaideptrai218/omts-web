"use client";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, ErrorNotice, Money, Skeleton, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import * as c from "./contracts";
import { printReceipt } from "./print-receipt";
import { receiptsRepository as receipts, stateLabel } from "./purchasing-shared";
import styles from "./purchasing.module.css";

/** Read-only receipt summary shown when a list row is expanded; can print or open the full receipt. */
export function ReceiptInlineDetail({ id, onOpen }: { id: string; onOpen(): void }) {
  const remote = useRemote(
    useMemo(() => (signal: AbortSignal) => receipts.read("detail", { id }, c.receipt, signal), [id]),
  );
  return (
    <section className={styles.inlineDetail} aria-label="Thông tin phiếu nhập" aria-busy={remote.loading}>
      <ErrorNotice error={remote.error} />
      {remote.loading ? (
        <Skeleton />
      ) : (
        remote.data && (
          <>
            <header>
              <h3>{remote.data.code}</h3>
              <span className={styles.status} data-state={remote.data.statusId}>
                {stateLabel(remote.data.statusId)}
              </span>
            </header>
            <dl className={styles.receiptFacts}>
              <div>
                <dt>Người lập</dt>
                <dd>{remote.data.recordedBy.name}</dd>
              </div>
              <div>
                <dt>Ngày nhập</dt>
                <dd>{formatVietnameseDate(remote.data.receiptDate)}</dd>
              </div>
              <div>
                <dt>Nhà cung cấp</dt>
                <dd>{remote.data.supplier.name}</dd>
              </div>
            </dl>
            <DataTable
              responsive
              headings={["Mã / tên hàng", "Đơn vị", "Số lượng", "Đơn giá", "Bè sử dụng", "Thành tiền"]}
              empty={!remote.data.lines.length}
            >
              {remote.data.lines.map((line) => (
                <tr key={line.id}>
                  <td data-label="Mã / tên hàng">
                    <strong>{line.itemName ?? "Chưa chọn mặt hàng"}</strong>
                    <span className={styles.secondary}>
                      {line.itemCode ?? "—"}
                      {line.seedLotCode ? ` · ${line.seedLotCode}` : ""}
                    </span>
                  </td>
                  <td data-label="Đơn vị">{line.unit}</td>
                  <td data-label="Số lượng" className={styles.amount}>
                    {line.quantity?.toLocaleString("vi-VN") ?? "—"}
                  </td>
                  <td data-label="Đơn giá" className={styles.amount}>
                    {line.unitPrice == null ? "—" : <Money value={line.unitPrice} />}
                  </td>
                  <td data-label="Bè sử dụng">{line.raft ? `${line.raft.code} (${line.raft.zoneCode})` : "—"}</td>
                  <td data-label="Thành tiền" className={styles.amount}>
                    {line.lineAmount == null ? "—" : <Money value={line.lineAmount} />}
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className={styles.receiptFoot}>
              <p>{remote.data.notes || "Không có ghi chú."}</p>
              <strong>
                Tổng tiền phiếu <Money value={remote.data.total} />
              </strong>
            </div>
            {remote.data.cancelReason && <p>Lý do hủy: {remote.data.cancelReason}</p>}
            {remote.data.returns.length > 0 && (
              <details className={styles.receiptFields}>
                <summary>Trả hàng nhập · {remote.data.returns.length} phiếu</summary>
                <DataTable
                  responsive
                  headings={["Phiếu trả", "Ngày trả", "Giá trị", "Lý do", "Trạng thái"]}
                  empty={false}
                >
                  {remote.data.returns.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Phiếu trả">{item.code}</td>
                      <td data-label="Ngày trả">{formatVietnameseDate(item.returnDate)}</td>
                      <td data-label="Giá trị">
                        <Money value={item.returnValue} />
                      </td>
                      <td data-label="Lý do">{item.reason}</td>
                      <td data-label="Trạng thái">{item.statusId === 1902 ? "Đã hủy" : "Đã ghi nhận"}</td>
                    </tr>
                  ))}
                </DataTable>
              </details>
            )}
            <footer>
              <Button className="w-auto" variant="secondary" onClick={() => printReceipt(remote.data!)}>
                In / Lưu PDF
              </Button>
              <Button className="w-auto" onClick={onOpen}>
                Mở phiếu
              </Button>
            </footer>
          </>
        )
      )}
      {remote.error && (
        <Button variant="secondary" onClick={remote.reload}>
          Tải lại phiếu
        </Button>
      )}
    </section>
  );
}

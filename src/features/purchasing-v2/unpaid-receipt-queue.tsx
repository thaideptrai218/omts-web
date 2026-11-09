"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, ErrorNotice, Money, Paging, Skeleton, useRemote } from "@/features/operations/ui";
import * as c from "./contracts";
import { paymentsRepository as payments } from "./purchasing-shared";
import { ReceiptDialog } from "./receipt-dialog";
import styles from "./purchasing.module.css";

const QUEUE_PAGE_SIZE = 10;

/** Completed receipts of one supplier that still have an amount to pay; each can prefill a payment. */
export function UnpaidReceiptQueue({
  supplierId,
  canPay,
  onPay,
}: {
  supplierId: string;
  canPay: boolean;
  onPay(draft: { supplierId: string; amount?: number; note?: string }): void;
}) {
  const [receiptId, setReceiptId] = useState<string>();
  const [page, setPage] = useState(1);
  const debt = useRemote(
    useMemo(
      () => (signal: AbortSignal) =>
        supplierId
          ? payments.read("debt", { supplierId }, c.debt, signal)
          : Promise.resolve({ status: "success" as const, data: null }),
      [supplierId],
    ),
  );
  const unpaidCount = debt.data?.unpaidReceipts.length ?? 0;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(unpaidCount / QUEUE_PAGE_SIZE)));

  return (
    <section className="my-6 border-y border-border py-4">
      <h2 className="text-lg font-semibold">Phiếu mua hàng còn phải thanh toán</h2>
      <p className="mt-1 text-sm text-text-muted">
        Chọn nhà cung cấp phía trên để đối chiếu các phiếu đã hoàn thành và số tiền còn nợ.
      </p>
      <ErrorNotice error={debt.error} />
      {debt.loading ? (
        <Skeleton />
      ) : (
        debt.data && (
          <>
            <p className="mt-3 text-sm">
              {debt.data.supplier.name} · Còn nợ <Money value={debt.data.debtToday} />
            </p>
            <DataTable
              headings={[
                "Phiếu nhập",
                "Ngày nhập",
                "Giá trị phiếu",
                "Đã được thanh toán/bù trừ",
                "Còn phải trả",
                "Thao tác",
              ]}
              empty={!debt.data.unpaidReceipts.length}
            >
              {debt.data.unpaidReceipts
                .slice((currentPage - 1) * QUEUE_PAGE_SIZE, currentPage * QUEUE_PAGE_SIZE)
                .map((v) => (
                  <tr key={v.id}>
                    <td>
                      <button className="text-primary underline" onClick={() => setReceiptId(v.id)}>
                        {v.code}
                      </button>
                    </td>
                    <td>{v.receiptDate.split("-").reverse().join("/")}</td>
                    <td>
                      <Money value={v.total} />
                    </td>
                    <td>
                      <Money value={v.covered} />
                    </td>
                    <td>
                      <Money value={v.remaining} />
                    </td>
                    <td>
                      {canPay && v.remaining > 0 && (
                        <Button
                          className="w-auto"
                          onClick={() =>
                            onPay({
                              supplierId,
                              amount: v.remaining,
                              note: `Thanh toán nhà cung cấp, đối chiếu phiếu ${v.code}`,
                            })
                          }
                        >
                          Lập thanh toán
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
            </DataTable>
            <div className={styles.paging}>
              <Paging page={currentPage} total={unpaidCount} pageSize={QUEUE_PAGE_SIZE} onChange={setPage} />
            </div>
            <p className="text-xs text-text-muted">
              Khoản thanh toán được ghi theo nhà cung cấp; công nợ và phần bù trừ trên từng phiếu do hệ thống tính.
            </p>
          </>
        )
      )}
      {debt.error && (
        <Button className="w-auto" variant="secondary" onClick={debt.reload}>
          Tải lại phiếu còn nợ
        </Button>
      )}
      {receiptId && (
        <ReceiptDialog
          id={receiptId}
          onClose={() => setReceiptId(undefined)}
          onSaved={() => {
            setReceiptId(undefined);
            debt.reload();
          }}
        />
      )}
    </section>
  );
}

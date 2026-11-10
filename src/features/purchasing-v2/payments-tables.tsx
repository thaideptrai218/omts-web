"use client";
import type { z } from "zod";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { DataTable, Money } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type * as c from "./contracts";
import type { Payment } from "./purchasing-shared";
import styles from "./purchasing.module.css";

/** Supplier transactions; the row, its code and "Xem giao dịch →" all open the transaction. */
export function PaymentHistoryTable({ items, onOpen }: { items: Payment[] | undefined; onOpen(row: Payment): void }) {
  return (
    <DataTable
      headings={["Giao dịch / ngày", "Nhà cung cấp", "Loại giao dịch", "Số tiền", "Trạng thái", "Hồ sơ"]}
      empty={!items?.length}
    >
      {items?.map((row) => (
        <OpenableTableRow key={row.id} onOpen={() => onOpen(row)}>
          <td>
            <button type="button" className={styles.receiptCode} onClick={() => onOpen(row)}>
              {row.code}
            </button>
            <span className={styles.secondary}>{formatVietnameseDate(row.paymentDate)}</span>
          </td>
          <td>{row.supplier.name}</td>
          <td>{row.kind === "Payment" ? "Chi trả nhà cung cấp" : "Nhà cung cấp trả lại tiền"}</td>
          <td className={styles.amount}>
            <Money value={row.amount} />
          </td>
          <td>
            <span className={styles.status}>{row.statusId === 1802 ? "Đã hủy" : "Đã ghi nhận"}</span>
          </td>
          <td>
            <button type="button" className={styles.textAction} onClick={() => onOpen(row)}>
              Xem giao dịch →
            </button>
          </td>
        </OpenableTableRow>
      ))}
    </DataTable>
  );
}

type SupplierDebt = z.infer<typeof c.debts>["page"]["items"][number];

/** Cooperative-wide debt per supplier (negative = advance); a supplier name filters the transactions. */
export function SupplierDebtTable({
  items,
  onChooseSupplier,
}: {
  items: SupplierDebt[] | undefined;
  onChooseSupplier(id: string, name: string): void;
}) {
  return (
    <DataTable headings={["Nhà cung cấp", "Công nợ", "Tuổi nợ (ngày)", "Ngày nợ cũ nhất"]} empty={!items?.length}>
      {items?.map((row) => (
        <tr key={row.supplier.id}>
          <td>
            <button
              type="button"
              className={styles.receiptCode}
              onClick={() => onChooseSupplier(row.supplier.id, row.supplier.name)}
            >
              {row.supplier.name}
            </button>
          </td>
          <td className="text-right tabular-nums">
            <Money value={row.debt} />
          </td>
          <td className="text-right">{row.debtAgeDays ?? "—"}</td>
          <td>{row.oldestUnpaidDate ? formatVietnameseDate(row.oldestUnpaidDate) : "—"}</td>
        </tr>
      ))}
    </DataTable>
  );
}

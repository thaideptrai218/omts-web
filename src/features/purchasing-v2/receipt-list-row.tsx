"use client";
import { Money } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { z } from "zod";
import type * as c from "./contracts";
import { stateLabel } from "./purchasing-shared";
import { ReceiptInlineDetail } from "./receipt-inline-detail";
import styles from "./purchasing.module.css";

type ReceiptListItem = z.infer<typeof c.row>;

/**
 * A receipt row that toggles an inline detail row. Clicking anywhere on the row toggles it,
 * except clicks on nested buttons, links or inputs, which handle themselves.
 */
export function ReceiptListRow({
  row,
  expanded,
  onToggle,
  onOpen,
}: {
  row: ReceiptListItem;
  expanded: boolean;
  onToggle(): void;
  onOpen(): void;
}) {
  return (
    <>
      <tr
        className={styles.selectableRow}
        data-selected={expanded || undefined}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest("button,a,input")) onToggle();
        }}
      >
        <td data-label="Phiếu / ngày nhập">
          <button type="button" className={styles.receiptCode} aria-expanded={expanded} onClick={onToggle}>
            {row.code}
          </button>
          <span className={styles.secondary}>{formatVietnameseDate(row.receiptDate)}</span>
        </td>
        <td data-label="Nhà cung cấp">
          <strong>{row.supplier.name}</strong>
          <span className={styles.secondary}>{row.supplier.phoneNumber || "Chưa có số liên hệ"}</span>
        </td>
        <td data-label="Tổng tiền" className={styles.amount}>
          <Money value={row.total} />
        </td>
        <td data-label="Trạng thái">
          <span className={styles.status} data-state={row.statusId}>
            {stateLabel(row.statusId)}
          </span>
        </td>
        <td data-label="Hồ sơ">
          <button type="button" className={styles.textAction} aria-expanded={expanded} onClick={onToggle}>
            {expanded ? "Thu gọn" : "Xem chi tiết"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className={styles.expandedCell}>
            <ReceiptInlineDetail id={row.id} onOpen={onOpen} />
          </td>
        </tr>
      )}
    </>
  );
}

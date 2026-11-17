"use client";
import Link from "next/link";
import { useCallback } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { customerHref, invoiceHref } from "@/features/customers/customer-links";
import { Skeleton, useRemote } from "@/features/operations/ui";
import { disposalHref } from "@/features/product-disposals/disposal-parts";
import { productHref } from "@/features/products/product-helpers";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import styles from "@/features/purchase-documents/purchases.module.css";
import { orderHref } from "@/features/sales-orders/order-labels";
import { salesReturnHref } from "@/features/sales-returns/return-labels";
import type { LotMovement } from "./contracts";
import { movementKindLabel } from "./lot-labels";
import { lotRepository } from "./repository";

/** Where the document of a movement opens, by its code: a sale is an invoice, a return is a sales return, a disposal is a product disposal; the other kinds have no screen of their own. */
export function movementDocumentHref(movement: Pick<LotMovement, "kind" | "documentCode">) {
  if (!movement.documentCode) return undefined;
  if (movement.kind === "Sale") return invoiceHref(movement.documentCode);
  if (movement.kind === "Return") return salesReturnHref(movement.documentCode);
  if (movement.kind === "Disposal") return disposalHref(movement.documentCode);
  return undefined;
}

/** Tab "Bán hàng": what the lot gave and what left it, oldest first: the harvest, each sale (with its order), disposal and return, and the kg taken off when the lot was closed. */
export function LotSalesTab({ lotId, zoneId }: { lotId: string; zoneId: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => lotRepository.movements(lotId, zoneId, signal), [lotId, zoneId]));
  if (remote.loading) return <Skeleton />;
  if (remote.error) return <ListStateMessage error={remote.error} onRetry={remote.reload} retryLabel="Tải lại lịch sử bán" />;
  if (!remote.data?.length) return <p className={styles.empty}>Lô chưa có lần bán hay xuất nào.</p>;
  return <div className={styles.innerScroll}><table className={styles.inner} aria-label="Bán hàng của lô">
    <thead><tr><th>Thời gian</th><th>Loại</th><th>Chứng từ</th><th>Đơn đặt hàng</th><th>Sản phẩm</th><th>Đối tác</th><th className={styles.num}>Số kg</th><th className={styles.num}>Đơn giá</th></tr></thead>
    <tbody>{remote.data.map((movement) => {
      const href = movementDocumentHref(movement);
      return <tr key={movement.id}>
        <td>{viDateTime(movement.occurredAt)}</td><td>{movementKindLabel[movement.kind] ?? movement.kind}</td>
        <td>{movement.documentCode ? href ? <Link className={styles.link} href={href}>{movement.documentCode}</Link> : movement.documentCode : "—"}</td>
        <td>{movement.kind === "Sale" && movement.salesOrderCode ? <Link className={styles.link} href={orderHref(movement.salesOrderCode)}>{movement.salesOrderCode}</Link> : "—"}</td>
        <td>{movement.productName ? movement.productCode ? <Link className={styles.link} href={productHref(movement.productCode)}>{movement.productName}</Link> : movement.productName : "—"}</td>
        <td>{movement.partyName ? movement.partyCode ? <Link className={styles.link} href={customerHref(movement.partyCode)}>{movement.partyName}</Link> : movement.partyName : "—"}</td>
        <td className={styles.num}>{fmt(movement.quantityKg)}</td><td className={styles.num}>{fmt(movement.transactionPrice)}</td>
      </tr>;
    })}</tbody></table></div>;
}

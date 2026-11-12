"use client";
import { SideRow } from "@/features/purchase-documents/document-parts";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import styles from "./plans.module.css";
import { coverageQuantity, coverageText, type CoverageRow } from "./plan-logic";

/**
 * The side block of the plan editor that sets what the linked orders still need of each product against the cages the lines of the plan expect of it:
 * Cần, Dự kiến and Trạng thái (Đủ, Thiếu or Dư) in the unit of the orders (kg when the orders mix units).
 */
export function PlanCoverage({ rows, loading, error, onRetry }: { rows: readonly CoverageRow[]; loading: boolean; error?: string; onRetry(): void }) {
  return <fieldset className="grid min-w-0 gap-2" aria-label="Đáp ứng đơn đặt hàng">
    <legend className="mb-1 text-[13px] font-semibold">Đáp ứng đơn đặt hàng</legend>
    {loading ? <p className={purchaseStyles.sub}>Đang tải hàng của đơn…</p>
      : error ? <p className={purchaseStyles.sub} role="alert">Không tải được hàng của đơn. <button type="button" className={styles.retry} onClick={onRetry}>Tải lại</button></p>
        : !rows.length ? <p className={purchaseStyles.sub}>Các đơn liên kết không còn hàng phải giao.</p>
          : rows.map((row) => <div key={row.productId} className={styles.coverage}>
            <strong>{row.productName}</strong>
            <SideRow label="Cần">{coverageQuantity(row.need, row.unit)}</SideRow>
            <SideRow label="Dự kiến">{row.planned == null ? "—" : coverageQuantity(row.planned, row.unit)}</SideRow>
            <SideRow label="Trạng thái"><span className={styles.coverageState} data-state={row.state}>{coverageText(row)}</span></SideRow>
          </div>)}
    {!loading && rows.some((row) => row.state === "unknown") && <p className={purchaseStyles.sub}>Chưa có số kg/lồng trung bình nên chưa quy đổi lồng ra đơn vị của đơn.</p>}
  </fieldset>;
}

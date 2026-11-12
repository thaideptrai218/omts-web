"use client";
import { Money } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { allRates, type Job } from "./job-types-model";
import styles from "./job-types-screen.module.css";

/** Rate versions are immutable from this view; absent legacy metadata stays empty. */
export function JobTypeRateHistory({ record }: { record: Job }) {
  const rates = allRates(record);
  return <div className={styles.rateTable}><table aria-label="Lịch sử đơn giá">
    <thead><tr><th scope="col">Đơn giá (₫/giờ)</th><th scope="col">Từ ngày</th><th scope="col">Đến ngày</th><th scope="col">Người đổi</th><th scope="col">Ghi chú</th></tr></thead>
    <tbody>{rates.map(rate => <tr key={rate.effectiveFrom}>
      <td><Money value={rate.hourlyRate} />/giờ{rate.effectiveFrom === record.currentRate?.effectiveFrom && <span className={styles.currentTag}>Hiện tại</span>}</td>
      <td>{formatVietnameseDate(rate.effectiveFrom)}</td><td>{rate.effectiveTo ? formatVietnameseDate(rate.effectiveTo) : "—"}</td>
      <td>{rate.changedByName || "—"}</td><td>{rate.note || "—"}{rate.usedInFinalizedPayroll && <p className={styles.hint}>{rate.lockedReason || "Đã dùng trong kỳ lương đã chốt; không thể chỉnh sửa phiên bản này."}</p>}</td>
    </tr>)}{!rates.length && <tr><td colSpan={5} className={styles.emptyCell}>Chưa có phiên bản đơn giá.</td></tr>}</tbody>
  </table></div>;
}

"use client";
import { useId, useState, type ReactNode } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import type { EndOfDayMethod } from "./end-of-day-contracts";
import styles from "./end-of-day-report.module.css";

export const FUND_LABEL: Record<EndOfDayMethod, string> = { Cash: "Tiền mặt", Bank: "Ngân hàng", EWallet: "Ví điện tử" };
export const SOURCE_LABEL: Record<string, string> = {
  CustomerPayment: "Thu tiền khách", CustomerPaidBack: "Hoàn tiền khách", SupplierPayment: "Chi trả nhà cung cấp", SupplierPaidBack: "Nhà cung cấp hoàn tiền", CashVoucher: "Phiếu thu/chi",
};

const timeFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
/** Giờ trong ngày (theo múi giờ Việt Nam) của một mốc thời gian backend trả; mốc lỗi hiện "—". */
export function clockTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : timeFormat.format(date);
}

/**
 * CSS khi in: chỉ in phần báo cáo (đánh dấu data-end-of-day-print), ẩn menu, thanh công cụ và bộ lọc, mở hết các khối đã thu gọn.
 * Gắn trong màn để chỉ có hiệu lực khi đang ở báo cáo này.
 */
export const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  [data-end-of-day-print], [data-end-of-day-print] * { visibility: visible !important; }
  [data-end-of-day-print] { position: absolute !important; left: 0; top: 0; width: 100% !important; padding: 0 !important; }
  *:has([data-end-of-day-print]) { overflow: visible !important; height: auto !important; max-height: none !important; }
  [data-end-of-day-body][hidden] { display: block !important; }
}`;

type SectionProps = Readonly<{ title: string; summary: string; children: ReactNode }>;

/** Khối báo cáo thu gọn được (mặc định mở): tiêu đề kèm dòng tóm tắt, bấm để thu/mở; khi in luôn mở. */
export function EndOfDaySection({ title, summary, children }: SectionProps) {
  const [open, setOpen] = useState(true), bodyId = useId();
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading} data-end-of-day-heading>
        <button type="button" className={styles.sectionToggle} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((value) => !value)}>
          <InterfaceIcon name={open ? "chevron-down" : "chevron-right"} className="size-4" />
          <span>{title}</span><small>{summary}</small>
        </button>
      </h2>
      <div id={bodyId} className={styles.sectionBody} data-end-of-day-body hidden={!open}>{children}</div>
    </section>
  );
}

/** Dòng chữ nhỏ cho danh sách rỗng trong một khối. */
export function EmptyNote({ children }: Readonly<{ children: ReactNode }>) {
  return <p className={styles.empty}>{children}</p>;
}

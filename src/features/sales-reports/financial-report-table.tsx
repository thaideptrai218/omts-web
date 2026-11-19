"use client";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { vnd } from "./report-format";
import type { FinancialReport, FinancialRow } from "./financial-report-contracts";
import t from "./report-live.module.css";
import f from "./financial-report.module.css";

const ROW_LABELS: Readonly<Record<string, string>> = {
  revenue: "Doanh thu bán hàng", "invoice-discounts": "Chiết khấu hóa đơn", "price-cuts": "Giảm giá sau bán", "sales-returns": "Hàng bán bị trả lại", "payment-discounts": "Chiết khấu thanh toán",
  "net-revenue": "Doanh thu thuần", "input-use-cost": "Giống và vật tư đã xuất dùng", "input-disposal-cost": "Vật tư hủy", "labor-cost": "Nhân công (lương đã chốt)",
  "other-expense": "Chi phí khác", "other-income": "Thu nhập khác", profit: "Lợi nhuận",
};
export const rowLabel = (row: FinancialRow) => ROW_LABELS[row.code] ?? row.code;

/** Nhãn cột kỳ: backend trả 2026-11, 2026-Q4 hoặc 2026; đổi sang kiểu Việt Nam (11/2026, Quý 4/2026, Năm 2026). */
export function columnLabel(label: string): string {
  const month = /^(\d{4})-(\d{2})$/.exec(label), quarter = /^(\d{4})-Q(\d)$/.exec(label);
  if (month) return `${month[2]}/${month[1]}`;
  if (quarter) return `Quý ${quarter[2]}/${quarter[1]}`;
  return /^\d{4}$/.test(label) ? `Năm ${label}` : label;
}

const Money = ({ value }: Readonly<{ value: number }>) => <span className={value < 0 ? f.negative : undefined}>{vnd(value)}</span>;

/**
 * Bảng kết quả kinh doanh: mỗi dòng một chỉ tiêu, mỗi cột một kỳ và cột Tổng. Khoản giảm trừ và chi phí là số âm (màu đỏ);
 * dòng Doanh thu thuần và Lợi nhuận in đậm; khoản giảm trừ và chi phí thụt vào dưới dòng chính.
 */
export function FinancialReportTable({ report }: Readonly<{ report: FinancialReport }>) {
  return (
    <div className={t.tableFrame} role="region" aria-label="Kết quả kinh doanh theo kỳ" tabIndex={0}>
      <table className={t.table}>
        <caption className={t.srOnly}>Kết quả kinh doanh từ {formatVietnameseDate(report.from)} đến {formatVietnameseDate(report.to)}</caption>
        <thead><tr>
          <th scope="col" className={f.sticky}>Chỉ tiêu</th>
          {report.columns.map((column) => <th key={column.key} scope="col" className={t.right}>{columnLabel(column.label)}</th>)}
          <th scope="col" className={`${t.right} ${f.sumColumn}`}>Tổng</th>
        </tr></thead>
        <tbody>{report.rows.map((row) => (
          <tr key={row.code} className={row.isTotal ? f.total : row.section === "deduction" || row.section === "cost" ? f.sub : undefined}>
            <th scope="row" className={f.sticky}>{rowLabel(row)}</th>
            {row.values.map((value, index) => <td key={report.columns[index]?.key ?? index} className={t.right}><Money value={value} /></td>)}
            <td className={`${t.right} ${f.sumColumn}`}><Money value={row.total} /></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

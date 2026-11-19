import type { EndOfDayReport } from "../end-of-day-contracts";
import type { EodDocument } from "../end-of-day-model";
import { buildGoods } from "./goods";
import { buildMoney } from "./money";
import { buildSales } from "./sales";
import { buildSummary } from "./summary";

const EMPTY: EodDocument = { tiles: [], tables: [] };

/** Mô hình tài liệu của khối thuộc mối quan tâm đang xem; khối vắng mặt (backend chưa trả) cho tài liệu rỗng. */
export function buildDocument(report: EndOfDayReport): EodDocument {
  switch (report.concern) {
    case "sales": return report.sales ? buildSales(report.sales) : EMPTY;
    case "money": return report.money ? buildMoney(report.money) : EMPTY;
    case "goods": return report.goods ? buildGoods(report.goods) : EMPTY;
    case "summary": return report.summary ? buildSummary(report.summary) : EMPTY;
  }
}

/** Báo cáo không có số liệu nào: backend báo MSG-GEN-10, hoặc khối của mối quan tâm không có dòng nào (tổng hợp thì mọi số đều 0). */
export function isReportEmpty(report: EndOfDayReport): boolean {
  if (report.messageCode === "MSG-GEN-10") return true;
  switch (report.concern) {
    case "sales": return !report.sales || report.sales.groups.every((group) => group.rows.length === 0 && group.count === 0);
    case "money": return !report.money || report.money.entries.length === 0;
    case "goods": return !report.goods || (report.goods.products.length === 0 && report.goods.lots.length === 0);
    case "summary": {
      const { summary } = report;
      return !summary || (summary.sales.orderCount + summary.sales.invoiceCount + summary.sales.returnCount + summary.goods.lotCount === 0 && summary.money.totals.receipts === 0 && summary.money.totals.payments === 0);
    }
  }
}

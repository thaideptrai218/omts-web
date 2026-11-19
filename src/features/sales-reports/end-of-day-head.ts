import type { EndOfDayReport } from "./end-of-day-contracts";
import {
  CHANNEL_LABEL, CONCERN_TITLE, FUND_LABEL, PARTY_KIND_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_TERM_LABEL, SOURCE_LABEL, type EndOfDayFilters, type ListKey,
} from "./end-of-day-filters-model";
import { stampText } from "./end-of-day-model";
import type { PaperHead } from "./end-of-day-paper/paper-flow";

/** Dòng điều kiện lọc của từng mối quan tâm: nhãn, khóa danh sách và (với giá trị cố định) bảng nhãn; tên người / khách / sản phẩm lấy từ phản hồi. */
const LINES: Record<EndOfDayReport["concern"], readonly (readonly [string, ListKey, Record<string, string>?])[]> = {
  sales: [["Khách hàng", "customerIds"], ["Nhân viên nhận đặt", "receivedBy"], ["Người tạo", "createdBy"], ["Phương thức thanh toán", "paymentMethods", PAYMENT_METHOD_LABEL], ["Kênh bán", "channels", CHANNEL_LABEL], ["Hình thức thanh toán", "paymentTerms", PAYMENT_TERM_LABEL]],
  money: [["Quỹ", "funds", FUND_LABEL], ["Nguồn", "sources", SOURCE_LABEL], ["Loại thu chi", "typeIds"], ["Đối tượng", "partyKinds", PARTY_KIND_LABEL], ["Người tạo", "createdBy"]],
  goods: [["Sản phẩm", "productIds"], ["Nhóm hàng", "categoryIds"], ["Khách hàng", "customerIds"], ["Người tạo", "createdBy"]],
  summary: [["Người tạo", "createdBy"]],
};

/**
 * Đầu trang báo cáo: ngày lập, tiêu đề theo mối quan tâm và các dòng điều kiện (Thời gian, Vùng nuôi, rồi chỉ các tiêu chí đã chọn, hiện tên chứ không hiện "đã chọn").
 */
export function buildPaperHead(report: EndOfDayReport, filters: EndOfDayFilters): PaperHead {
  const names = new Map<string, string>();
  for (const group of [report.filters.zones, report.filters.customers, report.filters.products, report.filters.categories, report.filters.people, report.filters.receivedBy, report.filters.createdBy, report.filters.types]) for (const item of group) names.set(item.id, item.name);
  const nameOf = (id: string, labels?: Record<string, string>) => labels?.[id] ?? names.get(id) ?? "(không rõ)";
  const lines = [`Thời gian: ${stampText(report.from)} - ${stampText(report.to)}`];
  if (report.concern !== "money") lines.push(`Vùng nuôi: ${filters.zoneIds.length ? filters.zoneIds.map((id) => nameOf(id)).join(", ") : "Tất cả"}`);
  for (const [label, key, labels] of LINES[report.concern]) if (filters[key].length) lines.push(`${label}: ${filters[key].map((id) => nameOf(id, labels)).join(", ")}`);
  return { createdAt: stampText(report.computedAt), title: `Báo cáo cuối ngày về ${CONCERN_TITLE[report.concern]}`, lines };
}

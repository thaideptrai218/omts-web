import "server-only";
import { z } from "zod";
import {
  endOfDayChannels, endOfDayConcerns, endOfDayFunds, endOfDayOrientations, endOfDayPartyKinds, endOfDayPaymentMethods, endOfDayPaymentTerms, endOfDayReport, endOfDaySources,
} from "@/features/sales-reports/end-of-day-contracts";
import type { OperationPlan } from "./operation-plan";

const MAX_IDS = 50;
// Danh sách đến từ trình duyệt dạng "a,b,c": mỗi phần tử hợp lệ, không trùng, tối đa `max` phần tử.
const split = (max: number) => z.string().max(max * 37).transform((value) => value.split(","));
const unique = (values: string[]) => [...new Set(values)];
const idList = split(MAX_IDS).pipe(z.array(z.guid()).min(1).max(MAX_IDS)).transform(unique);
const enumList = <const V extends readonly [string, ...string[]]>(values: V) => split(values.length).pipe(z.array(z.enum(values)).min(1).max(values.length)).transform(unique);
// Giờ Việt Nam đến phút: yyyy-MM-ddTHH:mm (ngày phải có thật).
const minute = z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/).refine((value) => z.iso.date().safeParse(value.slice(0, 10)).success);

const readQuery = z.strictObject({
  action: z.enum(["report", "export"]), concern: z.enum(endOfDayConcerns).optional(), from: minute.optional(), to: minute.optional(),
  zoneIds: idList.optional(), customerIds: idList.optional(), receivedBy: idList.optional(), createdBy: idList.optional(),
  paymentMethods: enumList(endOfDayPaymentMethods).optional(), channels: enumList(endOfDayChannels).optional(), paymentTerms: enumList(endOfDayPaymentTerms).optional(),
  funds: enumList(endOfDayFunds).optional(), sources: enumList(endOfDaySources).optional(), typeIds: idList.optional(), partyKinds: enumList(endOfDayPartyKinds).optional(),
  productIds: idList.optional(), categoryIds: idList.optional(),
  format: z.enum(["pdf", "xlsx"]).optional(), orientation: z.enum(endOfDayOrientations).optional(), expanded: z.enum(["true", "false"]).optional(),
});

/** Tham số danh sách chuyển nguyên sang backend (lặp tham số), theo thứ tự cố định. */
const LISTS = ["zoneIds", "customerIds", "receivedBy", "createdBy", "paymentMethods", "channels", "paymentTerms", "funds", "sources", "typeIds", "partyKinds", "productIds", "categoryIds"] as const;

/**
 * Kế hoạch gọi backend cho báo cáo Cuối ngày (REPORT end-of-day): đọc báo cáo theo mối quan tâm + khoảng giờ + tiêu chí riêng (View) và xuất
 * PDF hoặc Excel kèm hướng giấy và có mở rộng chi tiết hay không (Export). Chỉ đọc; backend giới hạn vùng theo quyền SALES_REPORTS của người gọi.
 */
export function endOfDayReportPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (method !== "GET" || input !== undefined || [...query.keys()].length !== new Set(query.keys()).size) return;
  const parsed = readQuery.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const data = parsed.data, { action, from, to } = data;
  if (from && to && from > to) return;
  const exportOnly = data.format !== undefined || data.orientation !== undefined || data.expanded !== undefined;
  if (exportOnly && action !== "export") return;
  const params = new URLSearchParams();
  if (data.concern) params.set("concern", data.concern);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  for (const key of LISTS) for (const value of data[key] ?? []) params.append(key, value);
  const base = { area: "end-of-day-report" as const, action, method: "GET" as const };
  if (action === "export") {
    // PDF hoặc Excel (mặc định); backend đặt tên tệp BaoCaoCuoiNgay_{BanHang|ThuChi|HangHoa|TongHop}_yyyyMMdd[-yyyyMMdd].
    if (data.format) params.set("format", data.format);
    if (data.orientation) params.set("orientation", data.orientation);
    if (data.expanded) params.set("expanded", data.expanded);
    return { ...base, path: `/api/reports/end-of-day/export${params.size ? `?${params}` : ""}`, permission: "Export", schema: z.strictObject({}), file: "export", ...(data.format === "pdf" ? { exportFormat: "pdf" as const } : {}) };
  }
  return { ...base, path: `/api/reports/end-of-day${params.size ? `?${params}` : ""}`, permission: "View", schema: endOfDayReport };
}

import { customRange } from "@/components/ui/management-screen/time-range-limits";
import { fromQueryDate, presetValue, toQueryDate, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import type { Query } from "@/features/operations/repository";
import {
  endOfDayChannels, endOfDayConcerns, endOfDayFunds, endOfDayOrientations, endOfDayPartyKinds, endOfDayPaymentMethods, endOfDayPaymentTerms, endOfDaySources,
  type EndOfDayConcern, type EndOfDayOrientation,
} from "./end-of-day-contracts";

export type EndOfDayLayout = "table" | "paper";
export type EndOfDayTimeMode = "day" | "range";
/** Các tiêu chí dạng danh sách (nhiều lựa chọn); mỗi khóa là một tham số của API (xem LIST_PARAMS). */
export type ListKey = "zoneIds" | "customerIds" | "receivedBy" | "createdBy" | "paymentMethods" | "channels" | "paymentTerms" | "funds" | "sources" | "typeIds" | "partyKinds" | "productIds" | "categoryIds";

/** Điều kiện của báo cáo Cuối ngày. `startTime`/`endTime` rỗng = từ đầu/đến hết ngày; danh sách rỗng = tất cả. */
export type EndOfDayFilters = Readonly<{
  concern: EndOfDayConcern; layout: EndOfDayLayout; orientation: EndOfDayOrientation;
  timeMode: EndOfDayTimeMode; day: string; startTime: string; endTime: string; range: TimeRangeValue;
} & Record<ListKey, readonly string[]>>;

export const CONCERN_OPTIONS: readonly (readonly [EndOfDayConcern, string])[] = [["sales", "Bán hàng"], ["money", "Thu chi"], ["goods", "Hàng hóa"], ["summary", "Tổng hợp"]];
export const ORIENTATION_OPTIONS: readonly (readonly [EndOfDayOrientation, string])[] = [["portrait", "Dọc"], ["landscape", "Ngang"]];
export const PAYMENT_METHOD_LABEL: Record<string, string> = { Cash: "Tiền mặt", VietQrInvoice: "Chuyển khoản VietQR", OtherTransfer: "Chuyển khoản khác", EWallet: "Ví điện tử" };
export const CHANNEL_LABEL: Record<string, string> = { App: "App", Phone: "Điện thoại", AtPort: "Tại cảng" };
export const PAYMENT_TERM_LABEL: Record<string, string> = { PayNow: "Trả ngay", PayLater: "Công nợ" };
export const FUND_LABEL: Record<string, string> = { Cash: "Tiền mặt", Bank: "Ngân hàng", EWallet: "Ví điện tử" };
export const SOURCE_LABEL: Record<string, string> = {
  CustomerPayment: "Thu tiền khách", CustomerPaidBack: "Hoàn tiền khách", SupplierPayment: "Chi trả nhà cung cấp", SupplierPaidBack: "Nhà cung cấp hoàn tiền", CashVoucher: "Phiếu thu/chi",
};
export const PARTY_KIND_LABEL: Record<string, string> = { Customer: "Khách hàng", Supplier: "Nhà cung cấp", Employee: "Nhân viên", Other: "Khác" };
export const CONCERN_TITLE: Record<EndOfDayConcern, string> = { sales: "bán hàng", money: "thu chi", goods: "hàng hóa", summary: "tổng hợp" };

/** Tham số danh sách: khóa trong bộ lọc → tên trên URL của trang và danh sách giá trị cho phép (không có = GUID), cùng mối quan tâm dùng nó. */
export const LIST_PARAMS: Record<ListKey, Readonly<{ url: string; allowed?: readonly string[]; concerns: readonly EndOfDayConcern[] }>> = {
  zoneIds: { url: "zones", concerns: ["sales", "goods", "summary"] },
  customerIds: { url: "customers", concerns: ["sales", "goods"] },
  receivedBy: { url: "receivedBy", concerns: ["sales"] },
  createdBy: { url: "createdBy", concerns: ["sales", "money", "goods", "summary"] },
  paymentMethods: { url: "pay", allowed: endOfDayPaymentMethods, concerns: ["sales"] },
  channels: { url: "channels", allowed: endOfDayChannels, concerns: ["sales"] },
  paymentTerms: { url: "terms", allowed: endOfDayPaymentTerms, concerns: ["sales"] },
  funds: { url: "funds", allowed: endOfDayFunds, concerns: ["money"] },
  sources: { url: "sources", allowed: endOfDaySources, concerns: ["money"] },
  typeIds: { url: "types", concerns: ["money"] },
  partyKinds: { url: "partyKinds", allowed: endOfDayPartyKinds, concerns: ["money"] },
  productIds: { url: "products", concerns: ["goods"] },
  categoryIds: { url: "categories", concerns: ["goods"] },
};
const LIST_KEYS = Object.keys(LIST_PARAMS) as ListKey[];
export const MAX_LIST = 50;
const MAX_SPAN_DAYS = 366;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

function listsOf(valueOf: (key: ListKey) => readonly string[]): Record<ListKey, readonly string[]> {
  const lists = {} as Record<ListKey, readonly string[]>;
  for (const key of LIST_KEYS) lists[key] = valueOf(key);
  return lists;
}
/** Ngày có thật (không chấp nhận 2026-13-40 hay 2026-02-30 bị JavaScript cuốn sang tháng sau). */
const validDate = (value: string | null): value is string => !!value && ISO_DATE.test(value) && toQueryDate(fromQueryDate(value)) === value;
const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T => allowed.includes(value as T) ? value as T : fallback;

/** Điều kiện mặc định: bán hàng của hôm nay, cả ngày, dạng bảng, in dọc. */
export function defaultFilters(today: string): EndOfDayFilters {
  return { concern: "sales", layout: "table", orientation: "portrait", timeMode: "day", day: today, startTime: "", endTime: "", range: presetValue("today"), ...listsOf(() => []) };
}

/** Đọc điều kiện từ query string của trang; giá trị lạ (từ URL gõ tay) bị bỏ và dùng mặc định. */
export function readFilters(params: URLSearchParams, today: string): EndOfDayFilters {
  const base = defaultFilters(today), day = params.get("day"), from = params.get("from"), to = params.get("to");
  const clock = (name: string) => { const value = params.get(name); return value && CLOCK.test(value) ? value : ""; };
  const lists = listsOf((key) => {
    const { url, allowed } = LIST_PARAMS[key];
    const values = (params.get(url) ?? "").split(",").filter((value) => allowed ? allowed.includes(value) : GUID.test(value));
    return [...new Set(values)].slice(0, MAX_LIST);
  });
  const range = validDate(from) && validDate(to) && from <= to ? customRange(from, to) : base.range;
  return {
    ...base, ...lists, range, concern: pick(params.get("concern"), endOfDayConcerns, base.concern), layout: pick(params.get("view"), ["table", "paper"] as const, base.layout),
    orientation: pick(params.get("orient"), endOfDayOrientations, base.orientation), timeMode: pick(params.get("mode"), ["day", "range"] as const, base.timeMode),
    day: validDate(day) ? day : base.day, startTime: clock("ft"), endTime: clock("tt"),
  };
}

/** Ghi điều kiện lên query string (chỉ giá trị khác mặc định) để F5 hoặc gửi link vẫn giữ báo cáo đang xem. */
export function writeFilters(filters: EndOfDayFilters, today: string): URLSearchParams {
  const base = defaultFilters(today), params = new URLSearchParams();
  const set = (name: string, value: string, fallback = "") => { if (value && value !== fallback) params.set(name, value); };
  set("concern", filters.concern, base.concern); set("view", filters.layout, base.layout); set("orient", filters.orientation, base.orientation); set("mode", filters.timeMode, base.timeMode);
  if (filters.timeMode === "day") { set("day", filters.day, base.day); set("ft", filters.startTime); set("tt", filters.endTime); }
  else { set("from", filters.range.from); set("to", filters.range.to); }
  for (const key of LIST_KEYS) set(LIST_PARAMS[key].url, filters[key].join(","));
  return params;
}

/** Khoảng thời gian gửi API: giờ Việt Nam `yyyy-MM-ddTHH:mm`, gồm cả hai đầu. */
export function timeWindow(filters: EndOfDayFilters): { from: string; to: string } {
  if (filters.timeMode === "day") return { from: `${filters.day}T${filters.startTime || "00:00"}`, to: `${filters.day}T${filters.endTime || "23:59"}` };
  return { from: `${filters.range.from}T00:00`, to: `${filters.range.to}T23:59` };
}

/** Lỗi nhập cần sửa trước khi xem báo cáo (null = hợp lệ). `today` chặn ngày tương lai. */
export function filterProblem(filters: EndOfDayFilters, today: string): string | null {
  if (filters.timeMode === "day") {
    if (!filters.day) return "Hãy chọn ngày cần xem.";
    if (filters.day > today) return "Chưa thể xem báo cáo của ngày trong tương lai.";
    if ((filters.startTime || "00:00") > (filters.endTime || "23:59")) return "Giờ bắt đầu phải trước hoặc bằng giờ kết thúc.";
    return null;
  }
  const { from, to } = filters.range;
  if (!from || !to) return "Hãy chọn khoảng ngày cần xem (không dùng Toàn thời gian).";
  if (from > to) return "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
  if (to > today) return "Chưa thể xem báo cáo của ngày trong tương lai.";
  const span = (fromQueryDate(to).getTime() - fromQueryDate(from).getTime()) / 86_400_000 + 1;
  return span > MAX_SPAN_DAYS ? "Khoảng ngày tối đa là 366 ngày." : null;
}

/** Query gửi BFF: danh sách nối bằng dấu phẩy, chỉ các tiêu chí thuộc mối quan tâm đang xem (BFF tách lại và gửi lặp tham số cho backend). */
export function toQuery(filters: EndOfDayFilters): Query {
  const query: Query = { concern: filters.concern, ...timeWindow(filters) };
  for (const key of LIST_KEYS) if (LIST_PARAMS[key].concerns.includes(filters.concern) && filters[key].length) query[key] = filters[key].join(",");
  return query;
}

/** Danh sách có `id` trong `list` thì bớt đi, chưa có thì thêm vào cuối (tối đa MAX_LIST). */
export const toggleId = (list: readonly string[], id: string): string[] => list.includes(id) ? list.filter((value) => value !== id) : [...list, id].slice(0, MAX_LIST);
